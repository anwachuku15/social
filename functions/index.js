const functions = require('firebase-functions');
const admin = require('firebase-admin');
const app = require('express')();
admin.initializeApp();

const firebaseConfig = {
  apiKey: "AIzaSyD-wiJ0MiZc1yTVa-07Y2owWQTfQsXf8n0",
  authDomain: "social-3be8a.firebaseapp.com",
  databaseURL: "https://social-3be8a.firebaseio.com",
  projectId: "social-3be8a",
  storageBucket: "social-3be8a.appspot.com",
  messagingSenderId: "90837447855",
  appId: "1:90837447855:web:ad36dae6562b6fa3a8d05a",
  measurementId: "G-2XEB4Q5QHP"
};


const firebase = require('firebase');
firebase.initializeApp(firebaseConfig);
// firebase.analytics();

const db = admin.firestore();

// GET DOCUMENTS
app.get('/posts', (req, res) => {
	db.collection('posts')
		.orderBy('createdAt', 'desc')
		.get()
		.then(data => {
			let posts = []
			data.forEach(doc => {
				posts.push({
					postId: doc.id,
					...doc.data()
				});
			});
			return res.json(posts);
		})
		.catch(err => console.error(err));
})

// CREATE DOCUMENTS
app.post('/post', (req, res) => {

	const newPost = {
		body: req.body.body,
		userHandle: req.body.userHandle,
		createdAt: new Date().toISOString()
	};

	db.collection('posts')
		.add(newPost)
		.then(doc => {
			res.json({ message: `document ${doc.id} created successfully!` });
		})
		.catch(err => {
			res.status(500).json({ error: 'something went wrong'});
			console.error(err);
		})
	
});


// SIGN-UP ROUTE
app.post('/signup', (req, res) => {
	const newUser = {
		email: req.body.email,
		password: req.body.password,
		confirmPassword: req.body.confirmPassword,
		handle: req.body.handle,
	};
	// TODO: validate data
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
				createdAt: new Date().toISOString(),
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
				return res.status(500).json({ error: err.code });
			}
		})
})

exports.api = functions.https.onRequest(app);