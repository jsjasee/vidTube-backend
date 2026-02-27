import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import dotenv from "dotenv"; // a quirk of cloudinary, technically don't have to do this as it's already done in index.js, but we have to write this line for cloudinary to pick out the .env keys.

dotenv.config({
  path: "./.env",
});

// Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET, // Click 'View API Keys' above to copy your API secret
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    // do not proceed if there is not local file path
    if (!localFilePath) return null;
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto", // auto detect what file is coming in
    });
    console.log("File uploaded on cloudinary. File src: ", response.url);

    // once the file is uploaded we would like to delete it from our servers
    console.log("Deleting this path: ", localFilePath);
    try {
      fs.unlinkSync(localFilePath);
      console.log("Deleted local file ✅");
    } catch (delErr) {
      console.log("FAILED to delete local file ❌", delErr.message);
    }

    return response;
  } catch (error) {
    console.log("Error on cloudinary: ", error);

    // best-effort cleanup
    try {
      fs.unlinkSync(localFilePath);
      console.log("Deleted local file after failure ✅");
    } catch (delErr) {
      console.log(
        "FAILED to delete local file after failure ❌",
        delErr.message,
      );
    }

    return null;
  }
};

const deleteFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    console.log("Deleted from cloudinary. Public id: ", publicId);
  } catch (error) {
    console.log("Error deleting from cloudinary: ", error);
    return null;
  }
};

export { uploadOnCloudinary, deleteFromCloudinary };
