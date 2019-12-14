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

// GET DOCUMENTS ROUTE
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
					// body: doc.data().body,
					// userHandle: doc.data().userHandle,
					// createdAt: doc.data().createdAt
				});
			});
			return res.json(posts);
		})
		.catch(err => console.error(err));
})

// CREATE DOCUMENTS ROUTE
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


// HELPER FUNCTIONS: is email empty
//                   is email valid
const isEmpty = (string) => {
	if(string.trim() === '') return true;
	else return false;
}

const isEmail = (email) => {
	const regEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
	if(email.match(regEx)) return true;
	else return false;
}



// SIGN-UP ROUTE
app.post('/signup', (req, res) => {
	const newUser = {
		email: req.body.email,
		password: req.body.password,
		confirmPassword: req.body.confirmPassword,
		handle: req.body.handle,
	};

	// VALIDATIONS
	let errors = {};

	if(isEmpty(newUser.email)) {
		errors.email = 'Must not be empty'
	} else if (!isEmail(newUser.email)){
		errors.email = 'Must be a valid email address'
	}

	if(isEmpty(newUser.password)) errors.password = 'Must not be empty';
	if(newUser.password !== newUser.confirmPassword) errors.confirmPassword = 'Passwords must match';
	if(isEmpty(newUser.handle)) errors.handle = 'Must not be empty';

	if(Object.keys(errors).length > 0) return res.status(400).json(errors)

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


// LOGIN ROUTE
app.post('/login', (req, res) => {
	const user = {
		email: req.body.email,
		password: req.body.password
	};

	let errors = {};

	if(isEmpty(user.email)) errors.email = 'Must not be empty';
	if(isEmpty(user.password)) errors.password = 'Must not be empty';

	if(Object.keys(errors).length > 0) return res.status(400).json(errors);

	firebase.auth().signInWithEmailAndPassword(user.email, user.password)
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
			} else return res.status(500).json({ error: err.code });
		});
})


// Best practices for having API - https://baseurl.com/api/{enter_here}
exports.api = functions.https.onRequest(app);

