import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.models.js";
import { User } from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  deleteFromCloudinary,
  uploadOnCloudinary,
} from "../utils/cloudinary.js";
import { getDurationSeconds } from "../utils/videoHandler.js";

const getAllVideos = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    query,
    sortBy = "createdAt",
    sortType = "-1",
    userId,
  } = req.query;
  //TODO: get all videos based on query, sort, pagination

  // get the owner of the videos
  const videoOwner = await User.findById(userId);

  // then have to use aggregation pipeline to get the videos that they watch

  // then have to sort the videos and decide how much to render etc.

  // then return the result
});

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  // TODO: get video, upload to cloudinary, create video
  const videoLocalPath = req.file?.videoFile?.[0].path; // the field to fill is "videoFile"
  const thumbnailLocalPath = req.file?.thumbnail?.[0].path; // the field to fill is "thumbnail"

  // get the duration of the video document
  try {
    const duration = await getDurationSeconds(videoLocalPath);
  } catch (error) {
    throw new ApiError(500, "Failed to get video duration: ", error);
  }

  // upload video on cloudinary
  let videoUploaded;
  try {
    videoUploaded = await uploadOnCloudinary(videoLocalPath);
  } catch (error) {
    console.log("Error uploading video: ", error);
    throw new ApiError(500, "Failed to upload video.");
  }

  // upload thumbnail on cloudinary
  let thumbnail;
  try {
    thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
  } catch (error) {
    console.log("Error uploading thumbnail: ", error);

    throw new ApiError(500, "Failed to upload thumbnail.");
  }

  // create the video document
  try {
    const video = await Video.create({
      videoFile: videoUploaded.url,
      thumbnail: thumbnail.url,
      title,
      description,
      duration,
      owner: mongoose.Types.ObjectId(req.user._id),
    });

    const createdVideo = await Video.findById(video._id);

    return res
      .status(201)
      .json(
        new ApiResponse(201, createdVideo, "Video published successfully."),
      );
  } catch (error) {
    console.log("Error creating video: ", error);

    if (videoUploaded) {
      await deleteFromCloudinary(videoUploaded.public_id); // public id is a unique property from cloudinary, kinda like mongoDB's _id
    }

    if (thumbnail) {
      await deleteFromCloudinary(thumbnail.public_id);
    }

    throw new ApiError(500, "Failed to create video.");
  }
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  // TODO: get video by id
  const foundVideo = await Video.findById(videoId);

  if (!foundVideo) {
    throw new ApiError(404, "Video not found.");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, foundVideo, "Video found successfully."));
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { title, description } = req.body;
  const coverImageLocalPath = req.file?.[0].path;

  // thumbnail is optional to update, but title and description must update.
  if (
    [title, description].some((field, index, array) => field?.trim() === "")
  ) {
    throw new ApiError(400, "Title and description required.");
  }

  const fieldsToUpdate = {
    title,
    description,
  };

  if (coverImageLocalPath) {
    const thumbnail = await uploadOnCloudinary(coverImageLocalPath);
    fieldsToUpdate.thumbnail = thumbnail.url;
  }

  //TODO: update video details like title, description, thumbnail

  const updatedVideo = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: fieldsToUpdate,
    }, // $set makes a partial update, leave other fields UNTOUCHED, change only these fields
    { new: true },
  );

  return res
    .status(200)
    .json(new ApiResponse(200, updatedVideo, "Video updated successfully."));
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: delete video
  const videoToDelete = await Video.findByIdAndDelete(videoId);

  if (!videoToDelete) {
    throw new ApiError(404, "Video not found.");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Video deleted successfully."));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  try {
    const video = await Video.findById(videoId);

    if (!video) {
      throw new ApiError(404, "Video not found.");
    }

    video.isPublished = !video.isPublished;
    await video.save({ validateBeforeSave: false });

    return res
      .status(200)
      .json(new ApiResponse(200, video, "Video status toggled successfully."));
  } catch (error) {
    console.log("Error toggling video status: ", error);
    throw new ApiError(500, "Failed to toggle video status.");
  }
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
