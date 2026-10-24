import "server-only";

import { currentUser } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/db/mongoose";
import { User } from "@/db/models/user.model";
import type { UpdateUserParams, UserDTO } from "@/types";

const toUserDTO = (user: {
  _id: unknown;
  clerkId: string;
  firstName: string;
  lastName: string;
  username?: string;
}): UserDTO => ({
  _id: String(user._id),
  clerkId: user.clerkId,
  firstName: user.firstName,
  lastName: user.lastName,
  username: user.username ?? undefined,
});

export async function getUserByClerkId(clerkId: string): Promise<UserDTO | null> {
  await connectToDatabase();
  const user = await User.findOne({ clerkId }).lean();
  return user ? toUserDTO(user) : null;
}

export async function getOrCreateUserByClerkId(clerkId: string): Promise<UserDTO | null> {
  const existing = await getUserByClerkId(clerkId);
  if (existing) return existing;

  const clerkUser = await currentUser();
  if (!clerkUser || clerkUser.id !== clerkId) return null;

  const email = clerkUser.emailAddresses[0]?.emailAddress;
  if (!email) return null;

  const user = await User.findOneAndUpdate(
    { clerkId },
    {
      $setOnInsert: {
        clerkId,
        email,
        firstName: clerkUser.firstName ?? "",
        lastName: clerkUser.lastName ?? "",
        username: clerkUser.username ?? email.split("@")[0] ?? "",
      },
    },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
  ).lean();

  return user ? toUserDTO(user) : null;
}

export async function updateUser(
  clerkId: string,
  patch: UpdateUserParams,
): Promise<UserDTO | null> {
  await connectToDatabase();
  const $set: { firstName?: string; lastName?: string; username?: string } = {};
  if (patch.firstName !== undefined) $set.firstName = patch.firstName;
  if (patch.lastName !== undefined) $set.lastName = patch.lastName;
  if (patch.username !== undefined) $set.username = patch.username;

  const user = await User.findOneAndUpdate(
    { clerkId },
    { $set },
    { new: true, runValidators: true },
  ).lean();

  return user ? toUserDTO(user) : null;
}

export async function deleteUser(clerkId: string): Promise<UserDTO | null> {
  await connectToDatabase();
  const user = await User.findOneAndDelete({ clerkId }).lean();
  return user ? toUserDTO(user) : null;
}
