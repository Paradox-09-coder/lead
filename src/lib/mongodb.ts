import mongoose from "mongoose";

declare global {
  var _mongooseConn:
    | { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null }
    | undefined;
}

// Serverless functions can be invoked concurrently and reuse warm containers,
// so the connection (and in-flight connect promise) is cached on `globalThis`
// to avoid opening a new MongoDB connection per invocation.
const cached = globalThis._mongooseConn ?? { conn: null, promise: null };
globalThis._mongooseConn = cached;

export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;

  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("MONGO_URI environment variable is not set");

  if (!cached.promise) {
    cached.promise = mongoose.connect(uri);
  }
  cached.conn = await cached.promise;
  return cached.conn;
}
