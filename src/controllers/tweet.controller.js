import mongoose, { isValidObjectId, mongo } from "mongoose";
import { Tweet } from "../models/tweet.models.js";
import { User } from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createTweet = asyncHandler(async (req, res) => {
  //TODO: create tweet
  const { content } = req.body;

  if (!content) {
    throw new ApiError(400, "Content is required.");
  }

  const newTweet = await Tweet.create({
    owner: new mongoose.Types.ObjectId(req.user._id),
    content,
  });

  const tweetUploaded = await Tweet.findById(newTweet._id);

  if (!tweetUploaded) {
    throw new ApiError(404, "Error uploading tweet.");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, tweetUploaded, "Tweet created successfully."));
});

const getUserTweets = asyncHandler(async (req, res) => {
  // TODO: get user tweets
  const { userId } = req.params;

  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid userId.");
  }

  const tweetsByUser = await Tweet.find({
    owner: new mongoose.Types.ObjectId(userId),
  });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        tweetsByUser,
        "Tweets by user retrieved successfully.",
      ),
    );
});

const updateTweet = asyncHandler(async (req, res) => {
  //TODO: update tweet
  const { tweetId } = req.params;
  const { content } = req.body;

  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid tweetId.");
  }

  const updatedTweet = await Tweet.findByIdAndUpdate(
    tweetId,
    { content },
    { new: true },
  );

  if (!updatedTweet) {
    throw new ApiError(404, "Tweet not found.");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updatedTweet, "Tweet updated successfully."));
});

const deleteTweet = asyncHandler(async (req, res) => {
  //TODO: delete tweet
  const { tweetId } = req.params;

  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid tweetId.");
  }

  const tweetDeleted = await Tweet.findByIdAndDelete(tweetId);

  if (!tweetDeleted) {
    throw new ApiError(404, "Tweet not found.");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, tweetDeleted, "Tweet deleted successfully."));
});

export { createTweet, getUserTweets, updateTweet, deleteTweet };
