import { users } from '../config/mongoCollections.js';
import { ObjectId, ReturnDocument } from 'mongodb';
import bycrypt from 'bcrypt';
import * as validate from './validation.js';

// import validation functions
// validateUser, handleId, etc.

// import api functions
// this is needed to attach lastfm user to user object
import * as lastfm from '../api/lastfm.js';


// create user
export async function createUser(username, password, email, pfp, lastfmUsername) {
  // validateUser(username, password, email, pfp, lastfm);
  username = validate.validName(username);
  password = validate.validPassword(password);
  email = validate.validEmail(email);

  const userCollection = await users();

  // check if username or email already exists
  const existingUsername = await userCollection.findOne({ username: username });
  if (existingUsername) throw "Username already exists";
  const existingEmail = await userCollection.findOne({ email: email });
  if (existingEmail) throw "Email already exists";

  //encrypt password
  const hash = await bycrypt.hash(password, 16);

  // Do we really want this, its an object from lastfm with stats like playcount, artistcount, etc.
  // for an extra feature btw
  const lastfmData = await lastfm.getInfoByUser(lastfmUsername);
  const newUser = {
    username: username,
    password: hash,
    // * Should I make these default to null in function def instead? also should it be empty string or null 
    email : email || null,
    pfp : pfp || null,
    lastfm : lastfmData || null,
    followers: [],
    following: [],
    notifications: [],
    likedPosts: [],
    createdPosts: [],
    createdAt: new Date(),
    // can be useful to have updatedAt to limit how often user can update their profile
    // updatedAt: new Date()
  };
  const insertInfo = await userCollection.insertOne(newUser);
  if (!insertInfo.acknowledged || !insertInfo.insertedId) throw "Could not add user";  
  const newId = insertInfo.insertedId.toString();
  const user = await getUserById(newId);
  console.log(user);
  return user;
}

// get user by id
export async function getUserById(id) {
  // handleId(id);
  const userCollection = await users();
  const user = await userCollection.findOne({ _id: ObjectId(id) });
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
  // handleId(id);
  const userCollection = await users();
  const user = await getUserById(id);
  const deletionInfo = await userCollection.deleteOne({ _id: ObjectId(id) });
  if (!deletionInfo.acknowledged || deletionInfo.deletedCount === 0) throw `Could not delete user with id of ${id}`;
  return user;
}

// update user by id
export async function updateUserById(id, username, password, email, pfp, lastfmUsername) {
  // todo
  // handleId(id);
  
  // validateUser(updatedUser);
  const userCollection = await users();
  const user = await getUserById(id);
  const lastfmData = await lastfm.getInfoByUser(lastfmUsername);

  const updatedUser = {
    username: username || user.username,
    password: password || user.password,
    email: email || user.email,
    pfp: pfp || user.pfp,
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
    { _id: ObjectId(id) }, 
    updatedUser,
    { returnDocument: 'after' }
    );
  if (!updateInfo) throw `Error: Update failed! Could not update user with id of ${id}`;
  return updateInfo;
}

export const loginUser = async (email, password) => {
  // validateUser(username, password);
  email = validate.validEmail(email);
  password = validate.validPassword(password); 

  const userCollection = await users();
  const user = await userCollection.findOne({ email: email });
  if (!user) throw "User not found";
  const compare = await bycrypt.compare(password, user.password);
  if (!compare) throw "Incorrect password";
  user._id = user._id.toString();
  return user;
};