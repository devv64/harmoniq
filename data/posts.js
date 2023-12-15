import { posts } from '../config/mongoCollections.js';
import { ObjectId } from 'mongodb';
import * as validate from './validation.js';

// import validation functions
// validatePost, handleId, etc.

// import api functions
// this is needed to attach lastfm song/artist data to post object
import {searchTrackByName, searchArtistByName} from "../api/lastfm.js"


// create post
// how should we design this, would lastfmSong and lastfmArtist be params like this? seems fine to me
export async function createPost(body, userId, lastfmSong, lastfmArtist) {
  // validatePost(body, userId, lastfmSong, lastfmArtist);
//   console.log("*******************");
//   console.log(body);
  body = validate.validString(body);
  // userId = validate.validId(userId);

  // TODO: Need to figure out how this should work
  // lastfmSong = validate.validString(lastfmSong);
  // lastfmArtist = validate.validString(lastfmArtist);  

  const postCollection = await posts();

  // Need to decide how to handle picking a song/artist, this might be fine
  // why is it saying await is unnecessary here
  // TODO: probably some error handling needed here
  const lastfmSong_ = await searchTrackByName(lastfmSong, 1);
  const lastfmArtist_ = await searchArtistByName(lastfmArtist, 1);

  // ? Should we have tags on posts.. need to check the doc if this was required or extra
  const newPost = {
    // need to also give username, pfp, etc. to post
    userId,
    body,
    comments: [], // ? comment objects or ids to comment objects
    track: lastfmSong_ || null,
    artist: lastfmArtist_ || null,
    likes: [], 
    createdAt: new Date(),
    // updatedAt: new Date()
  };
  const insertInfo = await postCollection.insertOne(newPost);
  if (!insertInfo.acknowledged || !insertInfo.insertedId) throw "Could not add post";  
  const newId = insertInfo.insertedId.toString();
  const post = await getPostById(newId);
  return post;
}

// get post by id
export async function getPostById(id) {
  // handleId(id);
  const postCollection = await posts();
  const post = await postCollection.findOne({ _id: new ObjectId(id) });
  if (!post) throw "Post not found";
  post._id = post._id.toString();
  return post;
}

// get all posts
// ? do we even want this

// get all posts by user
export async function getPostsByUser(id) {
  // handleId(id);
  const postCollection = await posts();
  const userPosts = await postCollection.find({ userId: id }).toArray();
  if (!userPosts) throw "Post not found";
  userPosts.forEach(post => post._id = post._id.toString());
  return userPosts;
}

// get all posts by artist
// ? take in name or id
export async function getPostsByArtist(name) {
  // handleId(id);
  const postCollection = await posts();
  const lastfmArtist_ = await lastfm.searchArtistByName(name, 1);
  // only trying to find lastfmArtist_ object because idk what we're actually gonna be storing
  const artistPosts = await postCollection.find({ artist: lastfmArtist_ }).toArray();
  if (!artistPosts) throw "Post not found";
  artistPosts.forEach(post => post._id = post._id.toString());
  return artistPosts;
}

// get some posts
// this is for the feed, so we can get the most recent posts
export async function getSomePosts(n=25) {
  const postCollection = await posts();
  const _posts = await postCollection.find().sort({ createdAt: -1}).limit(n).toArray();
  if (!_posts || _posts.length === 0) throw "Posts not found";
  _posts.forEach(post => post._id = post._id.toString());
  return _posts;
}

// remove post by id
export async function removePostById(id) {
  // handleId(id);
  const postCollection = await posts();
  // ! should I just do findOneAndDelete instead
  const post = await getPostById(id);
  const deletionInfo = await postCollection.deleteOne({ _id: ObjectId(id) });
  if (!deletionInfo.acknowledged || deletionInfo.deletedCount === 0) throw `Could not delete post with id of ${id}`;
  return post;
}

// add like to post
export async function addLikeToPost(postId, userId) {
  // handleId(postId);
  // handleId(userId);
  const postCollection = await posts();
  const updateInfo = await postCollection.updateOne(
    { _id: ObjectId(postId) },
    { $addToSet: { likes: userId } }
  );
  if (!updateInfo.acknowledged || updateInfo.modifiedCount === 0) throw "Could not update post";
  return await getPostById(postId);
}

// remove like from post
export async function removeLikeFromPost(postId, userId) {
  // handleId(postId);
  // handleId(userId);
  const postCollection = await posts();
  const updateInfo = await postCollection.updateOne(
    { _id: ObjectId(postId) },
    // not sure if this works, from stackoverflow
    { $pull: { likes: userId } }
  );
  if (!updateInfo.acknowledged || updateInfo.modifiedCount === 0) throw "Could not update post";
  return await getPostById(postId);
}