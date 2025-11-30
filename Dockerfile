
FROM node:22-alpine


WORKDIR /app


RUN npm install -g pnpm


COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile


COPY . .

ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_bGlnaHQtYW50ZWxvcGUtNDguY2xlcmsuYWNjb3VudHMuZGV2JA
ENV NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=dhazag4ow

RUN pnpm  build


EXPOSE 3000


CMD ["pnpm", "start"]

