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
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
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
    fullName: {
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

// PRE-HOOKS
userSchema.pre("save", async function () {
  // define so that this password gets hashed ONLY when the password is modified or when the user is created
  if (!this.isModified("password")) {
    return; // exit function AND pass on to the next middleware
  }

  this.password = await bcrypt.hash(this.password, 10); // first args is what you want to hash, and 10 rounds is optimal. I did NOT add a callback in the function here, so it's treated like a promise regardless. WRITE AWAIT HERE AS WELL! THIS TAKES TIME.

  /*
  the pre-hook function cannot be async if im using callback
  bcrypt.hash(this.password, 10, (err, hash) => {
    if (err) return next(err);
    this.password = hash;
    next();
  });
  */

  // DON'T NEED TO put 'next' as an argument and then write 'next()' here for an async function!
}); // NEVER use arrow function here, because we need the context so use a normal function
// prehooks always require the next keyword because THAT IS HOW THEY PASS ON THE INFO TO THE NEXT MIDDLEWARE!

// adding a method to prototype (this is slightly different from javascript like Animal.prototype.speak = some function) as this is MONGOOSE's syntax. mongoose still attaches that method to the prototype.
userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password); // comparing password take time - USE AWAIT
  // returns true or false depending if password matches
};

userSchema.methods.generateAccessToken = function () {
  // short lived access token - i guess this portion is the payload? you can grab this information when you verify/decode the JWT. usually you need _id only.
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      username: this.username,
      fullName: this.fullName,
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY },
  );
};

userSchema.methods.generateRefreshToken = function () {
  // longer lived refresh token
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      username: this.username,
      fullName: this.fullName,
    },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRY },
  );
};

export const User = mongoose.model("User", userSchema); // the convention is to name it uppercase AND singular, as "User"
