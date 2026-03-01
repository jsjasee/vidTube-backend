import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video.models.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: toggle like on video

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid videoId.");
  }

  // if there's a like on the video already, just delete the document
  const likeToDelete = await Like.findOneAndDelete({
    video: new mongoose.Types.ObjectId(videoId),
    likedBy: new mongoose.Types.ObjectId(req.user._id),
  });

  if (likeToDelete) {
    return res
      .status(200)
      .json(new ApiResponse(200, likeToDelete, "Video unliked successfully."));
  }

  // else create a new like document
  const likeToVideo = await Like.create({
    video: new mongoose.Types.ObjectId(videoId),
    likedBy: new mongoose.Types.ObjectId(req.user._id),
  });

  const likeCreated = await Like.findById(likeToVideo._id);

  if (!likeCreated) {
    throw new ApiError(404, "Error liking video.");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, likeCreated, "Video liked successfully."));
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  //TODO: toggle like on comment
  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid commentId.");
  }

  // if there's a like on the comment already, just delete the document
  const likeToDelete = await Like.findOneAndDelete({
    comment: new mongoose.Types.ObjectId(commentId),
    likedBy: new mongoose.Types.ObjectId(req.user._id),
  });

  if (likeToDelete) {
    return res
      .status(200)
      .json(
        new ApiResponse(200, likeToDelete, "Comment unliked successfully."),
      );
  }

  // else create a new like document
  const likeToComment = await Like.create({
    comment: new mongoose.Types.ObjectId(commentId),
    likedBy: new mongoose.Types.ObjectId(req.user._id),
  });

  const likeCreated = await Like.findById(likeToComment._id);

  if (!likeCreated) {
    throw new ApiError(404, "Error liking comment.");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, likeCreated, "Comment liked successfully."));
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  //TODO: toggle like on tweet

  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid tweetId.");
  }

  // if there's a like on the tweet already, just delete the document
  const likeToDelete = await Like.findOneAndDelete({
    tweet: new mongoose.Types.ObjectId(tweetId),
    likedBy: new mongoose.Types.ObjectId(req.user._id),
  });

  if (likeToDelete) {
    return res
      .status(200)
      .json(new ApiResponse(200, likeToDelete, "Tweet unliked successfully."));
  }

  // else create a new like document
  const likeToTweet = await Like.create({
    tweet: new mongoose.Types.ObjectId(tweetId),
    likedBy: new mongoose.Types.ObjectId(req.user._id),
  });

  const likeCreated = await Like.findById(likeToTweet._id);

  if (!likeCreated) {
    throw new ApiError(404, "Error liking tweet.");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, likeCreated, "Tweet liked successfully."));
});

const getLikedVideos = asyncHandler(async (req, res) => {
  //TODO: get all liked videos

  const likedVideos = await Like.aggregate([
    {
      $match: {
        likedBy: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "videosLiked",
      },
    },
    {
      $unwind: "$videosLiked",
    },
    {
      $replaceRoot: {
        newRoot: "$videosLiked",
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(200, likedVideos, "Liked videos fetched successfully."),
    );
});

export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos };
