const functions = require('firebase-functions');
const app = require('express')();
const fbAuth = require('./util/fbAuth');

const { getPosts, createPost } = require('./handlers/posts');

const { signup, 
        login, 
        uploadImage,
        addUserDetails,
        getAuthenticatedUser
} = require('./handlers/users');

// Protected routes include fbAuth

// POSTS ROUTES
app.get('/posts', getPosts)
app.post('/post', fbAuth, createPost)

// USERS ROUTES
app.post('/signup', signup)
app.post('/login', login)
app.post('/user/image', fbAuth, uploadImage)
app.post('/user', fbAuth, addUserDetails)
app.post('/user', fbAuth, getAuthenticatedUser);





// Best practices for having API - https://baseurl.com/api/{enter_here}
exports.api = functions.https.onRequest(app);

