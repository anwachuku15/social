// Firebase charges you based on number of reads, so BEST PRACTICE: MINIMIZE READS

let db = {
  users: [
    {
      userId: 'dh23ggj5h32g543j5gf43',
      email: 'user@gmail.com',
      handle: 'user',
      createdAt: '2019-12-14T10:59:52.798Z',
      imageUrl: 'image/dsasdfasdfasd/asdfasdf',
      bio: 'Hello, my name is user, nice to meet you',
      website: 'https://user.com',
      location: 'Maryland, US'
    }
  ],

  posts: [
    {
      userHandle: 'user',
      body: 'this is the post body',
      createdAt: '2019-03-15T11:46:01.018Z',
      likeCount: 5,
      commentCount: 2
    }
  ],

  comments: [
    {
      userHandle: 'user',
      postId: 'kdjsfgdkusuufhgkdusfky',
      body: 'great post!',
      createdAt: '2019-12-15T10:59:52.798Z'
    }
  ],

  notifications: [
    {
      recipient: 'user',
      sender: 'john',
      read: 'true | false',
      postId: 'asdfjalsdfasdf',
      type: 'like | comment',
      createdAt: '2019-12-15T10:59:52.798Z'
    }
  ],

  follows: [
    {
      dateFollowed: '2020-01-21T18:20:40.954Z',
      followed: 'user',
      follower: 'user2'
    }
  ]

};

const userDetails = {
  // Redux data: User information held in Redux State to populate profile
  credentials: {
    userId: 'N43KJ5H43KJHREW4J5H3JWMERHB',
    email: 'user@gmail.com',
    handle: 'user',
    createdAt: '2019-12-14T10:59:52.798Z',
    imageUrl: 'image/dsasdfasdfasd/asdfasdf',
    bio: 'Hello, my name is user, nice to meet you',
    website: 'https://user.com',
    location: 'Maryland, US',
    following: 0,
    following: 0
  },
  likes: [
    {
      userHandle: 'user',
      screamId: 'hh705oWfWucVzGbHH2pa'
    },
    {
      userHandle: 'user',
      screamId: '3IOnFoQexRcofs5OhBXO'
    }
  ]
}


