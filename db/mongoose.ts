import mongoose, { Mongoose } from "mongoose";
import { serverEnv } from "@/lib/env.server";

interface MongooseConnection {
  conn: Mongoose | null;
  promise: Promise<Mongoose> | null;
}

let cached: MongooseConnection = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = {
    conn: null,
    promise: null,
  };
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
