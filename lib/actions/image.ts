"use server";

import { auth } from "@clerk/nextjs/server";
import mongoose from "mongoose";
import { revalidatePath } from "next/cache";
import { deleteImageOwnedBy, insertImage, updateImageOwnedBy } from "@/lib/data/images";
import { getOrCreateUserByClerkId } from "@/lib/data/users";
import { saveImageSchema, updateImageSchema } from "@/lib/validation/image";
import type { ActionResult, AddImageParams, UpdateImageParams } from "@/types";

const revalidateImagePaths = (detailPath?: string) => {
  revalidatePath("/");
  revalidatePath("/profile");
  if (detailPath) {
    revalidatePath(detailPath);
  }
};

export async function addImage({ image }: AddImageParams): Promise<ActionResult<{ _id: string }>> {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return { ok: false, error: "UNAUTHENTICATED" };
  }

  const parsed = saveImageSchema.safeParse(image);
  if (!parsed.success) {
    return { ok: false, error: "INVALID_INPUT" };
  }

  try {
    const author = await getOrCreateUserByClerkId(clerkId);
    if (!author) {
      return { ok: false, error: "UNAUTHENTICATED" };
    }

    const created = await insertImage({ authorId: author._id, data: parsed.data });
    revalidateImagePaths();
    return { ok: true, data: created };
  } catch (error) {
    console.error("addImage failed:", error);
    return { ok: false, error: "SERVER_ERROR" };
  }
}

export async function updateImage({
  image,
}: UpdateImageParams): Promise<ActionResult<{ _id: string }>> {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return { ok: false, error: "UNAUTHENTICATED" };
  }

  const parsed = updateImageSchema.safeParse(image);
  if (!parsed.success) {
    return { ok: false, error: "INVALID_INPUT" };
  }
  if (!mongoose.isValidObjectId(parsed.data._id)) {
    return { ok: false, error: "NOT_FOUND" };
  }

  try {
    const author = await getOrCreateUserByClerkId(clerkId);
    if (!author) {
      return { ok: false, error: "UNAUTHENTICATED" };
    }

    const { _id, ...fields } = parsed.data;
    const updated = await updateImageOwnedBy(author._id, _id, fields);
    if (!updated) {
      return { ok: false, error: "NOT_FOUND" };
    }

    revalidateImagePaths(`/transforms/${_id}`);
    return { ok: true, data: updated };
  } catch (error) {
    console.error("updateImage failed:", error);
    return { ok: false, error: "SERVER_ERROR" };
  }
}

export async function deleteImage(imageId: string): Promise<ActionResult<{ _id: string }>> {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return { ok: false, error: "UNAUTHENTICATED" };
  }
  if (!mongoose.isValidObjectId(imageId)) {
    return { ok: false, error: "NOT_FOUND" };
  }

  try {
    const author = await getOrCreateUserByClerkId(clerkId);
    if (!author) {
      return { ok: false, error: "UNAUTHENTICATED" };
    }

    const deleted = await deleteImageOwnedBy(author._id, imageId);
    if (!deleted) {
      return { ok: false, error: "NOT_FOUND" };
    }

    revalidateImagePaths(`/transforms/${imageId}`);
    return { ok: true, data: { _id: imageId } };
  } catch (error) {
    console.error("deleteImage failed:", error);
    return { ok: false, error: "SERVER_ERROR" };
  }
}
