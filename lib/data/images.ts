import "server-only";

import { auth } from "@clerk/nextjs/server";
import mongoose from "mongoose";
import { transformationTypes } from "@/constants";
import { Image } from "@/db/models/image.model";
import { connectToDatabase } from "@/db/mongoose";
import { getOrCreateUserByClerkId, getUserByClerkId } from "@/lib/data/users";
import { normalizeColorForConfig } from "@/lib/validation/image";
import type {
  ActionResult,
  IImage,
  ImagesResponse,
  TransformationTypeKey,
  Transformations,
} from "@/types";

// Every owner-scoped query funnels through this filter so the ownership
// check lives in exactly one place (P5 tests + mutation checks rely on it).
export const ownedBy = (ownerId: string) => ({ author: ownerId });

type LeanImage = {
  _id: unknown;
  title: string;
  transformationType: string;
  secureURL: string;
  publicId?: string | null;
  width?: number | null;
  height?: number | null;
  aspectRatio?: string | null;
  config?: Transformations | null;
  transformationUrl?: string | null;
  color?: string | null;
  prompt?: string | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
};

const toImageDTO = (image: LeanImage): IImage => ({
  _id: String(image._id),
  title: image.title,
  // Rows written before the shared zod schema may hold arbitrary strings;
  // Collection already renders unknown types as a missing card.
  transformationType: image.transformationType as TransformationTypeKey,
  secureURL: image.secureURL,
  width: image.width ?? 1000,
  height: image.height ?? 1000,
  publicId: image.publicId ?? undefined,
  aspectRatio: image.aspectRatio ?? undefined,
  config: image.config ?? undefined,
  transformationURL: image.transformationUrl ?? undefined,
  color: image.color ?? undefined,
  prompt: image.prompt ?? undefined,
  createdAt: image.createdAt ? new Date(image.createdAt).toISOString() : undefined,
  updatedAt: image.updatedAt ? new Date(image.updatedAt).toISOString() : undefined,
});

// Rebuilds the stored transformation config server-side from validated
// fields; clients never supply config directly (S-10).
export const buildTransformationConfig = (
  type: TransformationTypeKey,
  fields: { prompt?: string; color?: string },
): Transformations => {
  if (type === "remove") {
    return { remove: { prompt: fields.prompt ?? "", removeShadow: true, multiple: true } };
  }
  if (type === "recolor") {
    return {
      recolor: {
        prompt: fields.prompt ?? "",
        to: fields.color ? normalizeColorForConfig(fields.color) : "",
        multiple: true,
      },
    };
  }
  return { ...transformationTypes[type].config };
};

// Returns null for junk ids, missing images, and images that exist but are
// private and belong to someone else (S-06): callers must treat all three
// the same way.
export async function getImageById(
  imageId: string,
  viewerClerkId: string | null,
): Promise<{ image: IImage; isOwner: boolean } | null> {
  if (!mongoose.isValidObjectId(imageId)) return null;

  await connectToDatabase();
  const viewer = viewerClerkId ? await getUserByClerkId(viewerClerkId) : null;

  const visibilityFilter = viewer
    ? { $or: [{ ...ownedBy(viewer._id) }, { visibility: "public" }] }
    : { visibility: "public" };

  const image = await Image.findOne({ _id: imageId, ...visibilityFilter }).lean();
  if (!image) return null;

  return {
    image: toImageDTO(image),
    isOwner: !!viewer && String(image.author) === viewer._id,
  };
}

export async function getUserImages({
  limit = 9,
  page = 1,
}: {
  limit?: number;
  page?: number;
} = {}): Promise<ActionResult<ImagesResponse>> {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) return { ok: false, error: "UNAUTHENTICATED" };

    const user = await getOrCreateUserByClerkId(clerkId);
    if (!user) return { ok: false, error: "UNAUTHENTICATED" };

    const safeLimit = Math.min(Math.max(Math.trunc(limit) || 9, 1), 24);
    const safePage = Math.max(Math.trunc(page) || 1, 1);
    const skipAmount = (safePage - 1) * safeLimit;

    const [images, totalImages] = await Promise.all([
      Image.find({ ...ownedBy(user._id) })
        .sort({ updatedAt: -1 })
        .skip(skipAmount)
        .limit(safeLimit)
        .lean(),
      Image.countDocuments({ ...ownedBy(user._id) }),
    ]);

    return {
      ok: true,
      data: {
        data: images.map(toImageDTO),
        totalPages: Math.ceil(totalImages / safeLimit),
      },
    };
  } catch (error) {
    console.error("getUserImages failed:", error);
    return { ok: false, error: "SERVER_ERROR" };
  }
}

export async function getExampleImages(): Promise<ActionResult<ImagesResponse>> {
  try {
    await connectToDatabase();
    const images = await Image.find({ example: true }).lean();
    return {
      ok: true,
      data: { data: images.map(toImageDTO), totalPages: 1 },
    };
  } catch (error) {
    console.error("getExampleImages failed:", error);
    return { ok: false, error: "SERVER_ERROR" };
  }
}
