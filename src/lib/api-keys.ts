import crypto from "node:crypto";
import type { NextRequest } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { ApiKey } from "@/models/ApiKey";

export const API_KEY_PREFIX = "lsk_";

export function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

export function generateApiKey(): { key: string; prefix: string; keyHash: string } {
  const key = `${API_KEY_PREFIX}${crypto.randomBytes(24).toString("hex")}`;
  return { key, prefix: key.slice(0, 12), keyHash: hashApiKey(key) };
}

function readKey(request: NextRequest): string | null {
  const authorization = request.headers.get("authorization");
  if (authorization?.toLowerCase().startsWith("bearer ")) {
    return authorization.slice(7).trim() || null;
  }
  return request.headers.get("x-api-key")?.trim() || null;
}

// Authenticates a public-API request by its `Authorization: Bearer <key>` (or
// `X-API-Key`) header. Returns the owning user's id, or null if the key is
// missing or unknown.
export async function authenticateApiKey(request: NextRequest): Promise<string | null> {
  const key = readKey(request);
  if (!key || !key.startsWith(API_KEY_PREFIX)) return null;

  await connectDB();
  const apiKey = await ApiKey.findOneAndUpdate(
    { keyHash: hashApiKey(key) },
    { lastUsedAt: new Date() },
  );
  return apiKey ? apiKey.user.toString() : null;
}
