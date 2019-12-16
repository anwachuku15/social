const functions = require('firebase-functions');
const app = require('express')();
const fbAuth = require('./util/fbAuth');
const { db } = require('./util/admin');

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
        getAuthenticatedUser
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
// TODO: comment on comment, etc


// USERS ROUTES
app.post('/signup', signup)
app.post('/login', login)
app.post('/user/image', fbAuth, uploadImage)
app.post('/user', fbAuth, addUserDetails)
app.get('/user', fbAuth, getAuthenticatedUser)


// Best practices for having API - https://baseurl.com/api/{enter_here}
exports.api = functions.https.onRequest(app);


// DATABASE TRIGGERS - must deploy after creating triggers

// Listen for creation of like document
exports.createNotificationOnLike = functions.firestore.document('likes/{id}')
  // Snapshot of the new like document (sender's snapshot)
  .onCreate((snapshot) => {
    db.doc(`/posts/${snapshot.data().postId}`)
      .get()
      .then(doc => {
        if(doc.exists){
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
      .then(() => {
        return;
      })
      .catch(err => {
        console.error(err);
        return;
      });
  });

// Listen for the deletion of a like document
exports.deleteNotificationOnUnLike = functions.firestore.document('likes/{id}')
  .onDelete((snapshot) => {
    db.doc(`/notifications/${snapshot.id}`)
      .delete()
      .then(() => {
        return;
      })
      .catch(err => {
        console.error(err);
        return;
      })
  })

exports.createNotificationOnComment = functions.firestore.document('comments/{id}')
  .onCreate((snapshot) => {
    db.doc(`/posts/${snapshot.data().postId}`)
      .get()
      .then(doc => {
        if(doc.exists){
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
      .then(() => {
        return;
      })
      .catch(err => {
        console.error(err);
        return;
      });
  });

