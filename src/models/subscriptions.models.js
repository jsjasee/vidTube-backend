/*
  id string pk
  subscriber ObjectId users
  channel ObjectId users
  createdAt Date
  updatedAt Date
*/

import mongoose, { Schema } from "mongoose";

const subscriptionSchema = Schema(
  {
    subscriber: {
      type: Schema.Types.ObjectId, // the one who is subscribing!
      ref: "User",
    },
    channel: {
      type: Schema.Types.ObjectId, // one to whom `subscriber` is subscribing!
      ref: "User",
    },
  },
  { timestamps: true },
);

export const Subscription = mongoose.model("Subscription", subscriptionSchema);
