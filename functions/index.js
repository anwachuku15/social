const functions = require('firebase-functions');
const app = require('express')();
const fbAuth = require('./util/fbAuth');

const { getPosts, 
        createPost,
        getPost ,
        commentOnPost,
        likePost,
        unlikePost
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
// TODO: delete post
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

