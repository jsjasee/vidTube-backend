import jwt from "jsonwebtoken";
import { User } from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const verifyJWT = asyncHandler(async (req, res, next) => {
  // EXECUTING the next is the MOST important part!
  const token =
    req.cookies.accessToken ||
    req.body.accessToken ||
    req.header("Authorization")?.replace("Bearer ", "");
  // sometimes in MOBILE, accessToken is in 'Authorization' key in headers, the value is 'Bearer <token>'

  if (!token) {
    throw new ApiError(401, "Unauthorized");
  }

  try {
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    const user = await User.findById(decodedToken?._id).select(
      "-password -refreshToken",
    ); // we don't want the fields password & refreshToken because it is not used here.

    if (!user) {
      throw new ApiError(401, "No user found.");
    }
    console.log("❗️ user found in auth.middlewares.js: ", user);

    req.user = user; // adding MORE info to the request!

    next(); // move on to the next middleware / controller / whereever the request needs to go. the next middleware / controller is the one after 'verifyJWT' in the routes code file for that particular route.
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid access token");
  }
});
