---
name: pr-description
description: Use when the user asks for a pull request description or summary of a branch in CloudArt.
---

# PR description

Run `git log master..HEAD --oneline` (use the repo's default branch) and `git diff master...HEAD --stat`.
Write: **What / Why / How tested / Risks / Screenshots needed**. Reference finding IDs (S-xx, B-xx).
Keep it under 25 lines. No marketing language.
