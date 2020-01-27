const { db } = require('../util/admin')

// fetch all posts from all users
exports.getPosts = (req, res) => {
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
}


exports.createPost = (req, res) => {
	if (req.body.body.trim() === '') {
		return res.status(400).json({ body: 'Body must not be empty'})
	}

	const newPost = {
		body: req.body.body,
		// userHandle/userImage passed through MIDDLEWARE
		userHandle: req.user.handle,
		userImage: req.user.imageUrl,
		createdAt: new Date().toISOString(),
		likeCount: 0,
		commentCount: 0
	};

	// Add the post to posts collection then return it
	db.collection('posts')
		.add(newPost)
		.then(doc => {
			const resPost = newPost;
			resPost.postId = doc.id;
			res.json(resPost);
		})
		.catch(err => {
			res.status(500).json({ error: 'something went wrong'});
			console.error(err);
		})

}

// fetch single post and its comments/likes
exports.getPost = (req, res) => {
	let postData = {};
	db.doc(`/posts/${req.params.postId}`).get()
		.then(doc => {
			if(!doc.exists){
				return res.status(404).json({ error: 'Post not found'})
			}
			postData = doc.data();
			postData.postId = doc.id;
			// return all comments under this post
			return db
							.collection('comments')
							.orderBy('createdAt', 'desc')
							.where('postId', '==', req.params.postId)
							.get();
		})
		.then(data => {
			postData.comments = [];
			data.forEach(doc => {
				postData.comments.push(doc.data());
			});
			return res.json(postData)
		})
		.catch(err => {
			console.error(err);
			res.status(500).json({ error: err.code })
		})
}

exports.commentOnPost = (req, res) => {
	// Client-side validation could just disable submit button if empty
	if(req.body.body.trim() === '') return res.status(400).json({ comment: 'Must not be empty'});

	const newComment = {
		body: req.body.body,
		createdAt: new Date().toISOString(),
		postId: req.params.postId,
		userHandle: req.user.handle,
		userImage: req.user.imageUrl
	}

	let postData;
	
	db.doc(`/posts/${req.params.postId}`)
		.get()
		.then(doc => {
			if(!doc.exists){
				return res.status(404).json({ error: 'Post does not exist' });
			} else {
				postData = doc.data();
				return doc.ref.update({ commentCount: postData.commentCount + 1 }); 
			}
		})
		.then(() => {
			return db.collection('comments').add(newComment);
		})
		.then(() => {
			res.json(newComment);
		})
		.catch(err => {
			console.log(err);
			res.status(500).json({ error: 'Something went wrong' });
		})
}

exports.likePost = (req, res) => {
	//  Check if post exists and if you've already liked it
	const likeDocument = db
		.collection('likes')
		.where('userHandle', '==', req.user.handle)
		.where('postId', '==', req.params.postId)
		.limit(1);
	const postDocument = db.doc(`/posts/${req.params.postId}`);

	let postData;

	// fetch the Post
	postDocument.get()
		.then(doc => {
			if(doc.exists){
				postData = doc.data();
				postData.postId = doc.id;
				return likeDocument.get();
			} else {
				return res.status(404).json({ error: 'Post does not exist' });
			}
		})
		.then(data => {
			if(data.empty){
				// add like to likes collection and connect it to that post
				return db.collection('likes').add({
					postId: req.params.postId,
					userHandle: req.user.handle,
					createdAt: new Date().toISOString(),
					userImage: req.user.imageUrl
				})
				.then(() => {
					// add a like then update postDocument's likeCount
					postData.likeCount++;
					return postDocument.update({ likeCount: postData.likeCount});
				})
				.then(() => {
					return res.json(postData);
				})
			} else {
				// Disable like button
				return res.status(400).json({ error: 'Post already liked' });
			}
		})
		.catch(err => {
			console.error(err)
			res.status(500).json({ error: err.code })
		});				
};

exports.unlikePost = (req, res) => {
		//  Check if post exists and if you've already liked it
	const likeDocument = db
		.collection('likes')
		.where('userHandle', '==', req.user.handle)
		.where('postId', '==', req.params.postId)
		.limit(1);
	const postDocument = db.doc(`/posts/${req.params.postId}`);

	let postData;

	// fetch the Post
	postDocument
		.get()
		.then(doc => {
			if(doc.exists){
				postData = doc.data();
				postData.postId = doc.id;
				// Return user's like on the Post... (133)
				return likeDocument.get();
			} else {
				return res.status(404).json({ error: 'Post does not exist' });
			}
		})
		.then(data => {
			// data returned: if empty, then user hasn't liked the post yet
			if(data.empty){
				return res.status(400).json({ error: 'Post not liked' });
			} else {
				// path to like document
				return db.doc(`/likes/${data.docs[0].id}`)
					.delete()
					.then(() => {
						postData.likeCount--;
						return postDocument.update({ likeCount: postData.likeCount });
					})
					.then(() => {
						res.json(postData);
					})
			}	
		})
		.catch(err => {
			console.error(err)
			res.status(500).json({ error: err.code })
		});		
}

exports.deletePost = (req, res) => {
	const document = db.doc(`/posts/${req.params.postId}`);
	document
		.get()
		.then(doc => {
			if(!doc.exists){
				return res.status(404).json({ error: 'Post not found'})
			}
			if(doc.data().userHandle !== req.user.handle){
				return res.status(403).json({ error: 'Unauthorized'});
			} else {
				return document.delete();
			}
		})
		.then(() => {
			res.json({ message: 'Post deleted successfully' });
		})
		.catch(err => {
			console.error(err);
			return res.status(500).json({ error: err.code })
		})
}