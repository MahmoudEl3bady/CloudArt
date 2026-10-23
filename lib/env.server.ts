import "server-only";
import { z } from "zod";

const serverEnvSchema = z.object({
  CLERK_SECRET_KEY: z.string().min(1, "required"),
  WEBHOOK_SECRET: z.string().min(1, "required"),
  MONGODB_URL: z
    .string()
    .min(1, "required")
    .refine(
      (v) => v.startsWith("mongodb://") || v.startsWith("mongodb+srv://"),
      "must start with mongodb:// or mongodb+srv://",
    ),
  MONGODB_DB_NAME: z.string().min(1).default("imageEditor"),
  CLOUDINARY_API_KEY: z.string().min(1, "required"),
  CLOUDINARY_API_SECRET: z.string().min(1, "required"),
});

const rawServerEnv = {
  CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
  WEBHOOK_SECRET: process.env.WEBHOOK_SECRET,
  MONGODB_URL: process.env.MONGODB_URL,
  MONGODB_DB_NAME: process.env.MONGODB_DB_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
};

function parseServerEnv() {
  const parsed = serverEnvSchema.safeParse(rawServerEnv);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(
      `Invalid server environment variables:\n${details}\nFix your .env / .env.local (see .env.example).`,
    );
  }
  return parsed.data;
}

export type ServerEnv = z.infer<typeof serverEnvSchema>;

// SKIP_ENV_VALIDATION=1 lets CI/Docker builds proceed with dummy values.
// The cast is intentional: parsing is skipped, shape still enforced by ServerEnv.
export const serverEnv: ServerEnv =
  process.env.SKIP_ENV_VALIDATION === "1"
    ? (rawServerEnv as unknown as ServerEnv)
    : parseServerEnv();
