"use server";
import { connectToDatabase } from "@/db/mongoose";
import { revalidatePath } from "next/cache";
import { handleError } from "../utils";
import { User } from "@/db/models/user.model";
import { getUserById } from "./user";
import { Image } from "@/db/models/image.model";
import { redirect } from "next/navigation";
import { v2 as cloudinary } from "cloudinary";

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
    handleError(error);
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
    return updatedImage;
  } catch (error) {
    handleError(error);
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
    return createdImage;
  } catch (error) {
    handleError(error);
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
    return image;
  } catch (error) {
    handleError(error);
    throw error;
  }
}

export async function getAllImages({
  limit = 9,
  page = 1,
  searchQuery = "",
}: GetAllImagesParams): Promise<ImageResponse> {
  try {
    await connectToDatabase();

    // Configure cloudinary
    cloudinary.config({
      cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_CLOUD_API_KEY,
      api_secret: process.env.CLOUDINARY_CLOUD_API_SECRET,
      secure: true,
    });

    // Build cloudinary search expression
    let expression = "folder=image-transformer";
    if (searchQuery) {
      expression += ` AND ${searchQuery}`;
    }

    // Get resources from cloudinary
    const { resources } = await cloudinary.search
      .expression(expression)
      .execute();

    const resourceIds = resources.map((resource: any) => resource.public_id);

    // Build query
    const query = {
      publicId: {
        $in: resourceIds,
      },
    };

    // Calculate skip amount for pagination
    const skipAmount = (Number(page) - 1) * limit;

    // Create the base query
    const baseQuery = Image.find(query).skip(skipAmount).limit(limit);
    // Execute the populated query
    const images = await populateUser(baseQuery);
    const testImage = await Image.find();
    // Get total count for pagination
    const totalImages = await Image.countDocuments(query);
    return {
      data: images || [],
      totalPages: Math.ceil(totalImages / limit),
    };
  } catch (error) {
    handleError(error);
    throw error;
  }
}
