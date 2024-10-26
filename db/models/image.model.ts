import mongoose, { Document, Schema, model ,Model} from "mongoose";

export interface ImageDoc extends Document {
  title: string;
  transformationType: string;
  secureURL: string;
  width?: number;
  height?: number;
  aspectRatio?: string;
  config?: object;
  transformationUrl?: string;
  color?: string;
  prompt?: string;
  author: { _id: string; firstName: string; lastName: string };
  createdAt?: Date;
  updatedAt?: Date;
}

const ImageSchema = new Schema({
  title: { type: String, required: true },
  transformationType: { type: String, required: true },
  secureURL: { type: String, required: true },
  width: { type: Number },
  height: { type: Number },
  aspectRatio: { type: String },
  config: { type: Object },
  transformationUrl: { type: String },
  color: { type: String },
  prompt: { type: String },
  author: { type: Schema.Types.ObjectId, ref: "User" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});


export const Image: Model<any> =
  mongoose.models.Image || model("Image", ImageSchema);