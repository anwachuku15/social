const functions = require('firebase-functions');
const app = require('express')();
const fbAuth = require('./util/fbAuth');
const { db } = require('./util/admin');

// TODO: Add Gmail, Facebook, Twitter auth/sign-in methods

const cors = require('cors');
app.use(cors());

const { getPosts, 
        createPost,
        getPost ,
        commentOnPost,
        likePost,
        unlikePost,
        deletePost
} = require('./handlers/posts');

const { signup, 
        login, 
        uploadImage,
        addUserDetails,
        getAuthenticatedUser,
        getUserDetails,
        markAllNotificationsRead,
        followUser,
        unfollowUser
} = require('./handlers/users');



// POSTS ROUTES
app.get('/posts', getPosts)
app.post('/post', fbAuth, createPost)
app.get('/post/:postId', getPost);
app.delete('/post/:postId', fbAuth, deletePost)
app.get('/post/:postId/like', fbAuth, likePost)
app.get('/post/:postId/unlike', fbAuth, unlikePost)
app.post('/post/:postId/comment', fbAuth, commentOnPost)
// TODO: like comment
// TODO: unlike comment
// TODO: comment on comment i.e. Twitter


// USERS ROUTES
app.post('/signup', signup)
app.post('/login', login)
app.post('/user/image', fbAuth, uploadImage)
app.post('/user', fbAuth, addUserDetails)
app.get('/user', fbAuth, getAuthenticatedUser)
// Not front end routes
app.get('/user/:handle', getUserDetails);
app.post('/notifications', fbAuth, markAllNotificationsRead);
app.get('/follow/:handle', fbAuth, followUser);
app.get('/unfollow/:handle', fbAuth, unfollowUser);

// Best practice for API routing - https://baseurl.com/api/{enter_here}
exports.api = functions.https.onRequest(app);


// DATABASE TRIGGERS - must deploy after creating triggers
exports.createNotificationOnLike = functions
  .firestore
  .document('likes/{id}')
  .onCreate((snapshot) => {
    return db.doc(`/posts/${snapshot.data().postId}`)
      .get()
      .then(doc => {
        if(doc.exists && doc.data().userHandle !== snapshot.data().userHandle){
          return db.doc(`/notifications/${snapshot.id}`).set({
            createdAt: new Date().toISOString(),
            recipient: doc.data().userHandle,
            sender: snapshot.data().userHandle,
            type: 'like',
            read: false,
            postId: doc.id
          });
        }
      })
      .catch(err => {
        console.error(err);
      });
  });

exports.deleteNotificationOnUnLike = functions
  .firestore
  .document('likes/{id}')
  .onDelete((snapshot) => {
    return db.doc(`/notifications/${snapshot.id}`)
      .delete()
      .catch(err => {
        console.error(err);
      })
  })

exports.createNotificationOnComment = functions
  .firestore
  .document('comments/{id}')
  .onCreate((snapshot) => {
    return db.doc(`/posts/${snapshot.data().postId}`)
      .get()
      .then(doc => {
        if(doc.exists && doc.data().userHandle !== snapshot.data().userHandle){
          return db.doc(`/notifications/${snapshot.id}`).set({
            createdAt: new Date().toISOString(),
            recipient: doc.data().userHandle,
            sender: snapshot.data().userHandle,
            type: 'comment',
            read: false,
            postId: doc.id
          });
        }
      })
      .catch(err => {
        console.error(err);
      });
  });

// TODO: FOLLOW NOTIFICATIONS

// exports.createNotificationOnFollow = functions
//   .firestore
//   .document('follows/{id}')
//   .onCreate((snapshot) => {
//     return 
//   })



// DB Trigger: when user changes profile pic, change all documents that include user's profile pic
exports.onUserImageChange = functions
  .firestore
  .document('/users/{userId}')
  .onUpdate((change) => {
    console.log(change.before.data());
    console.log(change.after.data());
    // TODO: consider updating userHandle if necessary
    if(change.before.data().imageUrl !== change.after.data().imageUrl){
      console.log('image has changed');
      const batch = db.batch();
      return db
        .collection('posts')
        .where('userHandle', '==', change.before.data().handle)
        .get()
        .then((data) => {
          data.forEach(doc => {
            const post = db.doc(`/posts/${doc.id}`);
            batch.update(post, { userImage: change.after.data().imageUrl });
          });
          return db
            .collection('comments')
            .where('userHandle', '==', change.before.data().handle)
            .get()
        })
        .then((data) => {
          data.forEach(doc => {
            const comment = db.doc(`/comments/${doc.id}`);
            batch.update(comment, { userImage: change.after.data().imageUrl });
          })
          return batch.commit();
        })
        .catch(err => console.error(err));
    } else return true;
  });

  // when a post is deleted, delete its comments, likes, and notifications
  exports.onPostDelete = functions
    .firestore
    .document('posts/{postId}')
    // context has the url params
    .onDelete((snapshot, context) => {
      const postId = context.params.postId;
      const batch = db.batch();
      return db
        .collection('comments')
        .where('postId', '==', postId)
        .get()
        .then(data => {
          data.forEach(doc => {
            batch.delete(db.doc(`/comments/${doc.id}`));
          })
          return db
            .collection('likes')
            .where('postId', '==', postId)
            .get();
        })
        .then(data => {
          data.forEach(doc => {
            batch.delete(db.doc(`/likes/${doc.id}`));
          })
          return db
            .collection('notifications')
            .where('postId', '==', postId)
            .get();
        })
        .then(data => {
          data.forEach(doc => {
            batch.delete(db.doc(`/notifications/${doc.id}`));
          })
          return batch.commit();
        })
        .catch(err => console.error(err));
    })




// REST API
// https://firestore.googleapis.com/v1/projects/social-3be8a/databases/(default)/documents
