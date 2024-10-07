import mongoose, { model, Schema, Model } from "mongoose";

const userSchema = new Schema({
  clerkId: { type: String, required: true, unique: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  username: { type: String},
  password: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Check if the model already exists before compiling it
export const User: Model<any> =
  mongoose.models.User || model("User", userSchema);
