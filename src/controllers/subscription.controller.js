import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.models.js";
import { Subscription } from "../models/subscriptions.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  // TODO: toggle subscription
  if (!isValidObjectId(channelId)) {
    throw new ApiError(400, "Invalid channelId.");
  }

  // cannot be subscribing to your own channel too
  const requestorId = (req?.user?._id).toString();
  console.log(channelId, requestorId);
  if (channelId === requestorId) {
    throw new ApiError(400, "Cannot subscribe to your own channel.");
  }

  // if there's the document already, user is subscribed, so i want to delete the document (note: subscriber AND channel only contains ONE objectId)
  const subscriptionToDelete = await Subscription.findOneAndDelete({
    subscriber: new mongoose.Types.ObjectId(req.user._id),
    channel: new mongoose.Types.ObjectId(channelId),
  });

  if (subscriptionToDelete) {
    return res
      .status(200)
      .json(new ApiResponse(200, subscriptionToDelete, "Unsubscribed."));
  }

  // else create a new document - we are subscribing.
  const subscriptionToCreate = await Subscription.create({
    subscriber: new mongoose.Types.ObjectId(req.user._id),
    channel: new mongoose.Types.ObjectId(channelId),
  });

  const subscriptionFetched = await Subscription.findById(
    subscriptionToCreate._id,
  ); // this is like a failsafe to make sure subscription is created.

  if (!subscriptionFetched) {
    throw new ApiError(500, "Failed to subscribe.");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, subscriptionFetched, "Subscribed."));
});

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  if (!isValidObjectId(channelId)) {
    throw new ApiError(400, "Invalid channelId.");
  }

  const channelSubscribers = await Subscription.aggregate([
    {
      $match: {
        channel: new mongoose.Types.ObjectId(channelId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "subscriber",
        foreignField: "_id",
        as: "subscribersOfThisChannel",
        pipeline: [
          {
            $project: {
              _id: 1,
              username: 1,
              avatar: 1,
              coverImage: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: "$subscribersOfThisChannel",
    },
    {
      $replaceRoot: {
        newRoot: "$subscribersOfThisChannel",
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        channelSubscribers,
        "List of subscribers fetched successfully.",
      ),
    );
});

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;

  if (!isValidObjectId(subscriberId)) {
    throw new ApiError(400, "Invalid subscriberId.");
  }

  const subscribedChannels = await Subscription.aggregate([
    {
      $match: {
        subscriber: new mongoose.Types.ObjectId(subscriberId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "channel",
        foreignField: "_id",
        as: "subscribedChannels",
        pipeline: [
          {
            $project: {
              _id: 1,
              username: 1,
              avatar: 1,
              coverImage: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: "$subscribedChannels",
    },
    {
      $replaceRoot: {
        newRoot: "$subscribedChannels",
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        subscribedChannels,
        "List of subscribed channels fetched successfully.",
      ),
    );
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
