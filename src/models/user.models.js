/*
  id string pk
  username string
  email string
  fullName string
  avatar string
  coverImage string
  watchHistory ObjectId[] videos
  password string
  refreshToken string
  createdAt Date
  updatedAt Date
*/

import mongoose, { Schema } from "mongoose";
// Schema is a class from mongoose, you can either destructure it or use mongoose.Schema

const userSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true, // easier to do search queries for this field
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    fullname: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    avatar: {
      type: String, // cloundinary url
      required: true,
    },
    coverImage: {
      type: String, // cloundinary url
    },
    watchHistory: [
      {
        type: Schema.Types.ObjectId,
        ref: "Video", // the name of the model is again uppercase AND singular. always ref the MODEL, eg. "User" here NOT the schema aka NOT "userSchema"
      },
    ],
    password: {
      type: String,
      required: [true, "Password is required"], // 2nd input is the message that is passed to frontend if the field is empty
    },
    refreshToken: {
      type: String,
    },
  },
  { timestamps: true }, // this auto created createdAt & updatedAt fields.
);

export const User = mongoose.model("User", userSchema); // the convention is to name it uppercase AND singular, as "User"
