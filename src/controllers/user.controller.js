import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshToken = async (userId) => {
  try {
    // you need the userId to get the user document and access the mongoose methods
    const user = await User.findById(userId);

    if (!user) {
      throw new ApiError(404, "No such user found.");
    }

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating access and refresh tokens.",
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  const { fullName, email, username, password } = req.body;

  //validation (can be placed in a separate validators file)
  // you can use .some to achieve the same result instead of ' fullName?.trim() === "" ', except that check will apply to ALL the items in that array. .some returns TRUE if each element in the array passes the test and false if not.
  if (
    [fullName, username, email, password].some(
      (field, index, array) => field?.trim() === "",
    )
  ) {
    throw new ApiError(400, "All names is required.");
  }

  const existedUser = await User.findOne({
    $or: [{ username }, { email }], // return the result if either one of the this filter condition mathces
  });

  if (existedUser) {
    throw new ApiError(409, "User with email or username already exists.");
  }

  console.warn(req.files);
  const avatarLocalPath = req.files?.avatar?.[0]?.path; // the reason why we can access 'avatar' is in the user routes, we have assigned the 'avatar' field to the '/register' route
  // the .path is a property that is from multer, we want to store this
  const coverLocalPath = req.files?.coverImage?.[0]?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing.");
  }

  // error-handling
  let avatar;
  try {
    avatar = await uploadOnCloudinary(avatarLocalPath);
    // console.log("Uploaded avatar successfully: ", avatar);
  } catch (error) {
    console.log("Error uploading avatar: ", error);
    throw new ApiError(500, "Failed to upload avatar.");
  }

  let coverImage;
  try {
    coverImage = await uploadOnCloudinary(coverLocalPath);
    // console.log("Uploaded coverImage successfully: ", coverImage);
  } catch (error) {
    console.log("Error uploading avatar: ", error);
    throw new ApiError(500, "Failed to upload avatar.");
  }

  try {
    const user = await User.create({
      fullName,
      avatar: avatar.url,
      coverImage: coverImage?.url || "",
      email,
      password,
      username: username.toLowerCase(),
    });

    const createdUser = await User.findById(user._id).select(
      "-password -refreshToken",
    ); // this is removing fields from that object so that we don't return it to the user, this is a mongoose syntax, the "-"

    if (!createdUser) {
      throw new ApiError(500, "Something went wrong while registering a user.");
    }

    return res
      .status(201)
      .json(new ApiResponse(201, createdUser, "User registered successfully."));
  } catch (error) {
    // delete the files from cloudinary if there's an error so it doesn't take up our space
    console.log("User creation failed");

    if (avatar) {
      await deleteFromCloudinary(avatar.public_id);
    }

    if (coverImage) {
      await deleteFromCloudinary(coverImage.public_id);
    }

    throw new ApiError(
      500,
      "Something went wrong while trying to register user. Images are deleted from cloudinary.",
    );
  }
});

const loginUser = asyncHandler(async (req, res) => {
  // get data from body
  const { email, username, password } = req.body;

  // validation
  if (!email || !password) {
    throw new ApiError(400, "Email and password are required.");
  }

  // check for user
  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) {
    throw new ApiError(404, "User not found.");
  }

  // validate password

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid credentials");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id,
  ); // we are using mongoDB, so we have access to _id

  // fire up a DB query to be really sure the user exists (failsafe); .select is used to remove fields you don't want
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken",
  );

  if (!loggedInUser) {
    throw new ApiError(404, "User not found.");
  }

  // Send the response to user
  const options = {
    httpOnly: true, // this makes the cookie NON modifiable on client side
    secure: process.env.NODE_ENV === "production", // returns true if it is in production
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(new ApiResponse(200, loggedInUser, "User logged in successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken; // refreshToken might come up in the body if it is an app

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Refresh token is required.");
  }

  // in the user.models.js code file generateRefreshToken method, in the payload of the refreshToken aka JWT we have attached the _id property which we can use to query the database.

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET,
    );

    // validation and checking part
    const user = await User.findById(decodedToken?._id); // use "?" to only access _id if decodedToken is there, otherwise decodedToken._id will be undefined

    if (!user) {
      throw new ApiError(401, "Invalid refresh token.");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Invalid refresh token.");
    }

    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    };

    const { accessToken, refreshToken: newRefreshToken } =
      await generateAccessAndRefreshToken(user._id); // now the refreshToken is CALLED newRefreshToken (this is changing the name of the keys)

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access token refreshed successfully.",
        ),
      );
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while refreshing access token.",
    );
  }
});

const logoutUser = asyncHandler(async (req, res) => {
  await User
    .findByIdAndUpdate
    // todo: come back after middleware (we need to attach user object/document to a 'user' key to the request, so each route don't have to query the database every single time.)
    // if we don't attach the user, then each time we have to decode the access token -> get the user._id and query database
    ();
});

export { registerUser, loginUser, refreshAccessToken };
