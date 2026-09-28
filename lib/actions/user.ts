"use server";

import { currentUser } from "@clerk/nextjs/server";
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

export async function getUserById(userId: string) {
  try {
    await connectToDatabase();

    let user = await User.findOne({ clerkId: userId });

    if (!user) {
      const cu = await currentUser();
      if (!cu || cu.id !== userId) throw new Error("User not found");

      const email = cu.emailAddresses[0]?.emailAddress ?? "";

      user = await User.findOneAndUpdate(
        { clerkId: cu.id },
        {
          $setOnInsert: {
            clerkId: cu.id,
            email,
            username: cu.username ?? email.split("@")[0],
            firstName: cu.firstName ?? "",
            lastName: cu.lastName ?? "",
            photo: cu.imageUrl,
          },
        },
        { upsert: true, new: true },
      );
    }

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
