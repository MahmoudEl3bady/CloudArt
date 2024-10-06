import mongoose, { Mongoose } from "mongoose";

const MONGODB_URL = process.env.MONOGO_URL;

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
  console.log("MONGODB_URL", MONGODB_URL);
  if (!MONGODB_URL) throw new Error("Missing MONGODB_URL");

  cached.promise =
    cached.promise ||
    mongoose.connect(MONGODB_URL, {
      dbName: "imageEditor",
      bufferCommands: false,
    });

  cached.conn = await cached.promise;
  console.log("Connected to the DB!!");
  return cached.conn;
};
