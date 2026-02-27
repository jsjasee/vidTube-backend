import { Router } from "express";
import { registerUser, logoutUser } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middlewares.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";

const router = Router();

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

// Secured routes (need to check user is logged in and has a valid token first)
router.route("/logout").post(verifyJWT, logoutUser);

export default router;
