import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import { User } from "@/db/models/user.model";
import { connectToDatabase } from "@/db/mongoose";
import { clerkClient } from "@clerk/nextjs/server";
import { deleteUser, updateUser } from "@/lib/actions/user";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    throw new Error(
      "Please add WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local"
    );
  }

  // Get the headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Error occurred -- no svix headers", {
      status: 400,
    });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your secret.
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return new Response("Error occurred", {
      status: 400,
    });
  }

  // Handle the event
  const { id } = evt.data;
  const eventType = evt.type;

  if (eventType === "user.created") {
    const { id, email_addresses, image_url, first_name, last_name } = evt.data;

    const userName = email_addresses[0].email_address.split("@")[0];
    const user = {
      clerkId: id,
      email: email_addresses[0].email_address,
      firstName: first_name,
      lastName: last_name,
      username: userName,
      photo: image_url,
    };

    try {
      await connectToDatabase();
      const newUser = await User.create(user);

      // Set public metadata
      const clerkClientInstance = await clerkClient();
      await clerkClientInstance.users.updateUserMetadata(id, {
        publicMetadata: {
          userId: newUser._id,
        },
      });

      return Response.json({ message: "OK", user: newUser });
    } catch (error) {
      console.error("Error processing user creation:", error);
      return new Response("Error occurred while processing user creation", {
        status: 500,
      });
    }
  }

  if (eventType === "user.updated") {
    const { image_url, first_name, last_name, id } = evt.data;
    const user = {
      firstName: first_name,
      lastName: last_name,
      photo: image_url,
    };
    try {
      const updatedUser = await updateUser(id, user as UpdateUserParams);
      return NextResponse.json({ message: "OK", user: updatedUser });
    } catch (error) {
      console.error("Error processing user creation:", error);
      return new Response("Error occurred while processing user creation", {
        status: 500,
      });
    }
  }

  if (eventType === "user.deleted") {
    const { id } = evt.data;
    try {
      const deletedUser = await deleteUser(id!);
      return NextResponse.json({ message: "OK", user: deletedUser });
    } catch (error) {
      console.error("Error processing user creation:", error);
      return new Response("Error occurred while processing user creation", {
        status: 500,
      });
    }
  }

  // Return a default response for unhandled event types
  return new Response("Webhook received", { status: 200 });
}
