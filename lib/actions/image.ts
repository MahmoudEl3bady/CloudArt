"use server";

import { connectToDatabase } from "@/db/mongoose";
import { revalidatePath } from "next/cache";
import { handleError } from "../utils";
import { User } from "@/db/models/user.model";
import { getUserById } from "./user";
import { Image } from "@/db/models/image.model";
import { redirect } from "next/navigation";
import { v2 as cloudinary } from "cloudinary";
const populateUser = async (query: any) => {
  query.populate({
    path: "author",
    model: User,
    select: "firstName lastName _id",
  });
};

export const deleteImage = async (imageId: string) => {
  try {
    await connectToDatabase();
    await Image.findOneAndDelete({ _id: imageId });
  } catch (error) {
    handleError(error);
  } finally {
    redirect("/");
  }
};

export const updateImage = async ({
  path,
  image,
  userId,
}: UpdateImageParams) => {
  try {
    await connectToDatabase();
    const updatedImage = await Image.findOneAndUpdate({ _id: image._id });
    revalidatePath(path);
    return updatedImage;
  } catch (error) {
    handleError(error);
  }
};

export const addImage = async ({ image, userId, path }: AddImageParams) => {
  try {
    await connectToDatabase();
    const author = await getUserById(userId);
    if (!author) {
      throw new Error("User not found");
    }
    const createdImage = await Image.create({ ...image, author: author._id });
    revalidatePath(path);
    return createdImage;
  } catch (error) {
    handleError(error);
  }
};

export const getImageById = async (imageId: string) => {
  try {
    await connectToDatabase();
    const image = await populateUser(Image.findById(imageId));
    return image;
  } catch (error) {
    handleError(error);
  }
};

export const getAllImages = async ({
  limit = 9,
  page = 1,
  searchQuery = "",
}: {
  limit: number;
  page: number;
  searchQuery: string;
}) => {
  try {
    await connectToDatabase();
    cloudinary.config({
      cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_CLOUD_API_KEY,
      api_secret: process.env.CLOUDINARY_CLOUD_API_SECRET,
      secure: true,
    });

    let expression = "folder=image-transformer";
    if (searchQuery) {
      expression += `AND ${searchQuery}`;
    }
    const { resources } = await cloudinary.search
      .expression(expression)
      .execute();

    const resourceIds = resources.map((re: any) => re.public_id);
    // let q = {};
      let q = {
        publicId: {
          $in: resourceIds,
        },
      };

    const skipAmounts = (Number(page) - 1) * limit;
    const images = await populateUser(Image.find(q));
    const totalImages = await Image.find(q).countDocuments();
    console.log("TOtal images from the main getAllImages function",totalImages);
    return {
      data:images,
      totalPages:Math.ceil(totalImages/limit),
    }
  } catch (error) {}
};
