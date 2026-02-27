import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

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

export { registerUser };
