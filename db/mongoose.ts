import mongoose, { Mongoose } from "mongoose";
import { serverEnv } from "@/lib/env.server";

interface MongooseConnection {
  conn: Mongoose | null;
  promise: Promise<Mongoose> | null;
}

// Survive Next.js dev-mode hot reloads by keeping the connection on globalThis.
const globalWithMongoose = globalThis as typeof globalThis & {
  mongoose?: MongooseConnection;
};

const cached: MongooseConnection = globalWithMongoose.mongoose ?? { conn: null, promise: null };

if (!globalWithMongoose.mongoose) {
  globalWithMongoose.mongoose = cached;
}

export const connectToDatabase = async () => {
  if (cached.conn) return cached.conn;

  cached.promise =
    cached.promise ||
    mongoose.connect(serverEnv.MONGODB_URL, {
      dbName: serverEnv.MONGODB_DB_NAME,
      bufferCommands: false,
    });

  cached.conn = await cached.promise;
  console.log("Connected to the DB!!");
  return cached.conn;
};
