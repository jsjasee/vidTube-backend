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

  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid userId.");
  }

  try {
    // construct the match condition (only regex if there's a query and only set isPublished to true if it is NOT the owner looking up his own videos)

    let matchQuery = { owner: new mongoose.Types.ObjectId(userId) };

    if (query) {
      matchQuery["$or"] = [
        { title: { $regex: query, $options: "i" } },
        { description: { $regex: query, $options: "i" } },
      ];
    }

    const requesterId = req.user?._id?.toString(); // because req.user._id is a mongoose mongoDB OBJECT
    if (requesterId !== userId) {
      matchQuery.isPublished = true;
    }

    // construct the sort query based on the allow list and direction.
    const allowedSortList = [
      "title",
      "description",
      "createdAt",
      "views",
      "duration",
    ];

    if (!allowedSortList.includes(sortBy) || !["1", "-1"].includes(sortType)) {
      throw new ApiError(400, "Invalid sort field or sort type.");
    }

    let sortQuery = { [sortBy]: parseInt(sortType), _id: parseInt(sortType) };
    // [sortBy] is NOT an array!! it means use the variable sortBy.
    // lists CANNOT BE KEYS. without the [], it will literally sort by 'sortBy' and not the variable.

    // _id is a tie-breaker, unless there are multiple documents after the initial sort that causes the documents to be sorted the same way. _id is a unique value created based on when the documents are created, so will not have a tie.

    console.log({
      userId,
      requesterId,
      isOwner: requesterId === userId,
      matchQuery,
    });
    // then have to use aggregation pipeline to get the videos that they watch
    const videos = await Video.aggregate([
      {
        $match: matchQuery,
      },
      {
        $sort: sortQuery,
      },
      {
        $facet: {
          videoData: [
            {
              $skip: (page - 1) * parseInt(limit), // we use this formula to skip the number of results we don't want in front BASED ON WHICH PAGE WE ARE AT.
            },
            {
              $limit: parseInt(limit),
            },
          ],
          stats: [{ $count: "totalResultsBeforeLimiting" }], // this $count: "totalVideoCount" runs in parallel to the videoData pipeline, it counts the document that reached the $facet stage, not after the videoData stage. so we change it to count from videoData instead.
        },
        /*
        $facet splits the pipeline into multiple named sub-pipelines that run on the same intermediate results (the sub-pipelines run in parallel), returning one document containing multiple arrays (e.g., 'videoData' for paged results and 'stats' for total count). It’s commonly used to get pagination results and total count in a single aggregate query.
        An easier way would be to use $limit and $skip to get the videos, then use $count to get the total count, aka SPLIT it into standalone pipelines, instead of 1 $facet pipeline.
        We use $facet because we can do what we need in 1 query.
        */
      },
      {
        $addFields: {
          videoCount: { $size: "$videoData" },
        },
      },
    ]);

    // then have to sort the videos and decide how much to render etc (in aggregation pipeline)

    // then return the result
    return res
      .status(200)
      .json(new ApiResponse(200, videos, "Videos found successfully."));
  } catch (error) {
    console.log("Error getting videos: ", error);
    throw new ApiError(500, "Failed to get videos.");
  }
});

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  // TODO: get video, upload to cloudinary, create video
  const videoLocalPath = req.files?.videoFile?.[0].path; // the field to fill is "videoFile"
  const thumbnailLocalPath = req.files?.thumbnail?.[0].path; // the field to fill is "thumbnail"

  // get the duration of the video document
  let duration = 0;
  try {
    console.log(videoLocalPath);
    duration = await getDurationSeconds(videoLocalPath);
  } catch (error) {
    console.log(error);
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
      owner: new mongoose.Types.ObjectId(req.user._id), // make sure to include the word 'new'!
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

    throw new ApiError(500, "Failed to create video");
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
  const coverImageLocalPath = req.file?.path;

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
