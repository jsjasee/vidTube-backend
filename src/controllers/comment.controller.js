import mongoose, { isValidObjectId } from "mongoose";
import { Comment } from "../models/comment.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { parse } from "dotenv";

const getVideoComments = asyncHandler(async (req, res) => {
  //TODO: get all comments for a video
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  const pageNumber = parseInt(page);
  const limitNumber = parseInt(limit);

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid videoId.");
  } else if (isNaN(pageNumber) || isNaN(limitNumber)) {
    throw new ApiError(400, "Invalid page or limit provided."); // isNaN is the MOST RELIABLE WAY TO CHECK IF SOMETHING IS NOT A NUMBER. do not use !parseInt(something) as 0 is considered falsy and will actually fail that test.
  }

  const comments = await Comment.aggregate([
    {
      $match: {
        video: new mongoose.Types.ObjectId(videoId),
      },
    },
    {
      $sort: { createdAt: -1, _id: -1 }, // pagination without sort is unstable, so we add a sort here. this is because without sort, mongoDB returns the documents in an arbitrary order.
      // SORT BEFORE PAGINATION.
    },
    {
      $skip: (pageNumber - 1) * limitNumber,
    },
    {
      $limit: limitNumber,
    },
    {
      $project: {
        __v: 0,
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(200, comments, "Video comments retrieved successfully."),
    );
});

const addComment = asyncHandler(async (req, res) => {
  // TODO: add a comment to a video
  const { videoId } = req.params;
  const { content } = req.body;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid videoId.");
  }

  const newComment = await Comment.create({
    video: new mongoose.Types.ObjectId(videoId),
    content: content,
    commentedBy: new mongoose.Types.ObjectId(req.user._id),
    owner: new mongoose.Types.ObjectId(req.user._id),
  });

  const commentUploaded = await Comment.findById(newComment._id);

  if (!commentUploaded) {
    throw new ApiError(404, "Error uploading comment.");
  }

  return res
    .status(201)
    .json(
      new ApiResponse(201, commentUploaded, "Comment uploaded successfully."),
    );
});

const updateComment = asyncHandler(async (req, res) => {
  // TODO: update a comment
  const { commentId } = req.params;
  const { content } = req.body;

  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid commentId.");
  }

  const updatedComment = await Comment.findByIdAndUpdate(
    commentId,
    { content },
    { new: true },
  );

  if (!updatedComment) {
    throw new ApiError(404, "Comment not found.");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedComment, "Comment updated successfully."),
    );
});

const deleteComment = asyncHandler(async (req, res) => {
  // TODO: delete a comment
  const { commentId } = req.params;

  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid commentId.");
  }

  const commentExtracted = await Comment.findById(commentId);

  if (req.user._id.toString() !== commentExtracted.owner.toString()) {
    throw new ApiError(401, "You are not authorized to delete this comment.");
  }

  const deletedComment = await Comment.findByIdAndDelete(commentId);

  if (!deletedComment) {
    throw new ApiError(404, "Comment not found.");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, deletedComment, "Comment deleted successfully."),
    );
});

export { getVideoComments, addComment, updateComment, deleteComment };
