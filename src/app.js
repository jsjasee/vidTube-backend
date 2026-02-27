import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

// IMPORT ROUTES
import healthcheckRouter from "./routes/healthcheck.routes.js";
import userRouter from "./routes/user.routes.js";

// SET-UP
const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  }),
);
app.use(cookieParser()); // cookie parser is considered a middleware

// use common EXPRESS middleware
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" })); // what does this do?
app.use(express.static("public")); // if client request for any images or whatever, backend will find the files from this public folder

// ROUTES
app.use("/api/v1/healthcheck", healthcheckRouter); // first parameter is WHERE you want to serve this. request is BEING HANDLED by healthcheck router
app.use("/api/v1/users", userRouter);

export { app };
