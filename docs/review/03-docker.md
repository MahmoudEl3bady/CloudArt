# 03: Docker review

## What you have

Single-stage `node:22-alpine`: install pnpm globally, `pnpm install --frozen-lockfile`, `COPY . .`, hardcoded `ENV NEXT_PUBLIC_*`, `pnpm build`, `CMD ["pnpm","start"]`. README runs it with `docker run --env-file .env.docker`.

It works. It isn't production-grade.

## Findings

| # | Sev | Problem | Why it matters |
|---|---|---|---|
| K-01 | Critical | `.dockerignore` doesn't exclude `.env.docker` (its patterns are `.env`, `.env.local`, `.env*.local`; none match `.env.docker`) | `COPY . .` bakes live secrets into an image layer. |
| K-02 | High | `node_modules` **not** in `.dockerignore` | If a host `node_modules` exists, `COPY . .` overwrites the container's install with host binaries (wrong platform for `sharp`, etc.) and slows the build context. |
| K-03 | High | Runs as **root** | Any RCE = root in the container. |
| K-04 | High | Single stage: dev dependencies, source, pnpm store, `.next/cache` all ship | Image is huge (typically 1 GB+ vs ~150–200 MB standalone), bigger attack surface. |
| K-05 | Medium | No `output: "standalone"` in `next.config` | That's what enables a tiny runtime image. |
| K-06 | Medium | `CMD ["pnpm","start"]` | pnpm becomes PID 1 and doesn't forward SIGTERM well → slow/ungraceful stops. Run `node server.js` directly. |
| K-07 | Medium | `RUN npm install -g pnpm` | Floating pnpm version, non-reproducible. Use Corepack + `packageManager` in `package.json`. |
| K-08 | Medium | Hardcoded `ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...` and cloud name | Image is tied to one Clerk instance; changing means editing the Dockerfile. Publishable keys aren't secret, but use `ARG`s. |
| K-09 | Medium | No `HEALTHCHECK`, no `/api/health` route | Orchestrators can't tell "up" from "hung". |
| K-10 | Medium | No layer/build cache strategy | Every code change reinstalls if the lockfile layer is invalidated by `COPY . .` ordering; no BuildKit cache mounts. |
| K-11 | Low | README references `.env.docker.example` (doesn't exist), `docker-compose.yml` is listed in `.dockerignore` but doesn't exist | Onboarding breaks on step 2. |
| K-12 | Low | Base image not pinned by digest, no vulnerability scan | Add Trivy in CI (report 02). |
| K-13 | Low | Docker path hard-depends on Atlas | Add a local Mongo service in compose so anyone can `docker compose up` with zero cloud accounts (except Clerk + Cloudinary). |

## Drop-in files

### `next.config.mjs` (relevant part)

```js
export default {
  output: "standalone",
  // …rest from report 01 (headers, images.remotePatterns, removeConsole exclude)
};
```

### `app/api/health/route.ts`

```ts
import mongoose from "mongoose";
import { connectToDatabase } from "@/db/mongoose";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectToDatabase();
    await mongoose.connection.db?.admin().ping();
    return Response.json({ status: "ok" });
  } catch {
    return Response.json({ status: "degraded" }, { status: 503 });
  }
}
```

Add `/api/health` to the public routes in `proxy.ts`. Keep the response boring: no versions, no env, no error details.

### `Dockerfile`

```dockerfile
# syntax=docker/dockerfile:1.7
ARG NODE_VERSION=22-alpine

FROM node:${NODE_VERSION} AS base
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    NEXT_TELEMETRY_DISABLED=1
RUN corepack enable
WORKDIR /app

# 1) deps: cached until the lockfile changes
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

# 2) build
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Public, non-secret values are inlined into the client bundle at build time
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY \
    NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=$NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
RUN pnpm build

# 3) runtime: only what's needed, non-root
FROM node:${NODE_VERSION} AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs nextjs

COPY --from=build --chown=nextjs:nodejs /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "server.js"]
```

Notes:
- Secrets (`CLERK_SECRET_KEY`, DB URL, Cloudinary secret, webhook secret) are **never** `ARG`/`ENV` in the Dockerfile. They come in at `docker run`/compose time.
- If `next build` genuinely needs a server secret at build time, use `RUN --mount=type=secret,id=...`, not `ENV`. First check why; usually a module reads env at import time and should read it lazily.
- If `public/` doesn't exist the `COPY` fails; create it (you have `/assets/...` so it exists).
- `HOSTNAME=0.0.0.0` matters: standalone `server.js` binds to it, and the healthcheck needs to reach it.

### `.dockerignore`

```gitignore
node_modules
.next
out
build
dist
coverage

.git
.github
.vscode
.idea

.env
.env.*
!.env.example

*.log
.DS_Store
*.pem

Dockerfile
docker-compose*.yml
.dockerignore

*.md
localhost_*.report.html
tests
e2e
```

### `docker-compose.yml`

```yaml
services:
  web:
    build:
      context: .
      args:
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: ${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
        NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: ${NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}
    env_file: .env
    environment:
      MONGODB_URL: mongodb://mongo:27017/imageEditor   # overrides .env for local compose
    ports:
      - "3000:3000"
    depends_on:
      mongo:
        condition: service_healthy
    restart: unless-stopped
    read_only: true
    tmpfs:
      - /tmp
      - /app/.next/cache
    cap_drop: [ALL]
    security_opt:
      - no-new-privileges:true

  mongo:
    image: mongo:8
    volumes:
      - mongo-data:/data/db
    ports:
      - "127.0.0.1:27017:27017"   # localhost only; local dev, no auth
    healthcheck:
      test: ["CMD", "mongosh", "--quiet", "--eval", "db.adminCommand('ping')"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

volumes:
  mongo-data:
```

`read_only` + `tmpfs` can trip if Next wants to write elsewhere; if it does, look at the actual error and add that path to `tmpfs` rather than dropping `read_only`. The local Mongo has no auth: fine for dev, not a prod topology. For prod stay on Atlas with least-privilege user + IP allowlist.

### README "Docker" section (replace the current one)

```bash
cp .env.example .env        # fill in Clerk + Cloudinary values
docker compose up --build   # http://localhost:3000, health: /api/health
```

Clerk webhook locally: expose with a tunnel (`cloudflared`/`ngrok`), point the Clerk webhook endpoint at `/api/webhooks/clerk`, paste the signing secret into `.env`.

## How to verify (paste these into a PR description)

```bash
docker build -t cloudart --build-arg NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=... --build-arg NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=... .
docker image ls cloudart                                # expect a few hundred MB at most, not 1 GB+
docker run --rm cloudart id                             # uid=1001(nextjs), not root
docker run --rm cloudart sh -c 'ls -a /app | grep -i env || echo "no env files in image"'
docker history --no-trunc cloudart | grep -i -E 'clerk_secret|mongodb\+srv|cloudinary://' || echo "no secrets in layers"
docker compose up -d && sleep 20 && docker inspect --format '{{.State.Health.Status}}' $(docker compose ps -q web)   # healthy
trivy image --severity HIGH,CRITICAL cloudart
```

Put the before/after image size in the README. It's the kind of concrete number that reads well.
