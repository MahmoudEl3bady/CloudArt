# 01: Security & code review

Severity: **Critical** (exploitable / data loss), **High**, **Medium**, **Low**.
IDs: `S-` security, `B-` bug/correctness, `D-` data, `O-` observability. The agent prompts in file 06 refer to these.

---

## A. Secrets & config

| ID | Sev | Where | Problem | Fix |
|---|---|---|---|---|
| S-01 | Critical | `.env.docker`, `Dockerfile` | Live Cloudinary key/secret, Atlas URI with password, Clerk secret + webhook secret sit in a file that gets shared/copied. Dockerfile also hardcodes the Clerk publishable key and Cloudinary cloud name as `ENV`. | Rotate everything (see 00). Pass `NEXT_PUBLIC_*` as `ARG`s at build. Secrets only at runtime via env/secret manager. Add `gitleaks` to pre-commit + CI. |
| S-02 | Critical | `.dockerignore` | Ignores `.env`, `.env.local`, `.env*.local` but **not** `.env.docker` → copied into the image layer, readable with `docker history`/`docker save`, leaks if you ever push the image. | Ignore `.env*` and allow only `.env.example`. See report 03. |
| B-03 | High | `db/mongoose.ts`, `.env.docker`, `.env.example`, `README` | Code reads `process.env.MONOGO_URL` (typo). `.env.example` says `MONGODB_URL`. `getAllImages` reads `CLOUDINARY_CLOUD_API_KEY/SECRET` while `.env.example` says `CLOUDINARY_API_KEY/SECRET`. README says `cp .env.docker.example` (file doesn't exist). Following the README yields a broken app. | One canonical name per var. Add `env.ts` (zod) that validates at boot and throws a readable error. Update `.env.example` + README. |

---

## B. Authorization: the big one

Next server actions are POST endpoints. A `"use server"` file exports **public API surface**. Assume every export can be called by anyone who can find its action ID (the ones your client components import are trivially discoverable in the JS bundle). The Clerk `proxy.ts` protects *pages*, not actions.

| ID | Sev | Where | Problem | Fix |
|---|---|---|---|---|
| S-03 | Critical | `lib/actions/image.ts` `addImage`, `TransformsForm` | `userId` comes from the client (`userId={user.clerkId}` prop → action arg). Anyone can create images as any user. | Ignore any client-provided user. `const { userId } = await auth()` inside the action; look up the DB user from that. Remove the `userId` prop. |
| S-04 | Critical | `updateImage` | No auth, no ownership check (`findOneAndUpdate({_id})`), and `{ ...image }` is mass assignment: caller can overwrite `author` (hijack an image), `example`, etc. | Filter by `{ _id, author: dbUser._id }`; build the update from a zod-parsed allowlist with `$set`. |
| S-05 | Critical | `deleteImage` | No auth, no ownership. Also `redirect()` inside `finally` swallows errors and always redirects. | Same ownership filter. Return a result, redirect from the caller. |
| S-06 | High | `getImageById`, `transforms/[id]/page.tsx` | Any image is viewable by ID by anyone (incl. signed-out). Mongo ObjectIds aren't secrets. `findById("junk")` throws CastError → 500. | Add `visibility: "private" | "public"` (default private); check owner or public. Validate id with `mongoose.isValidObjectId`, return `notFound()`. |
| S-07 | High | `getUserById` | Returns the full user doc (email etc.) for any `clerkId` without checking the caller. The `currentUser()` check only guards the create-fallback path. | Don't expose it as an action. Move to `server-only` data layer; return a DTO (no email) and only for the caller. |
| S-08 | High | `getUserImages`, `getAllImages` | `getUserImages` takes a Mongo user id from the caller (list anyone's images), `limit` unbounded. `getAllImages` returns **every user's images** and fires an unused Cloudinary search (results discarded). | Delete `getAllImages`. Derive user from `auth()`. Clamp `limit` (1..24). |
| S-09 | Medium | `proxy.ts` | `isPublicRoute` is defined but never used, so it's default-allow with a small blocklist. `"/transforms/[id]/update(.*)"` is a literal string; `createRouteMatcher` doesn't treat `[id]` as a wildcard, so it never matches. | Invert: protect everything, allowlist public routes. Use `/transforms/(.*)/update(.*)` style patterns, or better, check in the page/action too (defense in depth). |
| S-12 | Low | `addImage` / `updateImage` `path` arg | Client picks which path gets `revalidatePath`d. Cache-busting griefing. | Hardcode the paths server-side. |

**Split the files.** Put non-action logic in `server-only` modules, and keep `"use server"` files to the few actions the UI truly calls (`addImage`, `updateImage`, `deleteImage`). `createUser/updateUser/deleteUser` are webhook-only; they shouldn't live in a `"use server"` file.

Target pattern:

```ts
// lib/actions/image.ts
"use server";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { imageInputSchema } from "@/lib/validation/image";
import { requireDbUser } from "@/lib/data/users";      // server-only
import { createImage } from "@/lib/data/images";       // server-only

export async function addImage(input: unknown) {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "UNAUTHENTICATED" } as const;

  const parsed = imageInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "INVALID_INPUT" } as const;

  const user = await requireDbUser(userId);
  const image = await createImage(user._id, parsed.data);
  revalidatePath("/dashboard");
  return { ok: true, data: { id: String(image._id) } } as const;
}
```

---

## C. Input validation

| ID | Sev | Where | Problem | Fix |
|---|---|---|---|---|
| S-10 | High | `formSchema` (both forms), actions | Client schema is `title: z.string()`: empty and unbounded allowed. Server has **no** validation: `transformationType`, `config`, `secureURL`, `publicId`, `width/height` all trusted. | Shared zod schema in `lib/validation/`, used by the form *and* the action (`.strict()`). Title 1..80. `transformationType` = enum of your 5 keys. `width/height` ints 1..8000. `publicId`/`secureURL` must belong to **your** cloud: `^https://res\.cloudinary\.com/<CLOUD_NAME>/`. `config` rebuilt server-side from `transformationType` + validated `prompt`/`color`, never accepted raw. |
| S-11 | High | `onInputChangeHandler` → Cloudinary URL | `prompt` and `to` (color) are user text that ends up inside a Cloudinary transformation URL. Characters like `,` `/` `:` can inject extra transformation params. | Whitelist charset + length (`/^[\p{L}\p{N} #-]{1,60}$/u`) on both client and server; verify `next-cloudinary` percent-encodes (test with `a,e_blur:2000`). |

---

## D. Cloud/AI cost abuse (matters most for an AI demo)

| ID | Sev | Where | Problem | Fix |
|---|---|---|---|---|
| S-13 | High | `MediaUploader` → `uploadPreset="jsm_imaginify"` | Unsigned preset. The preset name + cloud name are public (they're in your JS bundle), so anyone can upload arbitrary files to your Cloudinary account with no login. Guest trial makes this reachable without an account too. | Signed uploads: `/api/cloudinary/sign` route (auth or rate-limited guest) using `cloudinary.utils.api_sign_request`, pass `signatureEndpoint` to `CldUploadWidget`. In the preset: allowed formats (jpg/png/webp), max file size (e.g. 10 MB), fixed folder, moderation on. Client-side `maxFileSize` + `clientAllowedFormats` as UX, not security. |
| S-14 | High | Cloudinary account settings | `next-cloudinary` builds transformation URLs client-side; with unrestricted transformations anyone can craft URLs that run generative AI/background-removal on any asset in your cloud, and you pay per transformation. | Enable **Strict transformations** in Cloudinary (Settings → Security) and allow only the named transformations you use, or serve **signed delivery URLs** generated server-side. Set billing alerts/usage caps. |
| S-15 | High | Guest trial, upload, actions | No rate limiting anywhere. | Upstash Ratelimit (or Vercel KV) keyed by user id / IP: e.g. guests 5 transforms/hour, users 30/hour. Return 429 + friendly toast. Add Turnstile/hCaptcha on guest upload if abused. |
| S-16 | Medium | `next.config.mjs` `remotePatterns` | Allows any path on `res.cloudinary.com`: your `/_next/image` optimizer will happily resize **anyone's** Cloudinary asset (bandwidth/compute on your bill). | Add `pathname: "/<your-cloud-name>/**"`. |
| B-16 | Medium | UI copy | "1 credit was deducted from your account" (no credit system exists), "Download quality limited to standard resolution" (not implemented), "Unlimited transformations". The trial "no download" is cosmetic: the result is a normal `<img>` URL. | Either build quotas (recommended, see 05) or delete the claims. Never ship UI text that isn't true. |

---

## E. Webhook (`app/api/webhooks/clerk/route.ts`)

| ID | Sev | Problem | Fix |
|---|---|---|---|
| S-17 | High | `const payload = await req.json(); const body = JSON.stringify(payload)` then verifies the signature against the **re-serialized** JSON. Signature is over the raw bytes; re-stringify can differ (whitespace, unicode escapes, number formatting) → intermittent 400s. | `const body = await req.text();` verify that. Parse after verification. |
| S-18 | Medium | `User.create` on `user.created` isn't idempotent (Clerk retries → duplicate key or duplicate docs, and `getUserById` has its own upsert path racing it). `email_addresses[0].email_address` crashes on empty array. Response echoes the full user doc. Throws at request time if secret missing. | Upsert by `clerkId` (unique index). Guard the array (`primary_email_address_id`). Return `{ ok: true }` only. Validate `WEBHOOK_SECRET` in `env.ts`. |
| B-01 | Critical | `updateUser` / `deleteUser` in `lib/actions/user.ts` never `await` the Mongoose query, so **the query never executes** (Mongoose queries are lazy thenables). Then `JSON.stringify(updateUser)` stringifies the *function itself* → `undefined` → `JSON.parse(undefined)` throws → swallowed by `handleError` → returns `undefined`. The webhook happily replies "OK". Net effect: user profile changes and deletions in Clerk **never reach your DB**. | `await User.findOneAndUpdate(...).lean()`; return the actual result; handle "not found". On delete, also delete or anonymize their images (and Cloudinary assets). |

---

## F. Correctness bugs

| ID | Sev | Where | Problem | Fix |
|---|---|---|---|---|
| B-02 | High | `updateImage` | Same bug: `JSON.parse(JSON.stringify(updateImage))` (function name, not `updatedImage`). The DB write happens, then it throws, so the UI shows failure for a successful update. | Return the doc (`.lean()` + map to DTO). |
| B-04 | High | `next.config.mjs` | `compiler.removeConsole: true` in production strips **all** `console.*` including `console.error`. Every `catch` in this app only logs, so production errors vanish. | `removeConsole: { exclude: ["error", "warn"] }`, better: real logger + Sentry (O-01). |
| B-05 | High | `transforms/[id]/page.tsx` | Link goes to `/transformations/${id}/update`; the app route is `/transforms/...`, and the update page isn't in the archive. Update is a dead feature. Delete UI is commented out (`DeleteConfirmation`). | Build the update page (reuses the form with `action="Update"`) or remove the dead code paths. Add delete with a confirm dialog. |
| B-06 | Medium | `transforms/add/[type]`, `transforms/trial/[type]` | `transformationTypes[type]` is `undefined` for a bad URL → `transformation.type` TypeError → 500. | `if (!transformation) notFound();` + `generateStaticParams` with `dynamicParams = false`. |
| B-07 | Medium | `page.tsx`, `profile/page.tsx` | `getUserById` swallows errors and returns `undefined`; pages then do `user._id` → crash. Home (guest or not) also calls `currentUser()` (a network call to Clerk) on every request. | Use `auth()` for the id (local JWT check, no network). Fail loudly, use `error.tsx`. |
| B-08 | Medium | `constants/index.ts` | `import { subscribe } from "diagnostics_channel"; import { config } from "process";` are accidental IDE auto-imports of Node built-ins into a file used by client components. | Delete both lines. |
| B-09 | Low | `aspectRatioOptions["3:4"]` | Key `"3:4"` holds `aspectRatio: "4:5"`, label "Portrait (4:5)". Confusing and easy to break. | Rename the key to `"4:5"`. |
| B-10 | Medium | `Collection.tsx`, `Search.tsx` | Search filters only the 6 items already on the current page (client-side), then computes `totalPages` with `/ 10` while pages use `limit: 6`. Search effect fires `router.push` on mount and re-fires when `searchParams` changes; history gets spammed. `defaultValue=""` ignores the `?query=` already in the URL. | Server-side search (`?q=` → Mongo `$regex` escaped, or text index) + real pagination in the server component. Use `router.replace`, `useDebouncedCallback`, init from URL. |
| B-11 | Low | `TransformsForm`, `TrialTransformForm` | `debounce(fn, 1000)()`: a **new** debounced function is created per keystroke, so nothing is actually debounced; every keystroke schedules its own update. | `useDebouncedCallback` (`use-debounce`) or a `useRef` timer. |
| B-12 | Low | `lib/utils.ts` `download` | `filename.replace(" ", "_")` (first space only), always `.png`, blob URL never revoked, anchor never removed, errors `console.log`ged (stripped in prod = silent failure). | `res.ok` check, `replaceAll`, `revokeObjectURL`, toast on failure; or use Cloudinary `fl_attachment`. |
| B-13 | Low | `getUserImages`, `getExampleImages` | On error they `return []`, a different shape than the success object (`{data,totalPages}`); callers cast with `as ImagesResponse`. `getExampleImages` returns `totalImages: 5` instead of `totalPages`. Double query for the count. | Typed return, `countDocuments({author})` directly, `Promise.all`. |
| B-14 | Low | `getAllImages` | Configures Cloudinary, runs a search, throws the result away, returns everything. | Delete. |
| B-15 | Low | `TransformedImage` | `alt="Alt"`. The loading overlay `<div className="">` has no classes, so the spinner isn't overlaid. Success toast ("Transformation applied ✨") fires *before* Cloudinary finishes generating. Error path "retry" is a 8 s timer that just hides the spinner. | Proper state machine (report 04). |

---

## G. Headers & platform hardening

| ID | Sev | Problem | Fix |
|---|---|---|---|
| S-19 | Medium | No CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy, X-Content-Type-Options. `X-Powered-By` is on. | Add `headers()` in `next.config`; start CSP as `Content-Security-Policy-Report-Only`, then enforce. |

```js
// next.config.mjs (sketch)
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];
export default {
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
  compiler: { removeConsole: { exclude: ["error", "warn"] } },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com", pathname: `/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/**` }],
  },
  async headers() { return [{ source: "/:path*", headers: securityHeaders }]; },
};
```

CSP origins you'll need to allow (verify in the browser console, don't guess): your Clerk frontend API domain (`*.clerk.accounts.dev` for the dev instance, your own `clerk.<domain>` in prod), `challenges.cloudflare.com` (Clerk bot protection), `upload-widget.cloudinary.com` / `widget.cloudinary.com` / `api.cloudinary.com` (upload widget), `res.cloudinary.com` (images), `va.vercel-scripts.com` (analytics). Clerk documents its CSP requirements.

---

## H. Dependencies & versions

| ID | Sev | Problem | Fix |
|---|---|---|---|
| S-20 | Medium | `next ^16` with `eslint-config-next 14.2.13` and `eslint ^8`; `@types/react ^18` with `react ^19`; `@types/react-dom ^18`. `mongodb` (driver) is a direct dep you don't import (mongoose brings it). `qs` + `@types/qs` only for two tiny helpers `URLSearchParams` does. `@radix-ui/react-icons` shows ~85% unused JS in Lighthouse and you already have `lucide-react`. Package name is `image-transformer`, README says Next 15 and Node 18 (Next 16 needs Node ≥ 20.9). | Align majors, drop unused deps, add `engines` + `packageManager`. Run `pnpm audit`, enable Dependabot. |
| Low | CI | `npx react-doctor@latest` in a script and `millionco/react-doctor@v2` by tag: unpinned third-party code in CI. | Pin action to a commit SHA, pin package version. |

---

## I. Data model (models weren't in the archive: verify)

| ID | Check |
|---|---|
| D-01 | `User.clerkId` has `unique: true` + index; `User.email` unique. |
| D-02 | `Image` has compound index `{ author: 1, updatedAt: -1 }` (your main query). |
| D-03 | Schema has `visibility`, `createdAt/updatedAt` (`timestamps: true`), and `example` isn't writable from user input. |
| D-04 | Use `.lean()` and map to a DTO instead of `JSON.parse(JSON.stringify(doc))` everywhere. Type models with `InferSchemaType` instead of `any`/global `declare type`. |
| D-05 | `dbName: "imageEditor"` is hardcoded in `connectToDatabase`; the URI in `.env.example` also contains it. Pick one place. |

## J. Observability

| ID | Sev | Problem | Fix |
|---|---|---|---|
| O-01 | Medium | Only `console.log` (mostly stripped in prod), no error reporting, no health endpoint. `connectToDatabase` logs "Connected to the DB!!" on every call after cache miss. | Sentry (`@sentry/nextjs`), `pino` for structured logs on the server, `/api/health` (checks DB ping), `error.tsx` + `global-error.tsx`. |

---

## Not a finding, but you should know

Dead/leftover code that looks unfinished to a reviewer: `creditFee`, Stripe `CheckoutTransactionParams`/`CreateTransactionParams` types, `.credits-*` / `.profile-*` CSS, ~10 commented-out CSS blocks, unused imports in both forms, `tailwind.config.ts` written with `module.exports`, `IBMPlex` font family that's never loaded, `DynamicCollection` never used. ESLint with `no-unused-vars` + a cleanup pass fixes most of it.
