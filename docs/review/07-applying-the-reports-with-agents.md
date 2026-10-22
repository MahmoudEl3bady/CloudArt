# 07: Applying the CloudArt reports with agentic coding

How to go from "7 markdown reports" to "merged, tested, deployed project", using an agent (Claude Code, OpenCode, Copilot agent mode, Codex...) without losing control of the code.

Config formats below are for Claude Code, since that's the one I can describe most exactly. OpenCode and Copilot read the same `AGENTS.md` and skill folders; their agent/hook/permission config differs (table in §9). Check each tool's current docs before copying settings.

---

## 0. The idea in one picture

```
reports (what's wrong)  ──►  AGENTS.md + skills (how we work here)
          │                              │
          ▼                              ▼
   prompts P1..P15  ──►  [plan → implement → verify → review] per branch ──► PR ──► merge
                                   ▲                                │
                                   └── you read every diff ◄────────┘
```

Reports are the backlog. `AGENTS.md` and skills are the rules the agent carries into every session. The loop is the same for every task. You are the reviewer and the one who decides.

---

## 1. Before the agent touches anything (manual, ~1 hour)

The agent can't do these, and some must come first:

1. **Rotate the leaked credentials** (Cloudinary, Atlas, Clerk secret + webhook). See `00-START-HERE.md`. If you skip this, nothing else matters.
2. **Check git history for secrets:** `git log --all --oneline -- .env.docker`. If it ever got committed, purge it (`git filter-repo`) after rotating.
3. **Create a clean working copy.** Fresh branch from `master`: `git switch -c chore/agent-setup`.
4. **Put the reports in the repo:** `docs/review/00-START-HERE.md` … `06-agent-prompts.md` (+ this file). The agent reads them from disk, so you don't paste anything.
5. **Capture baselines now** (you'll want before/after numbers for the README and your resume). Save them in `docs/metrics.md`:
   - `docker build -t cloudart:before .` then `docker image ls cloudart:before` (size)
   - Lighthouse mobile on your deployed production URL (not localhost dev)
   - `grep -rnE ": any|as any|<any>" --include=*.ts --include=*.tsx . --exclude-dir=node_modules --exclude-dir=.next | wc -l`
   - Whether `pnpm lint` works at all (expect: fails on Next 16)
6. **Make sure you can run the app locally** with valid `.env` values (new rotated ones). An agent can't verify a feature in a project that won't start.

---

## 2. `AGENTS.md`: the always-on rules

Create it at the repo root. Keep it short; every line is paid for in every session. Replace the prompts' "Global rules" block with this, so you don't paste it each time.

```markdown
# CloudArt

AI image editor. Next.js 16 (App Router), TypeScript strict, Tailwind v3 + shadcn/ui,
Clerk auth, MongoDB (Mongoose), Cloudinary. Package manager: pnpm. Node >= 20.9.

## Commands
- `pnpm dev` / `pnpm build`
- `pnpm lint` · `pnpm typecheck` · `pnpm format:check` · `pnpm test`
- `pnpm check` runs everything. Run it before saying a task is done.
(If a script doesn't exist yet, say so; don't invent it.)

## Rules
- Plan first for anything touching more than 2 files. Show the plan and wait for approval.
- One task = one branch = small Conventional Commits (feat/fix/chore/refactor/test/docs/ci).
- Don't touch files unrelated to the task. Don't upgrade unrelated dependencies.
- No new `any`, no `@ts-ignore`, no `as` casts to silence errors without a comment saying why.
- Never read, print, copy or commit secrets. Don't open `.env*` other than `.env.example`.
- Server actions are public endpoints: identity from `auth()` only, validate with zod,
  filter queries by owner, return typed results. See the `server-action-review` skill.
- Never delete or weaken a test to make it pass. If a test is wrong, say so and explain.
- If the code contradicts a task description, stop and report. Don't improvise.

## Review reports
Findings live in `docs/review/` (IDs like S-04, B-01). Task prompts are in
`docs/review/06-agent-prompts.md` (P1..P15). Mention finding IDs in commit bodies.

## Done means
Commands you ran + results, files touched, anything skipped or uncertain.
```

If you also use Claude Code, add a one-line `CLAUDE.md`: `@AGENTS.md` (Claude Code's import syntax) or symlink it: `ln -s AGENTS.md CLAUDE.md`. One source of truth.

Maintain it like code: whenever you catch the agent making the same mistake twice, add one line. When it stops making a mistake, delete the line.

---

## 3. Guardrails: permissions and hooks

Goal: the agent can run your checks freely, can't read secrets, and formatting/typechecking happen automatically.

`.claude/settings.json` (Claude Code; commit it):

```json
{
  "permissions": {
    "allow": [
      "Bash(pnpm lint)",
      "Bash(pnpm lint:fix)",
      "Bash(pnpm typecheck)",
      "Bash(pnpm test:*)",
      "Bash(pnpm build)",
      "Bash(pnpm format:check)",
      "Bash(git status)",
      "Bash(git diff:*)",
      "Bash(git log:*)"
    ],
    "deny": [
      "Read(./.env)",
      "Read(./.env.*)",
      "Read(./.env.docker)",
      "Bash(git push:*)",
      "Bash(rm -rf:*)"
    ]
  }
}
```

`.env.example` must stay readable, so if your tool's deny pattern also blocks it, add an explicit allow. Pushing stays manual: you push after reviewing.

A hook that runs the formatter after every edit (the agent can't forget it):

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [{ "type": "command", "command": "pnpm exec prettier --write --ignore-unknown \"$CLAUDE_FILE_PATHS\" >/dev/null 2>&1 || true" }]
      }
    ]
  }
}
```

Hook inputs and variables differ between versions (some pass a JSON payload on stdin instead of an env var). If this one doesn't fire, read the hooks section of the docs for your version, or simplify: run `pnpm format` at the end of each task instead.

Start with these two. Don't add hooks you don't understand. A broken hook that fails every edit wastes a whole session.

Later (week 3+): a `PreToolUse` hook that blocks edits to `.env*`, and a `Stop` hook that runs `pnpm typecheck` before the agent can finish.

---

## 4. Skills worth creating for this project

Skills = procedures the agent loads when the task matches. Each lives in `.claude/skills/<name>/SKILL.md` (or `.opencode/skills/`, `.github/skills/`, or the shared `.agents/skills/`). The `name` should match the folder name. The `description` is what triggers it, so make it specific.

### 4.1 `server-action-review`

```markdown
---
name: server-action-review
description: Use when creating or editing a Next.js server action, route handler or data-layer function in CloudArt. Enforces auth, ownership, validation and typed results.
---

# Server action checklist

1. Identity: `const { userId } = await auth()` inside the action. Never accept a user id argument.
2. Validate: parse input with the shared zod schema in `lib/validation/` (`.strict()`).
   Never accept `config` or URLs the client could forge; rebuild them server-side.
3. Authorize: every read/write of user data filters by owner, e.g. `{ _id, author: dbUser._id }`.
   Updates use `$set` with an allowlist. Never spread client input into a query/update.
4. Return `{ ok: true, data } | { ok: false, error: "UNAUTHENTICATED" | "INVALID_INPUT" | "NOT_FOUND" | "RATE_LIMITED" | "SERVER_ERROR" }`. Don't throw across the boundary.
5. Revalidation paths are hardcoded on the server.
6. Not-found and not-yours look identical to the caller.
7. Add or update a test proving user B cannot read/modify user A's data.

Finish with: `pnpm lint && pnpm typecheck && pnpm test`.
```

### 4.2 `task-workflow`

```markdown
---
name: task-workflow
description: Use when starting a P-numbered task from docs/review/06-agent-prompts.md or any multi-file change in CloudArt. Defines plan, implement, verify and report steps.
---

# Task workflow

1. Read the matching prompt in `docs/review/06-agent-prompts.md` and the finding IDs it cites
   in `docs/review/01-security-and-code-review.md`.
2. Read the real code first (files named in the prompt). Note anything that contradicts the prompt.
3. Write a plan: files to change, order, risks, how you'll verify. STOP and wait for approval.
4. Implement in small commits (Conventional Commits; mention finding IDs).
5. Verify: run lint, typecheck, test, build (those that exist). Fix what you broke.
6. Self-review `git diff` for: deleted/weakened tests, new `any`/casts, new deps, files outside scope,
   swallowed errors, leftover console.log.
7. Report: summary, files, commands + results, skipped/uncertain items, follow-ups.
```

### 4.3 `pr-description`

```markdown
---
name: pr-description
description: Use when the user asks for a pull request description or summary of a branch in CloudArt.
---

# PR description

Run `git log main..HEAD --oneline` (use the repo's default branch) and `git diff main...HEAD --stat`.
Write: **What / Why / How tested / Risks / Screenshots needed**. Reference finding IDs (S-xx, B-xx).
Keep it under 25 lines. No marketing language.
```

### 4.4 `docker-verify`

```markdown
---
name: docker-verify
description: Use after changing Dockerfile, docker-compose.yml, .dockerignore or next.config output settings in CloudArt, to verify the image.
---

# Docker verification

Run and report the output of each (skip and say so if Docker is unavailable):
1. `docker build -t cloudart:test --build-arg NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=... --build-arg NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=... .`
2. `docker image ls cloudart:test` (size)
3. `docker run --rm cloudart:test id` (must not be root)
4. `docker run --rm cloudart:test sh -c 'ls -a /app'` (no .env files)
5. `docker history --no-trunc cloudart:test` and check no secrets appear in layers
6. `docker compose up -d`, wait, confirm the web container becomes healthy, then `docker compose down`
```

Test each skill once: run a task with and without it. If the agent ignores it, the fix is almost always a more specific `description`.

---

## 5. A read-only reviewer sub-agent

A fresh agent that didn't write the code reviews it better than the author does. `.claude/agents/security-reviewer.md`:

```markdown
---
name: security-reviewer
description: Reviews a diff or branch for security and correctness problems in CloudArt. Read-only. Use before merging any task branch.
tools: Read, Grep, Glob, Bash
---

You are a skeptical code reviewer. You never edit files.

Review `git diff <base>...HEAD`. Check against docs/review/01-security-and-code-review.md:
- authz: identity from auth(), owner-filtered queries, no mass assignment
- validation: zod at every boundary, no client-supplied config/URLs
- secrets: nothing sensitive added, logged or sent to the client
- weakened or deleted tests, new `any`/casts, new dependencies
- behavior changes not mentioned in the task

Output: findings ranked by severity, each with file:line, why it matters, and a suggested fix.
If you find nothing, say what you checked.
```

Use it like: `Use the security-reviewer agent on this branch against main.` In tools without sub-agents, open a second, clean session and paste: "Review `git diff main...HEAD` as a skeptical security reviewer; don't edit."

---

## 6. The loop for every task (use it P1 through P15)

**Step 1: new branch, clean session.** `git switch -c <branch from the prompt>` and start a fresh agent session (or `/clear`).

**Step 2: explore + plan (read-only).** Don't paste the prompt text. Point at it:

```text
Use the task-workflow skill. Task: P3 from docs/review/06-agent-prompts.md.
Related findings: S-03..S-08, S-10, S-12, B-02, B-05, B-07 in docs/review/01-security-and-code-review.md.
Don't edit anything yet. Read the code the prompt names (including db/models/*) and give me:
a plan, what in the code contradicts or complicates the prompt, and open questions.
```

**Step 3: read the plan.** This is the highest-value minute of the whole task. Check: does it touch only the right files? Does it find the models? Did it spot anything the report got wrong? Push back: "split this into two commits", "don't add that dependency", "answer question 2 as X".

**Step 4: implement.** "Approved. Implement step by step, committing after each step." For big prompts (P3, P12) say: "Do steps 1–4 only, then stop and report."

**Step 5: verify (you + agent).**
- Agent runs: lint, typecheck, test, build.
- You run the app and exercise the feature by hand.
- For security tasks, do a **mutation check**: temporarily remove the ownership filter, confirm the test fails, restore it. A test that can't fail proves nothing.

**Step 6: independent review.** Run the `security-reviewer` agent (or a clean session) on the branch. Fix real findings; ignore noise.

**Step 7: you read the diff.** `git diff main...HEAD`. Per-diff checklist:
- [ ] Only files relevant to the task changed
- [ ] No deleted or loosened tests
- [ ] No new `any`, `as`, `@ts-ignore`, `eslint-disable`
- [ ] No new dependency you didn't expect
- [ ] No swallowed errors (`catch {}` that returns success)
- [ ] No secrets, no `console.log`
- [ ] You can explain every changed function out loud

**Step 8: PR + merge.** Ask the agent to use the `pr-description` skill, push yourself, open a PR even though you're the only dev, let CI run (once P9 exists), squash-merge. The PR history is portfolio material.

**Step 9: log it.** Two lines in `docs/agent-log.md`: what worked, what the agent got wrong. That log becomes your interview answers about working with AI.

---

## 7. Order, dependencies and what to check by hand

Do the manual rotation from §1 first. Then:

| # | Prompt | Branch | Needs | Parallel-safe? | Your manual check |
|---|---|---|---|---|---|
| 1 | P1 env + hygiene | `chore/env-and-hygiene` | none | no (do first) | App refuses to boot with a missing var; `.env.example` matches `env.ts` |
| 2 | P2 tooling | `chore/tooling` | P1 | no | `pnpm lint`, `typecheck`, `format:check`, `build` all green; hook on commit works |
| 3 | P3 authz + validation | `fix/authz-and-validation` | P1, P2 | no | Try editing/deleting someone else's image from two accounts: must fail |
| 4 | P4 webhook + DB | `fix/webhook-and-db` | P3 | no (touches the same `lib/data/users.ts`) | Change your name in Clerk: DB updates. Delete a test user: DB row gone |
| 5 | P5 tests | `test/foundation` | P3, P4 | no | Mutation check on the ownership tests |
| 6 | P6 signed uploads + rate limit | `feat/signed-uploads-and-ratelimit` | P3 | no | Needs Upstash + Cloudinary dashboard steps from you; 6th guest upload gets 429 |
| 7 | P7 headers, health, error pages | `feat/hardening-and-resilience` | P6 | no | `curl -I` shows headers; CSP stays Report-Only until the console is clean |
| 8 | P8 Docker | `chore/docker` | P7 (health route, standalone) | **yes, with 10** | Run the `docker-verify` skill; record image size before/after |
| 9 | P9 CI | `ci/pipeline` | P2, P5, P8 | after 8 | Open a PR; all jobs run; fix the dummy-key build if it fails |
| 10 | P10 design system + a11y | `feat/design-system` | P2 | **yes, with 8** | Tab through every page: focus ring visible; dark and light both look right |
| 11 | P11 dashboard + gallery | `feat/dashboard-gallery` | P3, P10 | no (shares components with 12) | Search/filter/page URLs shareable; `/` is static in build output |
| 12 | P12 studio | `feat/studio` | P3, P6, P10, P11 | no | Keyboard-only run: upload → transform → compare → save |
| 13 | P13 landing + SEO | `feat/landing` | P10, P12 | after 12 | Production Lighthouse numbers recorded |
| 14 | P14 observability | `feat/observability` | P4, P7 | can slot in anywhere after 7 | Throw a test error; see it in logs/Sentry |
| 15 | P15 README + docs | `docs/readme` | everything | last | Every README command works on a clean clone |

Why those can't run in parallel: P3/P4 both rewrite the user data layer, P11/P12 both rewrite gallery and form components, and merge conflicts in AI-written code are expensive to untangle. P8 (Dockerfile, compose) and P10 (CSS, nav, components) share almost no files, so they're the safe pair.

Practical pace: P1–P2 in one sitting. P3 alone deserves a day with careful review. P12 is the biggest; ask the agent to split it (dropzone → state machine → before/after → merge forms) into separate PRs.

---

## 8. Parallel sessions with git worktrees (for P8 + P10, and later)

```bash
git switch master && git pull
git worktree add ../cloudart-docker  -b chore/docker
git worktree add ../cloudart-design  -b feat/design-system
# terminal 1: cd ../cloudart-docker  → agent session for P8
# terminal 2: cd ../cloudart-design  → agent session for P10
# each needs its own pnpm install and .env
```

Rules: one task per worktree, separate sessions, merge one PR at a time, rebase the second onto master after the first lands. Clean up with `git worktree remove ../cloudart-docker`. Only parallelize when the file sets don't overlap.

---

## 9. Same plan in OpenCode or Copilot

| Piece | Claude Code | OpenCode | Copilot |
|---|---|---|---|
| Rules | `CLAUDE.md` (import `@AGENTS.md`) | `AGENTS.md` | `AGENTS.md` and `.github/copilot-instructions.md` |
| Skills | `.claude/skills/` | `.opencode/skills/` (also reads Claude-style paths) | `.github/skills/` (via supported versions/CLI) |
| Sub-agents | `.claude/agents/*.md` | its own agent config; or just use a second session | custom agents/chat modes, varies by version |
| Permissions / hooks | `.claude/settings.json` | its own config file | editor/tool settings |
| Plan-first | plan mode | plan agent/mode | ask for a plan in chat before "agent mode" |

If a feature is missing, the fallback is always the same: write the plan in a message, review it, then say "implement"; open a clean session for review. The workflow survives without any special feature. The portable parts are `AGENTS.md`, skills, scripts, tests and CI.

---

## 10. When it goes wrong

| Symptom | Likely cause | Fix |
|---|---|---|
| Agent "finishes" but nothing works | No checkable definition of done | Prompts in 06 end with commands to run; insist it shows their output |
| Same mistake after you corrected it twice | Polluted context | New session; put the lesson in `AGENTS.md` |
| Huge diff, unrelated changes | No scope given, or prompt too big | Revert, re-run with "only touch X, Y"; split the prompt into steps |
| Tests pass but a test looks pointless | Agent wrote tests that can't fail | Mutation check (remove the guard, test must fail) |
| Agent invented a script, package or API | Hallucination under uncertainty | "Check `package.json`/docs; if it doesn't exist, say so." Verify versions on npm |
| Skill never triggers | `description` too vague | Rewrite it as "Use when ..." with concrete file/task words |
| Prompt conflicts with the real code | Reports were written from a partial archive (models, `components/ui` weren't included) | That's what the plan step is for; decide, then update the report |
| Context gets slow/sloppy mid-task | Window filling | Commit, `/clear`, start the next step with a short summary |
| CI fails only on build | Env var read at import time | Move the read into the request path rather than adding secrets to the build |
| Agent wants to run something destructive | Auto-approve too loose | Tighten permissions; deny pushes and `rm -rf` |

Hard stops (never delegate): rotating secrets, Cloudinary/Clerk/Atlas dashboard settings, branch protection, deciding what ships.

---

## 11. Turn the work into interview evidence

Keep `docs/metrics.md` with before/after (only numbers you measured):

| Metric | Before | After |
|---|---|---|
| Docker image size | | |
| Docker runs as non-root | no | yes |
| Lighthouse mobile perf / LCP (prod) | | |
| `any` count | | 0 |
| Server actions with auth + ownership checks | 0 of 3 | 3 of 3 |
| Tests / coverage on `lib/` | 0 | |
| CI checks required to merge | 0 | |

And be ready for the honest "how did you use AI" question. A good answer: *"I wrote the rules and the review checklist, had the agent plan before it coded, required it to run lint/typecheck/tests, used a separate reviewer session, and read every diff. It got X wrong (from `agent-log.md`), here's how I caught it."* That signals judgment, which is what hiring managers are actually probing for.

---

## 12. Suggested schedule

| When | Do |
|---|---|
| Day 1 | §1 manual steps, `AGENTS.md`, settings, one skill. Run P1. |
| Day 2 | P2. Confirm `pnpm check` works. Add `task-workflow` skill. |
| Days 3–4 | P3, with the reviewer sub-agent. Mutation-check the authz tests. |
| Day 5 | P4, P5. |
| Week 2 | P6, P7, then P8 + P10 in parallel worktrees, then P9 CI. |
| Week 3 | P11, P12 (split into several PRs), P14. |
| Week 4 | P13, P15, production deploy, real Lighthouse numbers, screenshots, demo video. |

Faster is possible, but the point of week 1 is learning the loop; speed comes from the loop, not from skipping the review.

---

## 13. Quick-start card (print this)

1. `git switch -c <branch>` · fresh session
2. "Use task-workflow. Task Pn from docs/review/06-agent-prompts.md. Plan only."
3. Read and correct the plan
4. "Approved, implement step by step, commit each step"
5. Agent runs `pnpm check`; you run the app
6. Mutation check (security tasks)
7. `security-reviewer` on the branch
8. You read `git diff main...HEAD`
9. PR, CI, merge
10. Two lines in `agent-log.md`
