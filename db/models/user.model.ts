import { model, Schema } from "mongoose";

const userSchema = new Schema({
  clerkId: { type: String, required: true ,unique: true},
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true ,unique: true},
  username: { type: String, required: true ,unique: true},
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export const User = model("User", userSchema)