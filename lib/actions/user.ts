"use server";

import { User } from "@/db/models/user.model";
import { connectToDatabase } from "@/db/mongoose";
import { handleError } from "../utils";
import { revalidatePath } from "next/cache";


export const createUser = async (user: CreateUserParams) => {
  try {
    await connectToDatabase();
    const newUser = await User.create(user);
    return JSON.parse(JSON.stringify(newUser));
  } catch (error) {
    handleError(error);
  }
};

export async function getUserById(userId:string) {
  try {
    await connectToDatabase();
    const user = await User.findOne({ clerkId: userId });
    if (!user) throw new Error("User not found");
    return JSON.parse(JSON.stringify(user));
  } catch (error) {
    handleError(error);
  }
}

export const updateUser = async (userId: string, user: UpdateUserParams) => {
  try {
    await connectToDatabase();
    const updatedUser = User.findOneAndUpdate({ clerkId: userId }, user, {
      new: true,
    });
    return JSON.parse(JSON.stringify(updateUser));
  } catch (error) {
    handleError(error);
  }
};

export const deleteUser = async (userId: string) => {
  try {
    await connectToDatabase();
    const deletedUser = User.findOneAndDelete({ clerkId: userId });
    revalidatePath("/");
    return JSON.parse(JSON.stringify(deleteUser));
  } catch (error) {
    handleError(error);
  }
};
