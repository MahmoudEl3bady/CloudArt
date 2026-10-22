---
name: docker-verify
description: Use after changing Dockerfile, docker-compose.yml, .dockerignore or next.config output settings in CloudArt, to verify the image.
---

# Docker verification

Run and report the output of each (skip and say so if Docker is unavailable):
1. `docker build -t cloudart:test --build-arg NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_dummy --build-arg NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=dummy .`
2. `docker image ls cloudart:test` (size)
3. `docker run --rm cloudart:test id` (must not be root)
4. `docker run --rm cloudart:test sh -c 'ls -a /app'` (no .env files)
5. `docker history --no-trunc cloudart:test` and check no secrets appear in layers
6. `docker compose up -d`, wait, confirm the web container becomes healthy, then `docker compose down`
