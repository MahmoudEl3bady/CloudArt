# CloudArt review: start here

Reviewed: ~50 files / ~5,300 lines from `cloudArt.txt` (app router pages, components, server actions, config, Docker, CI, a Lighthouse report).

**Not in the archive, so not reviewed:** `db/models/*` (user + image schemas), `components/ui/*` (shadcn), `public/`, the `transforms/[id]/update` page (linked to, but doesn't exist in what you sent). Anything that depends on those is marked "verify".

---

## Do this today (before anything else)

Your `.env.docker` was in the upload and contains live credentials: Cloudinary API key + secret, a MongoDB Atlas connection string with the password in it, a Clerk secret key, and the Clerk webhook signing secret. It's gitignored, but:

- `.dockerignore` doesn't exclude it, so `COPY . .` bakes it into every image you build.
- It's now in a chat transcript.

So treat all of them as burned:

1. **Cloudinary:** generate a new API key/secret pair, revoke the old one.
2. **MongoDB Atlas:** change that DB user's password (or make a new user), and remove any `0.0.0.0/0` network rule.
3. **Clerk:** roll the secret key, and rotate the webhook signing secret on the endpoint.
4. Check history: `git log --all --oneline -- .env.docker`. If anything shows up, purge with `git filter-repo --path .env.docker --invert-paths` and force-push. Rotation matters more than the purge.
5. Also delete `localhost_2025-12-07_09-42-00.report.html` from the repo root (570 KB Lighthouse dump).

---

## Honest verdict

Good bones: Next 16 App Router, Clerk auth with a `proxy.ts`, webhook-based user sync, a guest trial flow (smart for conversion), `next/dynamic` for heavy widgets, a Dockerfile, CI already exists.

What a reviewer would catch in 10 minutes:

- **Server actions trust the client.** `addImage` takes `userId` from the browser, `updateImage`/`deleteImage` have no auth or ownership check. Anyone can edit or delete anyone's image.
- **Several "features" don't actually work:** webhook user update/delete never run (missing `await`), `updateImage` throws after saving, the Update link points to a route that doesn't exist, `MONOGO_URL` typo means the documented env var doesn't work.
- **Cost-abuse exposure** on an AI product: unsigned Cloudinary upload preset, unrestricted transformations, no rate limiting, guests can trigger all of it.
- **Tooling is broken/absent:** `next lint` doesn't exist in Next 16, ESLint config is v8-era, no typecheck/test/format scripts, CI only runs an advisory scanner.
- **Docker works but isn't production-grade:** single stage, root user, dev deps shipped, secrets copied in, `node_modules` not ignored.
- **Reads as template-derived:** `jsm_imaginify`, `creditFee`, Stripe types, "1 credit was deducted" with no credit system. Recruiters have seen the tutorial this pattern comes from. You'll want your own decisions visible (see report 05).

All fixable. Realistically two focused weekends.

---

## Rough scorecard (my judgment, not a measurement)

| Area | Now | Target |
|---|---|---|
| Security / authz | 3/10 | 8/10 |
| Correctness | 4/10 | 8/10 |
| Tooling / CI | 3/10 | 9/10 |
| Docker | 4/10 | 9/10 |
| UI / UX | 5/10 | 8/10 |
| Tests | 0/10 | 7/10 |
| Docs / presentation | 5/10 | 9/10 |

Lighthouse (mobile, from your committed report, run against `localhost` dev server on 2025-12-07): Performance 38, Accessibility 96, Best Practices 77, SEO 91. Perf is pessimistic (dev mode, Clerk dev-instance handshake redirects) but the LCP finding is real, see report 04.

---

## Top 12 fixes, in order

1. Rotate secrets (above).
2. Add `auth()` + ownership checks + zod validation to every server action; stop accepting `userId` from the client (S-03..S-08).
3. Fix the `await` / return bugs in `updateUser`, `deleteUser`, `updateImage` (B-01, B-02).
4. Fix env names + add a validated `env.ts` that fails fast at boot (B-03).
5. Fix webhook to verify against the raw body (`req.text()`), make it idempotent (S-17, S-18).
6. Lock down Cloudinary: signed uploads, strict transformations, restrict `remotePatterns` to your cloud (S-13, S-14, S-16).
7. Rate-limit guest trial + uploads (S-15).
8. Replace broken lint setup; add `typecheck`, `test`, `format`, CI that runs them (report 02).
9. Multi-stage non-root Docker with standalone output + compose + healthcheck (report 03).
10. Fix the design tokens in `globals.css` and restore focus rings (report 04).
11. Before/after slider + proper transform state machine (the "wow" feature).
12. Rewrite README with architecture diagram, screenshots, live demo (report 05).

---

## Files

| File | What's in it |
|---|---|
| `01-security-and-code-review.md` | Every finding with ID, severity, location, fix |
| `02-tooling-and-ci.md` | package.json scripts, ESLint/Prettier/Husky, Vitest/Playwright, CI workflow |
| `03-docker.md` | Docker audit + drop-in Dockerfile / compose / .dockerignore |
| `04-ui-ux-and-performance.md` | Design-system fixes, UX flow, a11y, Lighthouse, component changes |
| `05-recruiter-polish-and-roadmap.md` | README plan, features that impress, resume bullets, interview prep |
| `06-agent-prompts.md` | Copy-paste prompts for a coding agent (P1..P14), one per chore |

**Suggested workflow:** put these files in `docs/review/` in the repo, then paste prompts from file 06 into your coding agent one at a time, in order. Each prompt ends with commands the agent must run to prove it worked. Review every diff yourself: you need to be able to explain each change in an interview.
