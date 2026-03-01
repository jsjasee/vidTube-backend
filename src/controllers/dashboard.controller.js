import mongoose from "mongoose";
import { Video } from "../models/video.models.js";
import { Subscription } from "../models/subscriptions.models.js";
import { Comment } from "../models/comment.models.js";
import { Tweet } from "../models/tweet.models.js";
import { Like } from "../models/like.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getChannelStats = asyncHandler(async (req, res) => {
  // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.

  const totalViews = await Video.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $group: {
        _id: null,
        totalViews: { $sum: "$views" },
      },
    },
  ]);

  const totalVideos = await Video.countDocuments({
    owner: new mongoose.Types.ObjectId(req.user._id),
  });

  const totalSubscribers = await Subscription.countDocuments({
    channel: new mongoose.Types.ObjectId(req.user._id),
  });

  const totalVideoLikes = await Video.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "video",
        as: "videoLikes",
      },
    },
    {
      $count: "totalVideoLikes",
    },
  ]);

  const totalCommentsLikes = await Comment.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "comment",
        as: "commentLikes",
      },
    },
    {
      $count: "totalCommentsLikes",
    },
  ]);

  const totalTweetLikes = await Tweet.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "tweet",
        as: "tweetLikes",
      },
    },
    {
      $count: "totalTweetLikes",
    },
  ]);

  const result = {
    totalViews: totalViews?.totalViews || 0,
    totalVideos,
    totalSubscribers,
    totalVideoLikes: totalVideoLikes?.[0]?.totalVideoLikes || 0,
    totalCommentsLikes: totalCommentsLikes?.[0]?.totalCommentsLikes || 0,
    totalTweetLikes: totalTweetLikes?.[0]?.totalTweetLikes || 0,
  };

  return res
    .status(200)
    .json(new ApiResponse(200, result, "Stats fetched successfully."));
});

const getChannelVideos = asyncHandler(async (req, res) => {
  // TODO: Get all the videos uploaded by the channel
  const videos = await Video.find({
    owner: new mongoose.Types.ObjectId(req.user._id),
  });

  return res
    .status(200)
    .json(new ApiResponse(200, videos, "Videos fetched successfully."));
});

export { getChannelStats, getChannelVideos };
