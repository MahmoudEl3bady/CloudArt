import type { Document, Model } from "mongoose";
import mongoose, { Schema, model } from "mongoose";
import type { Transformations } from "@/types";

export interface ImageDoc extends Document {
  title: string;
  transformationType: string;
  secureURL: string;
  publicId?: string;
  width?: number;
  height?: number;
  aspectRatio?: string;
  config?: Transformations;
  transformationUrl?: string;
  color?: string;
  prompt?: string;
  author: mongoose.Types.ObjectId;
  visibility?: "private" | "public";
  createdAt?: Date;
  updatedAt?: Date;
}

const ImageSchema = new Schema({
  title: { type: String, required: true },
  transformationType: { type: String, required: true },
  secureURL: { type: String, required: true },
  publicId: { type: String },
  width: { type: Number },
  height: { type: Number },
  aspectRatio: { type: String },
  config: { type: Object },
  transformationUrl: { type: String },
  color: { type: String },
  prompt: { type: String },
  author: { type: Schema.Types.ObjectId, ref: "User" },
  visibility: { type: String, enum: ["private", "public"], default: "private" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export const Image: Model<ImageDoc> =
  mongoose.models.Image || model<ImageDoc>("Image", ImageSchema);
