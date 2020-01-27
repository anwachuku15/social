const { admin, db } = require('../util/admin');

const config = require('../util/config');

const firebase = require('firebase');
firebase.initializeApp(config)

const { validateSignUpData, validateLoginData, reduceUserDetails } = require('../util/validators');


// SIGNUP
exports.signup = (req, res) => {
	const newUser = {
		email: req.body.email,
		password: req.body.password,
		confirmPassword: req.body.confirmPassword,
		handle: req.body.handle,
	};

  // VALIDATION
  const { valid, errors } = validateSignUpData(newUser);
  if(!valid) return res.status(400).json(errors);

  const noImg = 'no-img.png'

	// USER AUTHENTICATION
	let token, userId
	db.doc(`/users/${newUser.handle}`)
		.get()
		.then(doc => {
			if(doc.exists) {
				return res.status(400).json({ handle: 'this is handle is already taken' })
			} else {
				return (
					firebase
						.auth()
						.createUserWithEmailAndPassword(newUser.email, newUser.password)
				)
			}
		})
		.then((data) => {
			userId = data.user.uid;
			return data.user.getIdToken();
		})
		.then((idToken => {
			token = idToken;
			const userCredentials = {
				handle: newUser.handle,
        email: newUser.email,
        following: 0,
        followers: 0,
        createdAt: new Date().toISOString(),
        imageUrl: `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${noImg}?alt=media`,
				userId
			};
			return db.doc(`/users/${newUser.handle}`).set(userCredentials);
		}))
		.then(() => {
			return res.status(201).json({ token });
		})
		.catch(err => {
			console.error(err);
			if(err.code === 'auth/email-already-in-use'){
				return res.status(400).json({ email: 'Email is already in use'})
			} else {
				return res.status(500).json({ general: 'Something went wrong. Please try again.' });
			}
		})
}

// LOGIN
exports.login = (req, res) => {
	const user = {
		email: req.body.email,
		password: req.body.password
  };
  
  // VALIDATION
  const { valid, errors } = validateLoginData(user);
  if(!valid) return res.status(400).json(errors);

  firebase
    .auth()
    .signInWithEmailAndPassword(user.email, user.password)
		.then(data => {
			return data.user.getIdToken();
		})
		.then(token => { 
			return res.json({token})
		})
		.catch(err => {
			console.error(err);
			if(err.code === 'auth/wrong-password'){
				return res.status(403).json({ general: 'Wrong email / password combination, please try again'})
			} else if(err.code === 'auth/invalid-email'){
        return res.status(403).json({ general: 'Please enter a valid email address'})
      } else return res.status(500).json({ general: 'Wrong credentials, please try again'});
		});
};
 
// ADD USER DETAILS
exports.addUserDetails = (req, res) => {
  let userDetails = reduceUserDetails(req.body);

  db.doc(`/users/${req.user.handle}`).update(userDetails)
    .then(() => {
      return res.json({ message: 'Details added succesfully'});
    })
    .catch(err => {
      console.error(err);
      return res.status(500).json({error: err.code})
    })
}

// GET SELECTED USER DETAILS
exports.getUserDetails = (req, res) => {
  let userData = {};
  db.doc(`/users/${req.params.handle}`)
    .get()
    .then(doc => {
      if(doc.exists){
        userData.user = doc.data();
        return db.collection('posts').where('userHandle', '==', req.params.handle)
          .orderBy('createdAt', 'desc')
          .get();
      } else {
        return res.status(404).json({ error: 'User not found' })
      }
    })
    .then(data => {
      userData.posts = [];
      data.forEach(doc => {
        userData.posts.push({
          body: doc.data().body,
          createdAt: doc.data().createdAt,
          userHandle: doc.data().userHandle,
          userImage: doc.data().userImage,
          likeCount: doc.data().likeCount,
          commentCount: doc.data().commentCount,
          postId: doc.id
        })
      })
      return res.json(userData)
    })
    .catch(err => {
      console.error(err);
      return res.status(500).json({ error: err.code })
    })
}

// FOLLOW SELECTED USER
exports.followUser = (req, res) => {
  let followData;
  /*TODO: Consider rewriting this code similar to likePosts (posts.js:118)...
  and compare runtimes*/
  
  db.collection(`/follows/`)
    .where('follower', '==', req.user.handle)
    .where('followed', '==', req.params.handle)
    .limit(1)
    .get()
    .then(data => {
      if(!data.empty){
        return res.status(400).json({ error: 'You already follow this user' });
      } else {
        return db.collection('follows').add({
          followed: req.params.handle,
          follower: req.user.handle,
          dateFollowed: new Date().toISOString()
        })
        .then(() => {
          let followerData;
          db.doc(`/users/${req.user.handle}`)
            .get()
            .then(doc => {
              followerData = doc.data();
              if(!followerData.following){
                followerData.following = 1
              } else {
                followerData.following++;
              }
              return doc.ref.update({following: followerData.following})
            })
        })
        .then(() => {
          let followedData;
          db.doc(`/users/${req.params.handle}`)
            .get()
            .then(doc => {
              followedData = doc.data();
              if(!followedData.followers){
                followedData.followers = 1
              } else {
                followedData.followers++;
              }
              return doc.ref.update({ followers: followedData.followers })
            })
        })
        .then(() => {
          return res.status(200).json({ message: 'Successfully followed '})
        })
      }
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({ error: err.code})
    })
}
// UNFOLLOW SELECTED USER
exports.unfollowUser = (req, res) => {
  let unfollowData;
  let userData;
  db.collection(`/follows/`)
    .where('follower', '==', req.user.handle)
    .where('followed', '==', req.params.handle)
    .limit(1)
    .get()
    .then(data => {
      if(data.empty){
        return res.status(400).json({ error: 'You don\'t follow this user' });
      } else {
        return db.doc(`/follows/${data.docs[0].id}`)
          .delete()
          .then(() => {
            let followerData;
            db.doc(`/users/${req.user.handle}`)
              .get()
              .then(doc => {
                followerData = doc.data();
                followerData.following--;
                return doc.ref.update({following: followerData.following})
              })
          })
          .then(() => {
            let unfollowedData;
            db.doc(`/users/${req.params.handle}`)
            .get()
            .then(doc => {
              unfollowData = doc.data();
              unfollowData.followers--;
              return doc.ref.update({followers: unfollowData.followers})
            })
          })
      }
    })
    .then(() => {
      return res.status(200).json({ message: 'Successfully unfollowed'})
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({ error: err.code})
    })
}
// GET OWN USER DETAILS 
exports.getAuthenticatedUser = (req, res) => {
  let userData = {};
  db.doc(`/users/${req.user.handle}`)
    .get()
    .then(doc => {
      if(doc.exists){
        userData.credentials = doc.data();
        return db.collection('likes').where('userHandle', '==', req.user.handle).get()

        // This returns who the logged-in User is following
        // return db.collection('follows').where('follower', '==', req.user.handle).get()
      }
    })
    .then(data => {
      userData.likes = [];
      data.forEach(doc => {
        userData.likes.push(doc.data());
      });
      return db.collection('notifications').where('recipient', '==', req.user.handle)
        .orderBy('createdAt', 'desc').limit(10).get();
    })
    .then(data => {
      userData.notifications = [];
      data.forEach(doc => {
        userData.notifications.push({
          recipient: doc.data().recipient,
          sender: doc.data().sender,
          read: doc.data().read,
          postId: doc.data().postId,
          type: doc.data().type,
          createdAt: doc.data().createdAt,
          notificationId: doc.id
        })
      })
      return res.json(userData)
    })
    .catch(err => {
      console.error(err);
      return res.status(500).json({ error: err.code})
    })
}

// UPLOAD USER PROFILE IMAGE
exports.uploadImage = (req, res) => {
  // https://github.com/mscdex/busboy

  const BusBoy = require('busboy');
  const path = require('path');
  const os = require('os');
  const fs = require('fs');

  const busboy = new BusBoy({ headers: req.headers});

  let imageFileName;
  let imageToBeUploaded = {};

  busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
    if (mimetype !== 'image/jpeg' && mimetype !== 'image/jpg' && mimetype !== 'image/png') {
      return res.status(400).json({ error: 'Wrong file type submitted' });
    }
    console.log(fieldname);
    console.log(filename);
    console.log(mimetype);
    
    // get image file type
    const imageExtension = filename.split('.')[filename.split('.').length - 1]
    imageFileName = `${Math.round(Math.random() * 100000000000)}.${imageExtension}`
    console.log(imageFileName)
    const filepath = path.join(os.tmpdir(), imageFileName);
    imageToBeUploaded = { filepath, mimetype };
    file.pipe(fs.createWriteStream(filepath));
  });
  busboy.on('finish', () => {
    admin
      .storage()
      .bucket()
      .upload(imageToBeUploaded.filepath, {
        resumable: false,
        metadata: {
          metadata: {
            contentType: imageToBeUploaded.mimetype
          }
        }
      })
      .then(() => {
        const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}?alt=media`;
        console.log(imageUrl);
        return db.doc(`/users/${req.user.handle}`).update({ imageUrl });
      })
      .then(() => {
        return res.json({ message: 'Image uploaded succesfully'});
      })
      .catch(err => {
        console.error(err);
        return res.status(500).json({error: err.code});
      });
  });
  busboy.end(req.rawBody);
}

// MARK ALL NOTIFICATIONS AS READ
exports.markAllNotificationsRead = (req, res) => {
  // Batch write - update multiple documents
  let batch = db.batch();
  // When user clicks on 'notifications' bell, an array of strings is entered into req.body
  req.body.forEach(notificationId => {
    const notification = db.doc(`/notifications/${notificationId}`);
    batch.update(notification, { read: true })
  });
  batch.commit()
    .then(() => {
      return res.json({ message: 'Notifications marked read'});
    })
    .catch(err => {
      console.error(err);
      return res.status(500).json({ error: err.code })
    })
} 

