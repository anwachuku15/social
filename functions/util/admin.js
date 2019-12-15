// Connect this App to firebase admin SDK

const admin = require('firebase-admin');
admin.initializeApp();
// Connect to firestore database
const db = admin.firestore();

module.exports = { admin, db }