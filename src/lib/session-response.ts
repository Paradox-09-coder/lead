import { NextResponse } from "next/server";
import type { UserDocument } from "@/models/User";
import { createSessionToken, SESSION_COOKIE_NAME, sessionCookieOptions } from "@/lib/session";

// A JSON response that also signs the user in (sets the session cookie), the
// same session a password login gives.
export async function jsonWithSession(user: UserDocument, body: unknown, init?: ResponseInit): Promise<NextResponse> {
  const token = await createSessionToken({
    role: user.role,
    userId: user._id.toString(),
    email: user.email,
    fullName: user.fullName,
  });
  const response = NextResponse.json(body, init);
  response.cookies.set(SESSION_COOKIE_NAME, token, sessionCookieOptions);
  return response;
}
