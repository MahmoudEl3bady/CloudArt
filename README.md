# CloudArt 

CloudArt is a powerful Next.js application that leverages AI to transform and edit images with ease using the Cloudinary API.

## Features

- **AI-Powered Image Transformations:**
  - Image Restoration & Enhancement
  - Background Removal
  - Generative Fill (AI outpainting)
  - Object Removal
  - Object Recolor
- **Webhooks & Real-time Updates**
  - CloudArt uses webhooks for real-time user management and data synchronization.
   
##  Tech Stack

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

1. Clone and install:
   ```bash
   git clone https://github.com/MahmoudEl3bady/CloudArt.git
   cd CloudArt
   npm install

2. Configure environment variables:
    ```
    NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
    NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
    MONOGO_URL=your_mongodb_url
    WEBHOOK_SECRET=your_clerk_webhook_secret
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_key
    CLERK_SECRET_KEY=your_clerk_secret
    CLOUDINARY_API_KEY=your_cloudinary_key
    CLOUDINARY_API_SECRET=your_cloudinary_secret
    CLOUDINARY_CLOUD_NAME=your_cloudinary_name
