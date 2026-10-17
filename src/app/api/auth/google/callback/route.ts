import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { createSessionToken, SESSION_COOKIE_NAME, sessionCookieOptions } from "@/lib/session";
import { GOOGLE_OAUTH_STATE_COOKIE, getGoogleRedirectUri } from "@/lib/google-oauth";
import { appBaseUrl } from "@/lib/app-url";

export const runtime = "nodejs";

interface GoogleUserInfo {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
}

export async function GET(request: NextRequest) {
  const origin = appBaseUrl(request.nextUrl.origin);
  const searchParams = request.nextUrl.searchParams;

  function fail(message: string) {
    const loginUrl = new URL("/login", origin);
    loginUrl.searchParams.set("error", message);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete(GOOGLE_OAUTH_STATE_COOKIE);
    return response;
  }

  // The user pressed "Cancel" on Google's screen.
  if (searchParams.get("error")) return fail("Google orqali kirish bekor qilindi");

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const expectedState = request.cookies.get(GOOGLE_OAUTH_STATE_COOKIE)?.value;
  if (!code || !state || !expectedState || state !== expectedState) {
    return fail("Xavfsizlik tekshiruvi muvaffaqiyatsiz, qayta urinib ko'ring");
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return fail("Google orqali kirish sozlanmagan");

  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: getGoogleRedirectUri(request.nextUrl.origin),
        grant_type: "authorization_code",
      }),
    });
    const tokenBody = (await tokenResponse.json()) as { access_token?: string; error_description?: string };
    if (!tokenResponse.ok || !tokenBody.access_token) {
      return fail(tokenBody.error_description ?? "Google'dan token olinmadi");
    }

    // Fetched server-to-server over TLS straight from Google, so the profile
    // can be trusted without verifying the id_token signature ourselves.
    const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${tokenBody.access_token}` },
    });
    const profile = (await profileResponse.json()) as GoogleUserInfo;
    if (!profileResponse.ok || !profile.sub || !profile.email) {
      return fail("Google profil ma'lumotlari olinmadi");
    }
    if (!profile.email_verified) {
      return fail("Google akkauntingizdagi email tasdiqlanmagan");
    }

    await connectDB();
    const email = profile.email.toLowerCase();
    let user = await User.findOne({ googleId: profile.sub });
    if (!user) {
      // An existing email+password account with the same (Google-verified)
      // email is linked rather than duplicated.
      user = await User.findOne({ email });
      if (user) {
        user.googleId = profile.sub;
        await user.save();
      } else {
        user = await User.create({
          fullName: profile.name?.trim() || email.split("@")[0],
          email,
          googleId: profile.sub,
        });
      }
    }

    const sessionToken = await createSessionToken({
      role: user.role,
      userId: user._id.toString(),
      email: user.email,
      fullName: user.fullName,
    });

    const response = NextResponse.redirect(new URL("/dashboard", origin));
    response.cookies.set(SESSION_COOKIE_NAME, sessionToken, sessionCookieOptions);
    response.cookies.delete(GOOGLE_OAUTH_STATE_COOKIE);
    return response;
  } catch (error) {
    console.error("[google-oauth] callback failed", error);
    return fail("Google orqali kirishda xatolik");
  }
}
