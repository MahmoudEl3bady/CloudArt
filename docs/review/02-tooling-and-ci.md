# 02: Tooling, scripts, linting, tests, CI

## What's wrong today

| Problem | Detail |
|---|---|
| `"lint": "next lint"` is dead | `next lint` was removed in Next 16. Run `pnpm lint` once; expect it to fail. `next build` also stopped linting for you. |
| ESLint setup is from the Next 14 era | `eslint ^8`, `eslint-config-next 14.2.13`, `.eslintrc.json` (legacy config). Next 16 ships flat-config presets and wants ESLint 9. |
| No `typecheck` script | `strict: true` is on (good) but nothing runs `tsc`. Types also drift: `@types/react ^18` vs React 19. |
| No `test`, `format`, `check` scripts | Zero tests, no Prettier, no pre-commit hooks. |
| CI is advisory only | The only workflow is `react-doctor` and it never fails a PR. Nothing runs lint/typecheck/build/docker. |
| No `engines` / `packageManager` | Node 18 in README vs Next 16's Node ≥ 20.9; Dockerfile does `npm i -g pnpm` (floating version). |
| Package identity | `"name": "image-transformer"`, version `0.1.0`. Rename to `cloudart`. |
| `doctor` script | `npx react-doctor@latest` floats. Pin it or drop the script and keep the CI action. |

---

## Target `package.json` (scripts + meta)

Set `packageManager` to whatever `pnpm -v` prints locally.

```json
{
  "name": "cloudart",
  "version": "1.0.0",
  "private": true,
  "engines": { "node": ">=20.9" },
  "packageManager": "pnpm@<your-version>",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "typecheck": "tsc --noEmit",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "check": "pnpm lint && pnpm typecheck && pnpm format:check && pnpm test && pnpm build",
    "docker:build": "docker compose build",
    "docker:up": "docker compose up -d",
    "prepare": "husky"
  }
}
```

Dev deps to add: `eslint@^9`, `eslint-config-next@^16` (match your `next`), `eslint-config-prettier`, `prettier`, `prettier-plugin-tailwindcss`, `husky`, `lint-staged`, `vitest`, `@vitest/coverage-v8`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`, `mongodb-memory-server`, `@playwright/test`, `@types/react@^19`, `@types/react-dom@^19`.
Remove: `mongodb`, `qs`, `@types/qs`, `@radix-ui/react-icons` (after switching usages to `lucide-react`), `baseline-browser-mapping` if nothing needs it.

---

## `eslint.config.mjs`

Match what `npx create-next-app@latest` generates for your Next version; roughly:

```js
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  globalIgnores([".next/**", "out/**", "build/**", "coverage/**", "next-env.d.ts"]),
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": "warn",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
]);
```

You have ~25 `any`s (`params: any`, `image: any`, `data: any[]`, `Record<string, any>`). Turning `no-explicit-any` to `error` makes the cleanup measurable, which is a nice story: "removed all `any`, enabled strict lint".

Delete `.eslintrc.json`. The two rules you turned off (`react/no-unescaped-entities`, `no-page-custom-font`) can stay in the new config if they still fire.

## `tsconfig.json` tweaks

```jsonc
{
  "compilerOptions": {
    "target": "ES2022",
    "allowJs": false,
    "forceConsistentCasingInFileNames": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

`noUncheckedIndexedAccess` will surface real bugs (`email_addresses[0]`, `transformationTypes[type]`). Enable it and fix what breaks.

Also replace the global `declare type` file (`types/index.d.ts`) with module types derived from zod schemas (`z.infer`), one source of truth for form, action and DB layer.

## Prettier

`.prettierrc`

```json
{ "semi": true, "singleQuote": false, "trailingComma": "all", "printWidth": 100, "plugins": ["prettier-plugin-tailwindcss"] }
```

`.prettierignore`: `.next`, `pnpm-lock.yaml`, `coverage`, `components/ui` (optional, keeps shadcn diffs clean).

## Husky + lint-staged

```bash
pnpm dlx husky init   # creates .husky/pre-commit
```

`.husky/pre-commit`

```sh
pnpm lint-staged
pnpm typecheck
```

`package.json`

```json
"lint-staged": {
  "*.{ts,tsx,js,mjs}": ["eslint --fix", "prettier --write"],
  "*.{json,md,css,yml}": ["prettier --write"]
}
```

Add a `gitleaks` step (pre-commit via `gitleaks protect --staged` if installed, always in CI). You just learned why.

Optional: `commitlint` with Conventional Commits. Recruiters skim `git log`; clean history reads as professional.

---

## Testing plan (fast wins first)

1. **Unit (Vitest):** `lib/utils.ts` (`deepMergeObjects`, `formUrlQuery`, `removeKeysFromQuery`, `getImageSize`), zod schemas (valid/invalid/injection strings like `a,e_blur:2000`), env validation.
2. **Server actions / data layer (Vitest + `mongodb-memory-server`, mock `@clerk/nextjs/server`):**
   - unauthenticated call → `UNAUTHENTICATED`
   - user A cannot update/delete user B's image (this is the test that proves you fixed S-04/S-05)
   - `updateUser`/`deleteUser` actually persist (regression for B-01)
   - mass-assignment: passing `author`/`example` is ignored
3. **Webhook route:** feed a payload signed with `svix` test helpers; assert 400 on bad signature, upsert idempotency on double delivery.
4. **Component tests (RTL):** `Collection` empty state + pagination links, `MediaUploader` disabled/keyboard behavior.
5. **E2E (Playwright), 3 smoke tests:** (a) guest opens `/`, picks a trial tool, sees the upload area; (b) invalid `/transforms/add/nope` → 404; (c) signed-out visit to `/profile` redirects to sign-in. Mock Cloudinary network calls. Don't call real AI in CI.

Target: ~60–70% coverage on `lib/`, and put the badge in the README. Coverage of UI isn't the point; covering authz is.

`vitest.config.ts`

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: { environment: "node", globals: true, setupFiles: ["./tests/setup.ts"] },
  resolve: { alias: { "@": path.resolve(__dirname, ".") } },
});
```

---

## CI: `.github/workflows/ci.yml`

Keep `react-doctor` as a separate advisory job if you like it. Pin third-party actions to commit SHAs once it works.

```yaml
name: CI
on:
  pull_request:
  push:
    branches: [master]

permissions:
  contents: read

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

env:
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: pk_test_ZXhhbXBsZS5jbGVyay5hY2NvdW50cy5kZXYk   # dummy, format-valid
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: demo

jobs:
  verify:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v5
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm format:check
      - run: pnpm test:coverage
      - run: pnpm build

  e2e:
    needs: verify
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v5
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec playwright install --with-deps chromium
      - run: pnpm test:e2e

  docker:
    needs: verify
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: docker/setup-buildx-action@v3
      - uses: docker/build-push-action@v6
        with:
          context: .
          push: false
          load: true
          tags: cloudart:ci
          build-args: |
            NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=${{ env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY }}
            NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=${{ env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
      - uses: aquasecurity/trivy-action@0.28.0   # pin to a SHA
        with:
          image-ref: cloudart:ci
          severity: HIGH,CRITICAL
          exit-code: "1"
          ignore-unfixed: true

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
        with: { fetch-depth: 0 }
      - uses: gitleaks/gitleaks-action@v2
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm audit --prod --audit-level=high
```

Also add:
- `.github/dependabot.yml` (npm weekly grouped, github-actions monthly, docker monthly)
- `codeql.yml` (default CodeQL for JavaScript/TypeScript)
- Branch protection on `master`: require `verify`, `e2e`, `docker` to pass; require PRs.
- (Nice) `lighthouse-ci` against a Vercel preview with a perf budget, so your Lighthouse score becomes a tracked number instead of a stale HTML file.
- (Nice) Vercel preview deployments per PR; put the link in the PR template.
- `.github/PULL_REQUEST_TEMPLATE.md` and issue templates.

If the build complains about a missing secret at `next build`, don't add it as `ENV`; check whether some module reads it at import time and move that read into the request path.
