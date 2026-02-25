import dotenv from "dotenv";
import { app } from "./app.js"; // MUST add '.js' at the end otherwise errors!
import cors from "cors";
import express from "express";
import connectDB from "./db/index.js";

dotenv.config({
  path: "./.env",
});

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  }),
);

// use common EXPRESS middleware
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" })); // what does this do?
app.use(express.static("public")); // if client request for any images or whatever, backend will find the files from this public folder

const PORT = process.env.PORT || 7000;

connectDB()
  .then(
    app.listen(PORT, () => {
      console.log(`Server is running on ${PORT}`);
    }),
  )
  .catch((err) => {
    console.log("Mongodb connection error: ", err);
  });
