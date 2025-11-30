# CloudArt

CloudArt is a powerful Next.js application that leverages AI to transform and edit images with ease using the Cloudinary API.
<br>
**DEMO**
https://www.loom.com/share/d3236a803a824f9cab1671e207fec793

## Features

- **AI-Powered Image Transformations:**
  - Image Restoration & Enhancement
  - Background Removal
  - Generative Fill (AI outpainting)
  - Object Removal
  - Object Recolor
- **Webhooks & Real-time Updates**
  - CloudArt uses webhooks for real-time user management and data synchronization.
- **Docker support for consistent deployment**

## Tech Stack

- Next.js 15
- TypeScript
- MongoDB
- Cloudinary
- Clerk Authentication
- Tailwind CSS
- Shadcn-UI

## Prerequisites

- [Node.js](https://nodejs.org/) version 18 or higher
- [MongoDB](https://www.mongodb.com/try/download/community) database instance
- [Cloudinary](https://cloudinary.com/users/register/free) account with API credentials
- [Clerk](https://dashboard.clerk.dev/sign-up) account for authentication

## Getting Started

## Setup with Docker

### 1. Clone the Repository

```
git clone https://github.com/MahmoudEl3bady/CloudArt.git
cd CloudArt
```

### 2. Add Environment Variables

```
cp .env.docker.example .env.docker
```

Edit `.env.docker` and fill in:

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
WEBHOOK_SECRET=

MONGODB_URL=

CLOUDINARY_URL=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
```

## External Services Configuration

### MongoDB

- Add your server IP or `0.0.0.0/0` temporarily for testing.

### Clerk

- Add a webhook endpoint pointing to `/api/webhooks/clerk`
- Copy webhook secret into `.env.docker`

## Build and Run with Docker

```
docker build -t cloudart .
docker run -d   --name cloudart-app   -p 3000:3000   --env-file .env.docker   --restart unless-stopped   cloudart
```

Check logs:

```
docker logs -f cloudart-app
```

Visit:

```
http://localhost:3000
```

Rebuild after changes:

```
docker stop cloudart-app && docker rm cloudart-app
docker build --no-cache -t cloudart .
docker run -d --name cloudart-app -p 3000:3000 --env-file .env.docker cloudart
```
