"use server";
import { connectToDatabase } from "@/db/mongoose";
import { revalidatePath } from "next/cache";
import { Image } from "@/db/models/image.model";
import { getOrCreateUserByClerkId } from "@/lib/data/users";
import { redirect } from "next/navigation";
import type { AddImageParams, UpdateImageParams } from "@/types";

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

export async function updateImage({ path, image, userId: _userId }: UpdateImageParams) {
  try {
    await connectToDatabase();
    const updatedImage = await Image.findOneAndUpdate(
      { _id: image._id },
      { ...image },
      { new: true },
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
    const author = await getOrCreateUserByClerkId(userId);
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
