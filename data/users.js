import { users, posts } from '../config/mongoCollections.js';
import { ObjectId, ReturnDocument } from 'mongodb';
import bcrypt from 'bcrypt';
import * as validate from './validation.js';

// import validation functions
// validateUser, handleId, etc.

// import api functions
// this is needed to attach lastfm user to user object
import * as lastfm from '../api/lastfm.js';


export async function checkUsernameAndEmail(username, email) {
  username = validate.validName(username);
  email = validate.validEmail(email);

  const userCollection = await users();
  const existingEmail = await userCollection.findOne({ email: email });
  if (existingEmail) throw "Email already exists";
  const existingUsername = await userCollection.findOne({ username: username });
  if (existingUsername) throw "Username already exists";
  return true;
}

// create user
export async function createUser(username, password, email) {
  username = validate.validName(username);
  password = validate.validPassword(password);
  email = validate.validEmail(email);

  const userCollection = await users();

  // check if username or email already exists
  await checkUsernameAndEmail(username, email);

  //encrypt password
  const hash = await bcrypt.hash(password, 4); //remember to change to back to 16 or 12 for all bcrypts

  const pfp = 'https://source.unsplash.com/1600x900/?' + username;

  const newUser = {
    username: username,
    password: hash,
    // * Should I make these default to null in function def instead? also should it be empty string or null 
    email : email,
    pfp : pfp,
    lastfm: null,
    followers: [],
    following: [],
    notifications: [],
    likedPosts: [],
    createdPosts: [],
    createdAt: new Date(),
    // can be useful to have updatedAt to limit how often user can update their profile
    updatedAt: new Date()
  };
  const insertInfo = await userCollection.insertOne(newUser);
  if (!insertInfo.acknowledged || !insertInfo.insertedId) throw "Could not add user";  
  const newId = insertInfo.insertedId.toString();
  const user = await getUserById(newId);
  if (!user) throw "User not found";
  return user;
}

// get user by id
export async function getUserById(id) {
  id = validate.validId(id);
  const userCollection = await users();
  const user = await userCollection.findOne({ _id: new ObjectId(id) });
  if (!user) throw "User not found";
  user._id = user._id.toString();
  return user;
}

// get user by username
export async function getUserByUsername(username) {
  username = validate.validName(username);
  const userCollection = await users();
  const user = await userCollection.findOne({ username: username });
  if (!user) throw "User not found";
  user._id = user._id.toString();
  return user;  
}

// get user by email
export async function getUserByEmail(email) {
  email = validate.validEmail(email);
  const userCollection = await users();
  const user = await userCollection.findOne({ email: email });
  if (!user) throw "User not found";
  user._id = user._id.toString();
  return user;
}
// get user by lastfm

// get all users
export async function getAllUsers() {
  const userCollection = await users();
  const allUsers = await userCollection.find({}).toArray();
  if (!allUsers) throw "No users found";
  allUsers.forEach(user => user._id = user._id.toString());
  return allUsers;
}

// remove user by id
export async function removeUserById(id) {
  id = validate.validId(id);
  const userCollection = await users();
  const user = await getUserById(id);
  if (!user) throw `Could not find user with id of ${id}`;
  const deletionInfo = await userCollection.deleteOne({ _id: ObjectId(id) });
  if (!deletionInfo.acknowledged || deletionInfo.deletedCount === 0) throw `Could not delete user with id of ${id}`;
  return user;
}

// update user by id
export async function updateUserById(id, username, password, lastfmUsername) {

  id = validate.validId(id);
  username = validate.validEditedUsername(username);
  password = validate.validEditedPassword(password);
  lastfmUsername = validate.validFmString(lastfmUsername);

  const userCollection = await users();
  const user = await getUserById(id);
  if (!user) throw `Could not find user with id of ${id}`;
  const lastfmData = lastfmUsername ? await lastfm.getInfoByUser(lastfmUsername) : null;
  let hash = (password == null) ? null : await bcrypt.hash(password, 4);

  const updatedUser = {
    username: username || user.username,
    password: hash || user.password,
    email: user.email,
    pfp: 'https://source.unsplash.com/1600x900/?' + username || user.pfp,
    lastfm: lastfmData || user.lastfm,
    followers: user.followers,
    following: user.following,
    notifications: user.notifications,
    likedPosts: user.likedPosts,
    createdPosts: user.createdPosts,
    createdAt: user.createdAt,
    updatedAt: new Date()
  };

  // there might be a better way to do this
  const updateInfo = await userCollection.findOneAndReplace(
    { _id: new ObjectId(id) }, 
    updatedUser,
    { returnDocument: 'after' }
    );
  if (!updateInfo) throw `Error: Update failed! Could not update user with id of ${id}`;

  // need to update all the posts that the user has created
  // need to update all the posts that the user has liked
  // ? need to update all the posts that the user has commented on -- depending on how comments work
  // ? need to update followers / following maybe

  const postCollection = await posts();
  for (let i = 0; i < user.createdPosts.length; i++) {
    const post = await postCollection.findOneAndUpdate(
      { _id: new ObjectId(user.createdPosts[i])}, 
      { $set: { username: updatedUser.username}},
      { returnDocument: 'after' }
    );
    if (!post) throw `Error: Update failed! Could not update post with id of ${user.createdPosts[i]}`;
  };

  return updateInfo;
}

export const loginUser = async (email, password) => {
  // validateUser(username, password);
  email = validate.validEmail(email);
  password = validate.validPassword(password); 

  const userCollection = await users();
  const user = await userCollection.findOne({ email: email });
  if (!user) throw "Incorrect Email or Password";
  const compare = await bcrypt.compare(password, user.password);
  if (!compare) throw "Incorrect Email or Password";
  user._id = user._id.toString();
  return user;
};

export const followUser = async (userId, profileId) => { //adds profile to user following list and adds user to profile's followers list
  // handleId(followerId); 
  // handleId(followingId);
  userId = validate.validId(userId);
  profileId = validate.validId(profileId);
  const userCollection = await users();
  const user = await getUserById(userId);
  if (!user) throw "User not found";
  const profile = await getUserById(profileId);
  if (!profile) throw "Profile not found";
  if(user.following.includes(profileId)) throw "Already following user 1";
  if(profile.followers.includes(userId)) throw "Already following user 2";
  
  let addToFollowing = await userCollection.findOneAndUpdate( //pushes profile to user following list
    { _id: new ObjectId(userId) },
    { $push: { following: profileId } },
    { returnDocument: 'after' }
  );

  if (!addToFollowing) throw "Error: Update failed! Could not follow user 1";

  let addToFollowers = await userCollection.findOneAndUpdate( //pushes user to profile followers list
    { _id: new ObjectId(profileId) },
    { $push: { followers: userId } },
    { returnDocument: 'after' }
  );
  if (!addToFollowers) throw "Error: Update failed! Could not follow user 2";

  return addToFollowers;

}

export const unfollowUser = async (userId, profileId) => { //removes profile form user following list and removes user form profile's followers list
  // handleId(followerId);
  // handleId(followingId);
  userId = validate.validId(userId);
  profileId = validate.validId(profileId);
  const userCollection = await users();
  const user = await getUserById(userId);
  if (!user) throw "User not found";
  const profile = await getUserById(profileId);
  if (!profile) throw "Profile not found";
  if (!user.following.includes(profileId)) throw "Not following user 1";
  if (!profile.followers.includes(userId)) throw "Not following user 2";

  let removeFromFollowing = await userCollection.findOneAndUpdate( //pulls profile from user following list
    { _id: new ObjectId(userId) },
    { $pull: { following: profileId } },
    { returnDocument: 'after' }
  );
  if (!removeFromFollowing) throw "Error: Update failed! Could not unfollow user 1";
    
  let removeFromFollowers = await userCollection.findOneAndUpdate( //pulls user from profile followers list
    { _id: new ObjectId(profileId) },
    { $pull: { followers: userId } },
    { returnDocument: 'after' }
  );
  if (!removeFromFollowers) throw "Error: Update failed! Could not unfollow user 2";

  return removeFromFollowers;

}

export const addNotification = async (profileId, notification) => {
  // handleId(userId);
  profileId = validate.validId(profileId);
  notification = validate.validString(notification);
  const userCollection = await users();

  let newNotification = {
    _id: new ObjectId().toString(),
    notification: notification,
    dateCreated: new Date()
  }
  
  const insertNotification = await userCollection.findOneAndUpdate(
    { _id: new ObjectId(profileId) },
    { $push: { notifications: newNotification } },
    { returnDocument: 'after' }
  );
  if (!insertNotification) throw "Error: Update failed! Could not add notification";
  return insertNotification;
}

export const removeNotification = async (userId, notificationId) => { //idk if this works
  // handleId(userId);
  // handleId(notificationId);
  userId = validate.validId(userId);
  notificationId = validate.validId(notificationId);
  const userCollection = await users();
  const removeNotification = await userCollection.findOneAndUpdate(
    { _id: new ObjectId(userId) },
    { $pull: { notifications: {_id : notificationId}} },
    { returnDocument: 'after' }
  );
  if (!removeNotification) throw "Error: Update failed! Could not remove notification";
  return removeNotification;
}