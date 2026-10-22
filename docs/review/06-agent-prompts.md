# 06: Agent prompts

Paste the **Global rules** block at the start of every session (or into your agent's rules file: `CLAUDE.md`, `AGENTS.md`, etc.), then paste **one prompt at a time**, in order. Review each diff before moving on; you'll be asked about every line in interviews.

Assumption: the review reports live in `docs/review/` in the repo. If not, the prompts still contain the requirements; the reports just add detail. Finding IDs (S-xx, B-xx…) refer to `01-security-and-code-review.md`.

Order: P1 → P2 → P3 → P4 → P5 → P6 → P7 → P8 → P9 → P10 → P11 → P12 → P13 → P14 → P15.
(Do the manual secret rotation from `00-START-HERE.md` **before** P1.)

---

## Global rules (paste first, every session)

```text
You are working in the CloudArt repo (Next.js 16 App Router, TypeScript strict, pnpm, Clerk, MongoDB/Mongoose, Cloudinary, Tailwind v3 + shadcn/ui).

Rules:
1. Read before writing. Inspect package.json, tsconfig, next.config.mjs, proxy.ts, app/, components/, lib/, db/ (including db/models/*) and .github/. Base decisions on the code you actually see, not on assumptions.
2. Work on a new git branch per task (name given in the prompt). Make small commits using Conventional Commits (feat:, fix:, chore:, refactor:, test:, docs:, ci:). Do not touch files unrelated to the task.
3. Never print, copy, log or commit secrets. Do not open .env, .env.local or .env.docker. Only .env.example may be read or edited.
4. Do not add dependencies beyond those named in the task unless truly necessary; if you add one, say why in the summary. Use pnpm. Do not upgrade unrelated packages.
5. Preserve behavior unless the task says to change it. If a requirement conflicts with what you find in the code, stop and report instead of improvising.
6. Prefer explicit types. No new `any`. No new console.log. Keep functions small and named clearly.
7. Before finishing, run every script that exists among: pnpm lint, pnpm typecheck, pnpm test, pnpm build. Fix failures you caused. Report failures you did not cause.
8. Final answer format: (a) summary of what changed and why, (b) list of files touched, (c) commands you ran with pass/fail, (d) anything you were unsure about or deliberately skipped, (e) suggested follow-ups.
```

---

## P1: Env validation & repo hygiene
Branch: `chore/env-and-hygiene` · Fixes: B-03, S-01 (repo side), dead code

```text
Task: make configuration correct, validated and documented, and remove repo clutter.

1. Canonical env var names (use exactly these): 
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY, NEXT_PUBLIC_CLERK_SIGN_IN_URL, NEXT_PUBLIC_CLERK_SIGN_UP_URL, WEBHOOK_SECRET (Clerk webhook signing secret), MONGODB_URL, MONGODB_DB_NAME (default "imageEditor"), CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME.
   Currently the code reads process.env.MONOGO_URL (typo) and CLOUDINARY_CLOUD_API_KEY / CLOUDINARY_CLOUD_API_SECRET. Grep the whole repo for every process.env usage and update them all.
2. Create env.ts at the repo root (or lib/env.ts) using zod: separate `serverEnv` and `clientEnv` schemas, parse once, export typed objects, throw a readable error listing every missing/invalid variable. Server-only parts must be guarded so they cannot be imported by client components (use the "server-only" package). Replace all direct process.env reads with the validated objects. Fix the webhook route so it no longer throws at request time for a missing secret.
3. Update .env.example to the canonical names with short comments saying where each value comes from. It must contain no real values.
4. Remove: the committed Lighthouse HTML report at the repo root (localhost_*.report.html), the unused `import { subscribe } from "diagnostics_channel"` and `import { config } from "process"` in constants/index.ts, the unused `creditFee` constant, the Stripe-related declare types in types/index.d.ts (CheckoutTransactionParams, CreateTransactionParams) and any other clearly unused exports you can prove are unused with grep. Add `localhost_*.report.html` to .gitignore.
5. Rename package.json "name" to "cloudart". Do NOT change dependency versions in this task.
6. Rename aspectRatioOptions key "3:4" to "4:5" (it maps to aspectRatio "4:5") and update every usage.

Acceptance criteria:
- `grep -rn "MONOGO_URL\|CLOUDINARY_CLOUD_API" .` returns nothing outside git history.
- Starting the app with a missing/invalid variable fails immediately with a message naming the variable.
- .env.example is complete and matches env.ts exactly.
- pnpm build succeeds.
```

---

## P2: Tooling: lint, typecheck, format, hooks
Branch: `chore/tooling` · See `02-tooling-and-ci.md`

```text
Task: fix the broken lint setup and add quality scripts.

Context: package.json has "lint": "next lint" but the project is on Next 16 where `next lint` no longer exists. ESLint is v8 with legacy .eslintrc.json and eslint-config-next 14.2.13. @types/react and @types/react-dom are ^18 while React is 19.

1. Upgrade to ESLint 9 with a flat config: eslint, eslint-config-next (same major as `next`), eslint-config-prettier. Create eslint.config.mjs mirroring what `create-next-app@latest` generates for this Next version (core-web-vitals + typescript presets), plus rules: @typescript-eslint/no-explicit-any = error, @typescript-eslint/consistent-type-imports = warn, @typescript-eslint/no-unused-vars = error (ignore args starting with _), no-console = warn (allow warn and error). Ignore .next, out, build, coverage, next-env.d.ts. Delete .eslintrc.json.
2. Bump @types/react and @types/react-dom to ^19. Fix any resulting type errors.
3. Add Prettier (+ prettier-plugin-tailwindcss) with .prettierrc (printWidth 100, trailingComma all) and .prettierignore (.next, pnpm-lock.yaml, coverage, components/ui). Run it once over the repo in its own commit ("style: apply prettier") so later diffs stay readable.
4. package.json scripts: lint, lint:fix, typecheck (tsc --noEmit), format, format:check, check (lint + typecheck + format:check + test + build; skip test if none exist yet). Add "engines": { "node": ">=20.9" } and "packageManager" set to the pnpm version installed locally (run `pnpm -v`).
5. tsconfig: target ES2022, allowJs false, forceConsistentCasingInFileNames, noUncheckedIndexedAccess, noImplicitOverride, noFallthroughCasesInSwitch. Fix the errors this surfaces properly (no `!` or `as` band-aids unless justified in a comment).
6. Fix or remove every `any` in the codebase (params: any, image: any, data: any[], Record<string, any>). Use Next's generated route typing (`PageProps`, `next typegen` if available) or explicit `{ params: Promise<{...}> }` types. Define real types instead of the ambient `declare type` file where practical; keep behavior identical.
7. Remove unused dependencies after proving they are unused: `mongodb` (mongoose already includes the driver), `qs` and `@types/qs` (replace the two helpers in lib/utils.ts with URLSearchParams), `@radix-ui/react-icons` (replace usages with lucide-react equivalents), `baseline-browser-mapping` if unused. Remove the "doctor" script.
8. Husky + lint-staged: pre-commit runs lint-staged (eslint --fix + prettier --write on staged files) and `pnpm typecheck`.

Acceptance criteria: `pnpm lint`, `pnpm typecheck`, `pnpm format:check`, `pnpm build` all pass. `grep -rn ": any\|as any\|<any>" --include=*.ts --include=*.tsx .` (excluding node_modules/.next) returns nothing or only justified, commented cases.
```

---

## P3: Server actions: authorization, validation, data layer
Branch: `fix/authz-and-validation` · Fixes: S-03..S-08, S-10, S-12, B-02, B-05, B-07, B-13, B-14

```text
Task: make every server action safe. Server actions are public POST endpoints; treat every export of a "use server" file as callable by anyone.

First read db/models/*.ts and lib/actions/*.ts, app/(root)/**, components/TransformsForm.tsx, components/TrialTransformForm.tsx.

Requirements:
1. Structure: create `lib/data/users.ts` and `lib/data/images.ts` (both `import "server-only"`) containing all DB access. Keep `"use server"` files (`lib/actions/image.ts`) tiny: only addImage, updateImage, deleteImage. Move createUser/updateUser/deleteUser/getUserById logic into lib/data/users.ts (used only by the webhook route and other server code, never exported from a "use server" file). Delete getAllImages and its unused Cloudinary search entirely.
2. Identity comes ONLY from `auth()` from @clerk/nextjs/server inside the action. Remove the `userId` argument from addImage/updateImage and the `userId` prop passed from app/(root)/transforms/add/[type]/page.tsx to the form.
3. Validation: create lib/validation/image.ts with a zod schema used by BOTH the client forms and the server actions (.strict()):
   - title: trimmed string 1..80
   - transformationType: enum of the keys in constants transformationTypes
   - publicId, secureURL: must belong to our cloud (secureURL must start with `https://res.cloudinary.com/${NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/`)
   - width/height: integers 1..8000
   - prompt and color: optional, max 60 chars, allow only letters/numbers/space/#/- (regex /^[\p{L}\p{N} #-]{1,60}$/u); reject commas, slashes and colons (Cloudinary URL transformation injection)
   - aspectRatio: optional, one of the keys of aspectRatioOptions
   Do NOT accept `config` or `transformationURL` from the client: rebuild them server-side from transformationType + validated prompt/color/aspectRatio using the same constants.
4. Ownership: updateImage and deleteImage must filter by `{ _id, author: dbUser._id }`. Updates use `$set` with an allowlist of fields (never spread client input; `author`, `example`, `_id` can never be changed). If no document matches return `{ ok: false, error: "NOT_FOUND" }` (do not reveal whether the id exists for another user).
5. Return typed results: `{ ok: true, data } | { ok: false, error: "UNAUTHENTICATED" | "INVALID_INPUT" | "NOT_FOUND" | "RATE_LIMITED" | "SERVER_ERROR" }`. Never throw raw errors across the boundary. Fix updateImage's `JSON.parse(JSON.stringify(updateImage))` bug (it stringifies the function, not the result). Remove `redirect()` from `finally` in deleteImage; redirect from the caller after success.
6. Revalidation paths are hardcoded on the server, never taken from the client (remove the `path` argument).
7. Reads: add a `visibility` field ("private" | "public", default "private") to the Image schema. getImageById(id) must: validate the id with mongoose.isValidObjectId (else notFound()), allow the owner or public images only, otherwise notFound(). getUserImages must derive the user from auth(), clamp `limit` to 1..24, and use `.lean()` plus a DTO mapper instead of JSON.parse(JSON.stringify(doc)). Use a single countDocuments({ author }) in Promise.all with the page query. Return a consistent shape on error (throw and let error.tsx handle, or return the typed error result).
8. Pages: app/(root)/page.tsx and profile/page.tsx must use `auth()` (not `currentUser()`) to get the user id, and must not crash if the DB user is missing (create via the upsert helper in lib/data/users.ts). transforms/add/[type] and transforms/trial/[type] must call notFound() for an unknown type and export `dynamicParams = false` with generateStaticParams.
9. proxy.ts: invert to protect-by-default. Public: "/", "/sign-in(.*)", "/sign-up(.*)", "/transforms/trial(.*)", "/api/webhooks(.*)", "/api/health". Everything else calls auth.protect(). Remove the dead "/transforms/[id]/update(.*)" literal pattern. Keep authorization checks inside the actions/pages too (defense in depth).
10. The link to `/transformations/${id}/update` is wrong (route is /transforms). Either implement app/(root)/transforms/[id]/update/page.tsx (owner-only, reuses the form with action="Update") or remove the link and dead update code; prefer implementing it. Add a delete button with a confirmation dialog (shadcn AlertDialog) that calls deleteImage.

Acceptance criteria:
- No server action reads a user id from its arguments.
- Cross-user update/delete returns NOT_FOUND and changes nothing (P5 will add tests; add at least a manual script or TODO test names now).
- A crafted addImage call with `author`, `example`, or a foreign secureURL is rejected or ignored.
- pnpm lint, typecheck, build pass.
```

---

## P4: Webhook, user sync, Mongoose fixes
Branch: `fix/webhook-and-db` · Fixes: S-17, S-18, B-01, B-04, D-01..D-05

```text
Task: make Clerk → MongoDB user sync correct and idempotent, and fix silent DB bugs.

1. app/api/webhooks/clerk/route.ts:
   - Verify the svix signature against the RAW body: `const body = await req.text();` then `wh.verify(body, headers)`. Parse JSON only after verification. Do not re-stringify a parsed body.
   - user.created: idempotent upsert by clerkId (`findOneAndUpdate({ clerkId }, { $setOnInsert/$set... }, { upsert: true, new: true })`). Choose the primary email via `primary_email_address_id` and guard against an empty email_addresses array. Username fallback: email local part.
   - Keep updating Clerk public metadata only when needed; handle its failure without failing the whole webhook (log and continue) unless that breaks the app.
   - user.updated: apply changes and return 200 even if the user does not exist yet (upsert semantics).
   - user.deleted: delete the user's images (and, if Cloudinary credentials are available, best-effort delete their assets by publicId) then the user. Idempotent.
   - Respond with `{ ok: true }` only. Do not echo user documents. Use proper status codes: 400 invalid signature/headers, 500 on unexpected errors (so Clerk retries).
2. lib/data/users.ts (from P3): in updateUser/deleteUser the Mongoose queries are currently never awaited, so they never execute, and the code then does JSON.parse(JSON.stringify(<the function itself>)). Rewrite properly: await the queries, use .lean(), return real results, handle not-found.
3. db/mongoose.ts: use validated env (MONGODB_URL, MONGODB_DB_NAME), cache the connection on globalThis with proper typing (no `as any`), set sensible options (serverSelectionTimeoutMS ~5000), and remove the "Connected to the DB!!" log (or log once via the logger from P14 if it exists).
4. Models (read them first): ensure User.clerkId is unique+indexed, User.email unique, Image has timestamps and a compound index { author: 1, updatedAt: -1 }, and `example` cannot be set from user input paths. Type models with InferSchemaType; export DTO types. If adding unique indexes could fail on existing duplicates, write a small one-off script under scripts/ that reports duplicates instead of silently deleting.
5. next.config.mjs: change `compiler.removeConsole: true` to `{ exclude: ["error", "warn"] }` so production errors are not stripped.

Acceptance criteria: posting the same user.created payload twice yields one user; updating/deleting a user in Clerk (simulated payloads) actually changes the DB; a payload with a bad signature gets 400; build passes.
```

---

## P5: Tests
Branch: `test/foundation` · See `02-tooling-and-ci.md`

```text
Task: add a test foundation and the tests that prove the security fixes.

Install: vitest, @vitest/coverage-v8, mongodb-memory-server, @testing-library/react, @testing-library/jest-dom, jsdom, @playwright/test.

1. vitest.config.ts with alias "@" → repo root, node environment by default (jsdom for component tests via a per-file `// @vitest-environment jsdom`), setup file at tests/setup.ts. Scripts: test, test:watch, test:coverage.
2. Unit tests: lib/utils.ts (deepMergeObjects, getImageSize, URL helpers), lib/validation/image.ts (valid input; empty title; title > 80; foreign secureURL; prompt containing "a,e_blur:2000"; extra keys rejected by .strict()), env.ts (missing var → readable error).
3. Data-layer/action tests with mongodb-memory-server and a mocked `@clerk/nextjs/server` `auth()`:
   - unauthenticated addImage/updateImage/deleteImage → UNAUTHENTICATED
   - user A cannot update or delete user B's image (returns NOT_FOUND, DB unchanged)
   - mass assignment: `author` and `example` in input are rejected/ignored
   - private image is not returned to another user; public image is
   - getUserImages clamps `limit`
4. Webhook route tests: sign payloads with svix's Webhook class using a test secret. Bad signature → 400; user.created twice → 1 document; user.updated changes the name; user.deleted removes user and images.
5. Component tests (RTL): Collection empty state and pagination links; the upload trigger is keyboard accessible (if P12 already exists; otherwise skip).
6. Playwright (`playwright.config.ts`, tests in e2e/): 3 smoke tests: guest landing page renders the tools; `/transforms/add/nope` returns 404; signed-out `/profile` redirects to sign-in. Start the app with `pnpm build && pnpm start` via `webServer`. Never hit real Cloudinary or Clerk APIs in tests.
7. Coverage threshold: lib/ ≥ 70% lines (configure in vitest config).

Acceptance criteria: `pnpm test:coverage` passes locally; tests fail if you temporarily remove an ownership check (verify once by mutation, then restore).
```

---

## P6: Cloudinary hardening & rate limiting
Branch: `feat/signed-uploads-and-ratelimit` · Fixes: S-13..S-16

```text
Task: stop anonymous or malicious users from burning our Cloudinary/AI credits.

1. Signed uploads: create app/api/cloudinary/sign/route.ts (POST). It builds the params to sign (timestamp, folder "cloudart/<userId or guest-session>", the upload preset name from env `CLOUDINARY_UPLOAD_PRESET`) and returns `{ signature, timestamp, apiKey, cloudName }` using `cloudinary.utils.api_sign_request` with CLOUDINARY_API_SECRET (server only). Pass `signatureEndpoint` to <CldUploadWidget> in components/MediaUploader.tsx and remove the hardcoded uploadPreset "jsm_imaginify". Authenticated users and guests may both call it, but guests are rate limited (see 3). Add client-side options: maxFileSize (10 MB), clientAllowedFormats ["jpg","jpeg","png","webp"], multiple false, sources ["local","url","camera"] and show a toast if rejected.
2. Remove the false toast "1 credit was deducted from your account" from MediaUploader.
3. Rate limiting with @upstash/ratelimit + @upstash/redis (env: UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN; add to env.ts and .env.example). Create lib/rate-limit.ts exposing `limit(key, tier)`. Keys: Clerk userId when signed in, otherwise client IP (x-forwarded-for first entry, validated). Tiers: guest 5 uploads/hour, user 30 uploads/hour, and 60 server-action mutations/hour per user. Apply to the sign route and to addImage/updateImage/deleteImage. On limit exceed return HTTP 429 (route) or `{ ok:false, error:"RATE_LIMITED" }` (actions) and show a friendly toast with the reset time. If Upstash env vars are absent in development, fall back to an in-memory limiter and log a warning; in production missing env must fail startup via env.ts.
4. next.config.mjs images.remotePatterns: add `pathname: "/<NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME>/**"` so /_next/image only optimizes our cloud's assets.
5. Add docs/cloudinary-setup.md listing the manual dashboard steps I must do myself (you cannot do them): create the signed preset (allowed formats, max file size, fixed folder, moderation), enable "Strict transformations" and allow-list the transformations this app uses, set usage alerts. Include the exact list of transformation parameters the app generates (derive it from constants/index.ts).

Acceptance criteria: uploading without a valid signature fails; the 6th guest upload within an hour returns 429; pnpm build passes; no secret reaches the client bundle (grep the .next/static output for the API secret name).
```

---

## P7: next.config, security headers, health, error pages
Branch: `feat/hardening-and-resilience` · Fixes: S-19, O-01 (part), B-06

```text
Task: production hardening of the Next app.

1. next.config.mjs: `output: "standalone"`, `poweredByHeader: false`, `reactStrictMode: true`, keep the removeConsole exclude fix, and add async headers() for all routes: X-Content-Type-Options nosniff, X-Frame-Options DENY, Referrer-Policy strict-origin-when-cross-origin, Permissions-Policy (camera, microphone, geolocation disabled), Strict-Transport-Security max-age=63072000; includeSubDomains; preload.
2. Content-Security-Policy: implement as Content-Security-Policy-Report-Only first (via headers() or proxy.ts nonce approach, whichever works with Clerk in Next 16). Allow only what the app needs: 'self'; Clerk (Clerk documents required origins; use the frontend API domain derived from the publishable key/env, plus challenges.cloudflare.com); Cloudinary (res.cloudinary.com for images, upload-widget.cloudinary.com, widget.cloudinary.com, api.cloudinary.com); Vercel analytics (va.vercel-scripts.com); img-src also data: and blob:. Load the app, exercise sign-in, upload widget and a transformation, and list in your summary every violation you observe and how you resolved it. Leave it in Report-Only and note in docs/security.md how to flip it to enforcing.
3. app/api/health/route.ts: GET returns {status:"ok"} after a Mongo ping, 503 {status:"degraded"} otherwise; `dynamic = "force-dynamic"`; no version/env details. Add it to the public routes in proxy.ts.
4. Add app/error.tsx, app/global-error.tsx, app/not-found.tsx (styled, with a "Go home" action), and a `loading.tsx` with skeletons for the root and for transforms/[id]. Use the existing shadcn Skeleton if present or add it.
5. Metadata: add `metadataBase` from an env var (NEXT_PUBLIC_APP_URL), remove the hardcoded Vercel URL from openGraph, add app/robots.ts and app/sitemap.ts (public routes only), and app/opengraph-image.tsx (simple branded image).
6. docs/security.md: short threat model (authn, authz, input validation, upload abuse, secrets, headers, webhooks) mapping each control to the file that implements it.

Acceptance criteria: response headers visible with `curl -I`; /api/health works; unknown tool type renders the styled 404; pnpm build passes.
```

---

## P8: Docker
Branch: `chore/docker` · See `03-docker.md`

```text
Task: production-grade Docker setup. Use the target files in docs/review/03-docker.md as the baseline, adapting to what the repo actually needs.

1. Dockerfile: multi-stage (base with corepack, deps, build, runner), Node 22 alpine, BuildKit cache mount for the pnpm store, `output: "standalone"` server, non-root user (uid 1001), `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` as build ARGs (remove the hardcoded ENV values), NO server secrets anywhere in the Dockerfile, HEALTHCHECK against /api/health, `CMD ["node","server.js"]`, HOSTNAME=0.0.0.0, PORT=3000. Pin pnpm via corepack and the packageManager field.
2. .dockerignore: exclude node_modules, .next, .git, .github, all .env* except .env.example, *.md, tests, e2e, coverage, Dockerfile/compose files, editor folders. (Currently .env.docker is NOT excluded and node_modules is not excluded; fix both.)
3. docker-compose.yml: services `web` (build args from env, env_file .env, depends_on mongo healthy, restart unless-stopped, read_only with tmpfs for /tmp and /app/.next/cache, cap_drop ALL, no-new-privileges) and `mongo` (mongo:8, named volume, healthcheck via mongosh ping, port bound to 127.0.0.1 only). `web` overrides MONGODB_URL to point at the mongo service.
4. package.json scripts: docker:build, docker:up, docker:down.
5. README: replace the Docker section with the 2-command flow (`cp .env.example .env`, `docker compose up --build`), fix the reference to the non-existent `.env.docker.example`, and add a short note on running the Clerk webhook locally through a tunnel.
6. Verify and paste the output in your summary: image size (`docker image ls`), `docker run --rm <image> id` shows a non-root user, no env files inside the image (`docker run --rm <image> sh -c 'ls -a /app'`), `docker history --no-trunc` contains no secrets, compose stack reaches `healthy`. If Docker is unavailable in your environment, say so and list the exact commands I should run instead.

Acceptance criteria: image builds from a clean checkout with only the two build args; container runs as non-root; healthcheck passes; image size reported before vs after (measure the old Dockerfile first if you can).
```

---

## P9: CI/CD
Branch: `ci/pipeline` · See `02-tooling-and-ci.md` · Depends on P2, P5, P8

```text
Task: replace the advisory-only CI with a real pipeline.

1. .github/workflows/ci.yml with jobs: verify (pnpm install --frozen-lockfile, lint, typecheck, format:check, test:coverage, build), e2e (Playwright chromium, needs verify), docker (buildx build with GHA cache, build args as dummy public values, then Trivy scan failing on HIGH/CRITICAL with ignore-unfixed), security (gitleaks with fetch-depth 0, `pnpm audit --prod --audit-level=high`). Triggers: pull_request and push to the default branch. Set `permissions: contents: read` at workflow level and only widen per job when needed. Add concurrency with cancel-in-progress. Use a syntactically valid dummy Clerk publishable key so `next build` does not fail (format: pk_test_ + base64 of "example.clerk.accounts.dev$").
2. Keep the existing react-doctor workflow but leave it advisory; pin its action to a commit SHA and fix its permissions to the minimum it needs.
3. Pin every third-party action to a full commit SHA with a version comment (look up the SHAs; if you cannot verify them, use the version tags and add a TODO for me).
4. .github/dependabot.yml: npm weekly (group minor+patch), github-actions monthly, docker monthly.
5. .github/workflows/codeql.yml for javascript-typescript.
6. .github/PULL_REQUEST_TEMPLATE.md (what/why/how tested/screenshots/checklist) and ISSUE_TEMPLATEs (bug, feature).
7. README badges for CI status and coverage.
8. Write docs/branch-protection.md with the exact GitHub settings I must apply manually (require PRs, require checks verify/e2e/docker/security, no force pushes).

Acceptance criteria: workflow YAML validates (use actionlint if available); every job has a timeout-minutes; nothing in the workflows references a real secret value.
```

---

## P10: Design tokens, theming, accessibility base
Branch: `feat/design-system` · See `04-ui-ux-and-performance.md` §2, §8

```text
Task: fix the broken design system and accessibility basics WITHOUT redesigning pages yet.

1. app/globals.css: replace the malformed :root tokens (values like "\t0.63\t0.72\t0.10" are not HSL triplets) with a complete, valid token set (background, foreground, card, popover, primary, secondary, muted, accent, destructive, border, input, ring, radius) using the dark-first values from docs/review/04-ui-ux-and-performance.md §2. Add a light theme variant. Add next-themes (ThemeProvider in app/layout.tsx, defaultTheme "dark", attribute "class") and a theme toggle in the nav.
2. Delete every commented-out CSS block and unused classes (.credits-*, .profile-*, .header-nav_elements, .sidebar-nav_elements, .sidebar-nav_element, .sidebar-link etc. — verify by grep before deleting). For classes still referenced whose styles were commented out (.input-field, .select-field, .collection-card, .transformed-image, .transformation-original_image, .media-uploader_cldImage, .transforming-loader, .transformed-placeholder), replace them at the usage site with Tailwind utilities based on tokens, or restore equivalent styles using tokens.
3. tailwind.config.ts: convert to ESM (`export default {...} satisfies Config`), remove the fake `purple` (which is blue) and `dark` palettes and the unused IBMPlex font family. Replace every use of `purple-*`, `dark-*`, `text-[#…]`, `text-gray-*`, `bg-white`, `bg-yellow-*` etc. with semantic tokens (primary, accent, muted, card, foreground, destructive). Keep visual intent, improve contrast to ≥ 4.5:1 for text.
4. Accessibility base: global `:focus-visible` outline; remove every `focus-visible:ring-transparent`, `focus-visible:outline-none`, `focus-visible:border-none` and `!important` that hides focus in the CSS and components; ensure exactly one <main> per page (app/(root)/layout.tsx and pages currently nest <main>; app/(auth)/layout.tsx also has one); add a skip-to-content link; `aria-current="page"` on the active nav item (match by prefix); decorative icons get alt=""; the result image gets a meaningful alt (the image title), never "Alt"; fix `<ul><Link><li>` invalid markup in the home hero; add prefers-reduced-motion handling.
5. Icons: replace `next/image` usages of /assets/icons/*.svg for UI icons with lucide-react components (keep files in public/ only if still referenced elsewhere). Remove `priority`/`loading="eager"` from 24px icons.
6. Extract a shared <NavItem> used by SideBar and MobileNav. Remove the `isMounted` gate in SideBar so it renders on the server (only usePathname logic stays client-side). On mobile, for signed-out users, show the five trial tools as a horizontally scrollable chip row or bottom bar (currently there is no way to reach them).

Acceptance criteria: pages render with the new tokens in dark and light; tab through the home page and every interactive element shows a visible focus ring; `pnpm lint`, `typecheck`, `build` pass; run Lighthouse accessibility on `/` and report the score.
```

---

## P11: Route restructure & gallery
Branch: `feat/dashboard-gallery` · See `04-ui-ux-and-performance.md` §3, §5 · Depends on P3

```text
Task: split marketing from dashboard and make the gallery real.

1. Routes: `/` becomes a static landing page that does NOT call Clerk server APIs (no currentUser()/auth() at the top level; use <SignedIn>/<SignedOut> client components or a redirect in proxy.ts for signed-in users). Create `/dashboard` (protected) with the user's gallery. Move the Collection usage from `/` and `/profile` into `/dashboard`; keep `/profile` as account info (or redirect to /dashboard). Update navLinks, redirects after sign-in/up (NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL or the current equivalent) and every internal link.
2. Server-side search and filters: read `q`, `type`, `sort` (newest|oldest) and `page` from searchParams in the server component; query MongoDB with an escaped case-insensitive regex on title (escape user input), filter by transformationType, sort by updatedAt. Clamp page size to 12. Return { items, total, totalPages }. Ensure an index supports it.
3. Rewrite components/Collection.tsx as a presentational component with: filter chips by tool, search input (URL-driven, `useDebouncedCallback` from use-debounce, `router.replace`, initial value from the URL), link-based pagination using next/link (?page=N) instead of Buttons wrapping anchors, skeleton grid via <Suspense> fallback, and an empty state with a call to action. Remove the client-side title filtering and the `/10` page math.
4. Cards: first two cards use priority/preload (LCP), the rest lazy; `sizes` set; hover overlay with actions (Open, Download, Delete with confirm dialog + undo toast using sonner); alt text = image title; decorative tool icon alt="".
5. transforms/[id]/page.tsx: show metadata as a <dl>, keep owner-only Edit/Delete, add visibility toggle (private/public) and a "Copy link" button when public. Public images render for signed-out visitors; private ones call notFound() for non-owners (already enforced in P3, just build the UI).

Acceptance criteria: `/` makes no Clerk network calls on the server (verify with a build and a static/ISR indication in the build output); search, filters and pagination are shareable URLs; pnpm lint, typecheck, test, build pass.
```

---

## P12: Studio (merge forms, state machine, before/after, dropzone)
Branch: `feat/studio` · See `04-ui-ux-and-performance.md` §4 · Depends on P3, P6, P10

```text
Task: replace components/TransformsForm.tsx and components/TrialTransformForm.tsx (about 90% duplicated) with one studio.

1. Create app/(root)/studio/[tool]/page.tsx (unknown tool → notFound()) rendering <Studio tool={...} mode={signedIn ? "user" : "guest"} />. Keep the old routes (/transforms/add/[type], /transforms/trial/[type]) as redirects to /studio/[tool] so existing links keep working. Update navLinks and landing links.
2. State: a `useTransformation` hook using useReducer with the phases idle → uploading{pct} → ready → transforming{attempt} → done | error{message}. Remove the isSubmitting/isTransforming booleans and every `debounce(...)()` misuse (use-debounce's useDebouncedCallback). Only show the success toast when the transformed image has actually loaded. For "still generating" responses (Cloudinary may return HTTP 423 for generative effects; verify by reading the docs or testing), poll with HEAD and backoff (1s, 2s, 3s, … capped at ~60s total), with Cancel and Retry buttons. Announce phase changes in an aria-live="polite" region.
3. Dropzone: a real <button>-based dropzone that accepts click, drag-and-drop anywhere on the studio, and paste from clipboard; validates type/size before uploading; shows upload progress; keyboard accessible. Uses the signed upload flow from P6.
4. Controls: Remove/Recolor use a prompt input with suggestion chips and (recolor) a color picker with swatches (no free-text color); Generative Fill uses visual aspect-ratio cards from aspectRatioOptions; Restore/Background remove need no extra fields. All values pass through lib/validation/image.ts.
5. Canvas: implement components/BeforeAfter.tsx (pointer + keyboard slider with role="slider", aria-valuenow, ArrowLeft/ArrowRight; starter code in docs/review/04-ui-ux-and-performance.md §4). Use it in the studio after a transform completes, and on transforms/[id]/page.tsx.
6. Save/Download: guests see Save/Download disabled with an inline upgrade prompt (and the copy must be TRUE: remove claims like "standard resolution" unless implemented). Signed-in users: Save (addImage/updateImage), Download with format menu (PNG/JPG/WebP through Cloudinary `f_` param) using an improved download util (res.ok check, replaceAll for filename, revokeObjectURL, toast on failure).
7. Mobile: canvas on top, controls in a bottom sheet (shadcn Sheet/Drawer).
8. Delete the two old form components and components/CustomField.tsx if no longer used; remove the duplicated formSchema.

Acceptance criteria: one form implementation; every phase has visible UI; keyboard-only run-through works end to end; pnpm lint, typecheck, test, build pass; add RTL tests for the reducer transitions and BeforeAfter keyboard behavior.
```

---

## P13: Landing page & SEO
Branch: `feat/landing` · See `04-ui-ux-and-performance.md` §6 · Depends on P10, P12

```text
Task: build the public landing page at `/` (static).

Sections: hero (headline, one-line subhead, buttons "Try it free" → /studio/restore and "Sign in"), an auto-playing <BeforeAfter> demo using pre-generated images stored in public/demo/ (generate small optimized WebP pairs; if I have not provided real ones, create clearly-labeled placeholders and tell me exactly which files to replace), a 5-card tools grid (each with a mini before/after or icon, description, link to /studio/<tool>), "How it works" in 3 steps, FAQ (5 short Q&As: privacy, limits, formats, cost, data deletion), and a footer (GitHub link, tech credits). Remove the emoji-heavy banners. Use tokens and shadcn components only. Fully responsive; the hero must render on mobile (currently `.home` is hidden below `sm`).

SEO/perf: page-level metadata (title, description, canonical), JSON-LD SoftwareApplication, priority on the hero image only, no client-side data fetching, no Clerk server calls. Confirm in the `next build` output that `/` is static (○) and paste that line in your summary.

Acceptance criteria: Lighthouse mobile (production build) for `/`: report all four scores; Performance ≥ 90 target (report honestly if not reached and why); accessibility ≥ 95; no layout shift.
```

---

## P14: Observability
Branch: `feat/observability` · Fixes: O-01

```text
Task: production error visibility.

1. Add pino for server-side structured logging: lib/logger.ts (JSON in production, pretty in development), redact authorization headers, cookies, emails. Replace console.error/console.log usage on the server with logger calls; keep removeConsole exclude for error/warn.
2. Add @sentry/nextjs using the official wizard/config for Next 16 (client, server, edge as needed): DSN from env (SENTRY_DSN, NEXT_PUBLIC_SENTRY_DSN, SENTRY_AUTH_TOKEN for source maps only in CI), disabled when DSN is absent, tracesSampleRate 0.1, scrub PII, ignore common noise (ResizeObserver, network aborts). Wire it into error.tsx/global-error.tsx and the typed action error path (report SERVER_ERROR only).
3. Add @vercel/speed-insights or report Web Vitals via the analytics already installed.
4. Add all new env vars to env.ts and .env.example (optional in dev, required only if you decide so in prod).
5. docs/observability.md: what is logged, where errors go, how to trigger a test error, what to check after a deploy.

Acceptance criteria: a deliberately thrown error in a server action shows up (locally) as a structured log line and, with a DSN configured, in Sentry; no PII in logs; build passes.
```

---

## P15: README & docs
Branch: `docs/readme` · See `05-recruiter-polish-and-roadmap.md` · Do last

```text
Task: rewrite README.md and add project docs. Be accurate: only describe what exists in the code; if something is not built yet, put it under Roadmap.

README order: title + one-line pitch + badges (CI, coverage, license, live demo) → hero screenshot/GIF placeholders with exact filenames in docs/media/ that I will fill in → Live demo + "try as guest" → Features → Architecture (the Mermaid flowchart from docs/review/05, adjusted to reality) + "How a transformation works" in 5 lines → Key engineering decisions (short ADR-style bullets with the why: Clerk + webhook sync, signed uploads + strict transformations, server-side authorization and zod at every boundary, guest mode with rate limits, standalone non-root Docker) → "What I changed compared to the tutorial baseline" (one honest paragraph; ask me for the wording if unsure) → Security summary → Quick start with Docker Compose (3 commands) and without Docker (pnpm) → environment variable table (name, required, where to get it; generated from env.ts) → Scripts table → Testing → Performance (leave [X] placeholders for measured numbers) → Known limitations & roadmap → License and credits.

Also create: docs/ARCHITECTURE.md (data model diagram in Mermaid, request flows for upload→transform→save and webhook sync), docs/adr/0001-clerk-webhook-sync.md, docs/adr/0002-signed-uploads-and-rate-limits.md, docs/adr/0003-standalone-docker.md (Context / Decision / Consequences, each under 25 lines), SECURITY.md (how to report a vulnerability), CONTRIBUTING.md (setup, scripts, commit convention, PR checklist), LICENSE (MIT, my name as in package.json/GitHub, ask if unknown), docs/metrics.md (table with Before / After columns for: Docker image size, Lighthouse mobile perf/LCP, count of `any`, test count/coverage, CI duration — fill what can be measured now, leave the rest as TBD).

Fix stale facts: Next.js 16 (not 15), Node ≥ 20.9 (not 18), the correct env names, the correct Docker flow.

Acceptance criteria: every command in the README runs on a clean clone; every path referenced exists; a markdown link check (e.g. lychee or markdown-link-check) passes if available.
```

---

## Manual checklist (things an agent can't do for you)

- [ ] Rotate Cloudinary, Atlas, Clerk (secret + webhook) credentials; remove `0.0.0.0/0` from Atlas
- [ ] Cloudinary dashboard: signed preset, strict transformations, usage alerts (P6 writes the steps)
- [ ] Clerk: production instance + custom domain, webhook endpoint URL, allowed redirect URLs
- [ ] Upstash Redis database (free tier is fine) → env vars
- [ ] Sentry project + DSN
- [ ] GitHub: branch protection, Dependabot alerts, secret scanning + push protection
- [ ] Vercel: env vars per environment, production domain, spending alerts
- [ ] Capture screenshots/GIF/video and the real Lighthouse numbers
