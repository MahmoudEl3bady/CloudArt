"use server";
import { connectToDatabase } from "@/db/mongoose";
import { revalidatePath } from "next/cache";
import { User } from "@/db/models/user.model";
import { getUserById } from "./user";
import { Image } from "@/db/models/image.model";
import { redirect } from "next/navigation";
import { v2 as cloudinary } from "cloudinary";
import mongoose from "mongoose";

interface GetAllImagesParams {
  limit?: number;
  page?: number;
  searchQuery?: string;
}

interface UpdateImageParams {
  path: string;
  image: any; // Replace with your image type
  userId: string;
}

interface ImageResponse {
  data: any[]; // Replace 'any' with your Image type
  totalPages: number;
}

const populateUser = async (query: any) => {
  return query.populate({
    path: "author",
    model: User,
    select: "firstName lastName _id",
  });
};

export async function deleteImage(imageId: string) {
  try {
    await connectToDatabase();
    const deletedImage = await Image.findOneAndDelete({ _id: imageId });
    if (!deletedImage) {
      throw new Error("Image not found");
    }
    return deletedImage;
  } catch (error) {
    console.error(error);
    throw error;
  } finally {
    redirect("/");
  }
}

export async function updateImage({ path, image, userId }: UpdateImageParams) {
  try {
    await connectToDatabase();
    const updatedImage = await Image.findOneAndUpdate(
      { _id: image._id },
      { ...image },
      { new: true }
    );
    if (!updatedImage) {
      throw new Error("Image not found");
    }
    revalidatePath(path);
    return JSON.parse(JSON.stringify(updateImage));
  } catch (error) {
    console.error(error);
    throw error;
  }
}

export async function addImage({ image, userId, path }: AddImageParams) {
  try {
    await connectToDatabase();
    const author = await getUserById(userId);
    if (!author) {
      throw new Error("User not found");
    }
    const createdImage = await Image.create({ ...image, author: author._id });
    revalidatePath(path);
    return JSON.parse(JSON.stringify(createdImage));
  } catch (error) {
    console.error(error);
    throw error;
  }
}

export async function getImageById(imageId: string) {
  try {
    await connectToDatabase();
    const query = Image.findById(imageId);
    const image = await populateUser(query);
    if (!image) {
      throw new Error("Image not found");
    }
    return JSON.parse(JSON.stringify(image));
  } catch (error) {
    console.error(error);
    throw error;
  }
}

export async function getAllImages() {
  try {
    await connectToDatabase();

    // Configure cloudinary
    cloudinary.config({
      cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_CLOUD_API_KEY,
      api_secret: process.env.CLOUDINARY_CLOUD_API_SECRET,
      secure: true,
    });

    let expression = "folder=image-transformer";
    const { resources } = await cloudinary.search
      .expression(expression)
      .execute();
    const resourcesIds = resources.map((res: any) => res.public_id);

    const images = await populateUser(Image.find());

    return JSON.parse(JSON.stringify(images));
  } catch (e) {
    console.error(e);
  }
}

export const getUserImages = async ({
  userId,
  limit = 9,
  page = 1,
}: {
  userId: string;
  limit?: number;
  page: number;
}) => {
  try {
    await connectToDatabase();
    const skipAmount = (Number(page) - 1) * limit;

    const userImages = await Image.find({
      author: new mongoose.Types.ObjectId(userId),
    })
      .sort({ updatedAt: -1 })
      .skip(skipAmount)
      .limit(limit);

    const totalImages = await Image.find({ author: userId }).countDocuments();

    return {
      data: JSON.parse(JSON.stringify(userImages)),
      totalPages: Math.ceil(totalImages / limit),
    };
  } catch (error) {
    console.error("Failed to retrieve user's recent images:", error);
    return [];
  }
};
