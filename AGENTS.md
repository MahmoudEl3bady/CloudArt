# CloudArt

AI image editor (restore, recolor, remove objects, fill, remove background).
Next.js 16 App Router, React 19, TypeScript strict, Tailwind v3 + shadcn/ui,
Clerk auth, MongoDB via Mongoose, Cloudinary. Package manager: pnpm. Node >= 20.9.

## Layout

- `app/(root)`, `app/(auth)`: pages. `app/api/webhooks/clerk/route.ts`: Clerk user sync.
- `lib/actions/`: server actions (`image.ts`, `user.ts`). Public endpoints, treat as such.
- `db/`: Mongoose connection and models. `components/`: UI. `components/ui/`: shadcn (don't hand-edit).
- `constants/`, `types/`, `hooks/`, `proxy.ts` (Next 16 replacement for middleware).
- Imports use the `@/*` alias from the repo root (there is no `src/`).

## Commands

- `pnpm dev` / `pnpm build`
- Target scripts: `pnpm lint` · `pnpm typecheck` · `pnpm format:check` · `pnpm test`
- `pnpm check` runs all of them. Run it before saying a task is done.
- Some of these don't exist yet (task P2 adds them). If a script is missing, say so; never invent it.

## Rules

- Plan first for anything touching more than 2 files. Show the plan and wait for approval.
- One task = one branch = small Conventional Commits (feat/fix/chore/refactor/test/docs/ci).
- Don't touch files unrelated to the task. Don't upgrade unrelated dependencies.
- No new `any`, no `@ts-ignore`, no `as` casts to silence errors without a comment saying why.
- Never read, print, copy or commit secrets. Don't open `.env*` other than `.env.example`.
- Server actions are public endpoints: identity from `auth()` only, validate with zod,
  filter queries by owner, return typed results. Use the `server-action-review` skill.
- Env vars are read only through the validated `env.ts` (once P1 lands). Canonical DB var: `MONGODB_URL`.
- Never delete or weaken a test to make it pass. If a test is wrong, say so and explain.
- If the code contradicts a task description or a review report, stop and report. Don't improvise.
- Models in `db/models/*` were not part of the original review. Read them before changing data code.

## Review reports

Findings live in `docs/review/` (IDs like S-04, B-01). Task prompts: `docs/review/06-agent-prompts.md`
(P1..P15). Mention finding IDs in commit bodies.

## Done means

Commands you ran + their results, files touched, anything skipped or uncertain.
