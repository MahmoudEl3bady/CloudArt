---
name: server-action-review
description: Use when creating or editing a Next.js server action, route handler or data-layer function in CloudArt (lib/actions, app/api, db). Enforces auth, ownership, validation and typed results.
---

# Server action checklist

1. Identity: `const { userId } = await auth()` inside the action. Never accept a user id argument.
2. Validate: parse input with the shared zod schema in `lib/validation/` (`.strict()`).
   Never accept `config` or URLs the client could forge; rebuild them server-side.
3. Authorize: every read/write of user data filters by owner, e.g. `{ _id, author: dbUser._id }`.
   Updates use `$set` with an allowlist. Never spread client input into a query or update.
4. Return `{ ok: true, data } | { ok: false, error: "UNAUTHENTICATED" | "INVALID_INPUT" | "NOT_FOUND" | "RATE_LIMITED" | "SERVER_ERROR" }`. Don't throw across the boundary.
5. Revalidation paths are hardcoded on the server.
6. Not-found and not-yours look identical to the caller.
7. Add or update a test proving user B cannot read or modify user A's data.

Finish with: `pnpm lint && pnpm typecheck && pnpm test`.
