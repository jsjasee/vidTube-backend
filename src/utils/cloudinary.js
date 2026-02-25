import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

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
    fs.unlinkSync(localFilePath);
    return response;
  } catch (error) {
    fs.unlinkSync(localFilePath); // DELETES a file; the asynchronous version is just .unlink()
    return null;
  }
};

export { uploadOnCloudinary };
