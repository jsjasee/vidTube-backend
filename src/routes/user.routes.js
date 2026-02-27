import { Router } from "express";
import {
  registerUser,
  logoutUser,
  loginUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  getUserChannelProfile,
  updateAccountDetails,
  updateUserCoverImage,
  getWatchHistory,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middlewares.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";

const router = Router();

// Unsecured routes - can be accessed by anyone, don't need verifyJWT
router.route("/register").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]), // we can now take multiple inputs from the user
  registerUser,
);

router.route("/login").post(loginUser);
router.route("/refresh-token").post(refreshAccessToken);

// Secured routes (need to check user is logged in and has a valid token first)
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/change-password").post(verifyJWT, changeCurrentPassword);
router.route("/get-current-user").get(verifyJWT, getCurrentUser);
router.route("/c/:username").get(verifyJWT, getUserChannelProfile);
// c for channel here. make sure 'username' is THE SAME as what is written in the params.
router.route("/update-account").put(verifyJWT, updateAccountDetails);
router
  .route("/avatar")
  .put(verifyJWT, upload.single("avatar"), updateUserAvatar); // since we are taking one file, when we are getting the file, we can just use req.file, don't need to match by name like req.file['avatar']
router
  .route("/coverImage")
  .put(verifyJWT, upload.single("coverImage"), updateUserCoverImage);
router.route("/history").get(verifyJWT, getWatchHistory);

export default router;
