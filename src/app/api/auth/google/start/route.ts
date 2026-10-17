import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { GOOGLE_OAUTH_STATE_COOKIE, getGoogleRedirectUri } from "@/lib/google-oauth";
import { appBaseUrl } from "@/lib/app-url";

export const runtime = "nodejs";

// "Google bilan kirish": sends the browser to Google's consent screen. The same
// flow serves both login and sign-up — the callback creates the account if needed.
export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    const loginUrl = new URL("/login", appBaseUrl(request.nextUrl.origin));
    loginUrl.searchParams.set("error", "Google orqali kirish sozlanmagan (GOOGLE_CLIENT_ID)");
    return NextResponse.redirect(loginUrl);
  }

  const state = crypto.randomBytes(16).toString("hex");

  const authorizeUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("redirect_uri", getGoogleRedirectUri(request.nextUrl.origin));
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("scope", "openid email profile");
  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.searchParams.set("prompt", "select_account");

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return response;
}
