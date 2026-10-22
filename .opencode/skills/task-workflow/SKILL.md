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
