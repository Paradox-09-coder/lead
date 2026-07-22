import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { FACEBOOK_OAUTH_STATE_COOKIE, getFacebookRedirectUri } from "@/lib/facebook-oauth";

export const runtime = "nodejs";

// Kicks off "Facebook bilan ulash": redirects the browser to Facebook's OAuth
// consent dialog. Any logged-in LeadSync user can start this — Facebook's own
// callback (below) attaches the resulting Page connection to whoever's
// session cookie comes back with the redirect.
//
// This is a Business-type app, so permissions are bundled server-side into a
// "Login Configuration" (App Dashboard > Facebook Login for Business >
// Configurations) rather than listed as a raw `scope` string.
export async function GET(request: NextRequest) {
  const appId = process.env.FB_APP_ID;
  const configId = process.env.FB_LOGIN_CONFIG_ID;
  if (!appId || !configId) {
    return NextResponse.json({ error: "FB_APP_ID yoki FB_LOGIN_CONFIG_ID sozlanmagan" }, { status: 500 });
  }

  const state = crypto.randomBytes(16).toString("hex");

  const authorizeUrl = new URL("https://www.facebook.com/v25.0/dialog/oauth");
  authorizeUrl.searchParams.set("client_id", appId);
  authorizeUrl.searchParams.set("redirect_uri", getFacebookRedirectUri(request.nextUrl.origin));
  authorizeUrl.searchParams.set("config_id", configId);
  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("override_default_response_type", "true");

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set(FACEBOOK_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return response;
}
