import { z } from "zod";

const clientEnvSchema = z.object({
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z
    .string()
    .min(1, "required")
    .startsWith("pk_", "must be a Clerk publishable key (pk_...)"),
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: z
    .string()
    .min(1, "required")
    .startsWith("/", "must be an absolute path like /sign-in"),
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: z
    .string()
    .min(1, "required")
    .startsWith("/", "must be an absolute path like /sign-up"),
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: z.string().min(1, "required"),
});

// NEXT_PUBLIC_* must be written as literal process.env references so the
// Next.js bundler can inline them into client code at build time.
const rawClientEnv = {
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL,
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL,
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME:
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
};

function parseClientEnv() {
  const parsed = clientEnvSchema.safeParse(rawClientEnv);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(
      `Invalid client environment variables:\n${details}\nFix your .env / .env.local (see .env.example).`
    );
  }
  return parsed.data;
}

export type ClientEnv = z.infer<typeof clientEnvSchema>;

// SKIP_ENV_VALIDATION=1 lets CI/Docker builds proceed with dummy values.
// The cast is intentional: parsing is skipped, shape still enforced by ClientEnv.
export const clientEnv: ClientEnv =
  process.env.SKIP_ENV_VALIDATION === "1"
    ? (rawClientEnv as unknown as ClientEnv)
    : parseClientEnv();
