import { z } from "zod";
import { aspectRatioOptions, transformationTypes } from "@/constants";
import { clientEnv } from "@/lib/env.client";
import type { TransformationTypeKey } from "@/types";

// Cloudinary delivery URLs are built by next-cloudinary -> @cloudinary/url-gen,
// which percent-encodes only some characters (spaces yes, "%" and "?" yes;
// "/" "#" "," ";" ":" no). Inside e_gen_remove / e_gen_recolor values a raw
// "/" or "#" truncates the URL and a raw "," or ";" injects extra
// transformations or parameters, so those characters are rejected outright.
// Apostrophes and periods are left untouched by the SDK and are path-safe.
const SAFE_TEXT = /^[\p{L}\p{N} .'\-()_&+*!]{1,60}$/u;
const HEX_COLOR = /^#?(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const NAMED_COLOR = /^[\p{L}\p{N} ]{1,30}$/u;
const PUBLIC_ID = /^[A-Za-z0-9][A-Za-z0-9._\-/]{0,255}$/;

// Forms submit "" for untouched optional fields; the server may receive the
// same "" from a crafted call, so both sides share this coercion.
const emptyToUndefined = (value: unknown): unknown =>
  value === "" || value === null || value === undefined ? undefined : value;

const aspectRatioKeys = Object.keys(aspectRatioOptions) as [
  keyof typeof aspectRatioOptions,
  ...(keyof typeof aspectRatioOptions)[],
];

const transformationTypeKeys = Object.keys(transformationTypes) as [
  TransformationTypeKey,
  ...TransformationTypeKey[],
];

const titleSchema = z.string().trim().min(1, "Required").max(80, "Max 80 characters");

const aspectRatioSchema = z.preprocess(emptyToUndefined, z.enum(aspectRatioKeys).optional());

const promptSchema = z.preprocess(
  emptyToUndefined,
  z.string().regex(SAFE_TEXT, "Stick to letters, numbers and basic punctuation").optional(),
);

const colorSchema = z.preprocess(
  emptyToUndefined,
  z
    .string()
    .refine(
      (value) => HEX_COLOR.test(value) || NAMED_COLOR.test(value),
      "Use a color name or a hex value like #FF5733",
    )
    .optional(),
);

const publicIdSchema = z.string().regex(PUBLIC_ID, "Invalid public id");

const imageFields = {
  title: titleSchema,
  aspectRatio: aspectRatioSchema,
  prompt: promptSchema,
  color: colorSchema,
  publicId: publicIdSchema,
};

export const imageFormSchema = z.object(imageFields).strict();

export const saveImageSchema = z
  .object({
    ...imageFields,
    transformationType: z.enum(transformationTypeKeys),
    secureURL: z
      .string()
      .url("Invalid URL")
      .startsWith(
        `https://res.cloudinary.com/${clientEnv.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/`,
        "Image must be hosted on our Cloudinary cloud",
      ),
    width: z.number().int().min(1).max(30000).optional(),
    height: z.number().int().min(1).max(30000).optional(),
  })
  .strict();

export const updateImageSchema = saveImageSchema.extend({ _id: z.string() }).strict();

export type SaveImageInput = z.infer<typeof saveImageSchema>;

// Cloudinary wants hex colors without the "#" prefix (e.g. to-color_EA672A);
// a raw "#" would truncate the delivery URL at the fragment.
export const normalizeColorForConfig = (color: string): string =>
  color.startsWith("#") ? color.slice(1) : color;
