import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Connection } from "@/models/Connection";
import { getSessionUserId } from "@/lib/server-session";
import { FACEBOOK_GRAPH_VERSION, FACEBOOK_OAUTH_STATE_COOKIE, getFacebookRedirectUri } from "@/lib/facebook-oauth";
import { appBaseUrl } from "@/lib/app-url";

export const runtime = "nodejs";

interface FacebookPage {
  id: string;
  name: string;
  access_token: string;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const oauthError = searchParams.get("error_message") ?? searchParams.get("error");

  const dashboardUrl = new URL("/dashboard/connections", appBaseUrl(request.nextUrl.origin));

  if (oauthError) {
    dashboardUrl.searchParams.set("facebook_error", oauthError);
    return NextResponse.redirect(dashboardUrl);
  }

  const expectedState = request.cookies.get(FACEBOOK_OAUTH_STATE_COOKIE)?.value;
  if (!code || !state || !expectedState || state !== expectedState) {
    dashboardUrl.searchParams.set("facebook_error", "Xavfsizlik tekshiruvi muvaffaqiyatsiz");
    return NextResponse.redirect(dashboardUrl);
  }

  const userId = await getSessionUserId();
  if (!userId) {
    dashboardUrl.searchParams.set("facebook_error", "Avval saytga kiring");
    return NextResponse.redirect(dashboardUrl);
  }

  const appId = process.env.FB_APP_ID;
  const appSecret = process.env.FB_APP_SECRET;
  if (!appId || !appSecret) {
    dashboardUrl.searchParams.set("facebook_error", "Server sozlanmagan (FB_APP_ID/FB_APP_SECRET)");
    return NextResponse.redirect(dashboardUrl);
  }

  try {
    const tokenUrl = new URL(`https://graph.facebook.com/${FACEBOOK_GRAPH_VERSION}/oauth/access_token`);
    tokenUrl.searchParams.set("client_id", appId);
    tokenUrl.searchParams.set("redirect_uri", getFacebookRedirectUri(request.nextUrl.origin));
    tokenUrl.searchParams.set("client_secret", appSecret);
    tokenUrl.searchParams.set("code", code);

    const tokenResponse = await fetch(tokenUrl);
    const tokenBody = (await tokenResponse.json()) as {
      access_token?: string;
      error?: { message: string };
    };
    if (!tokenResponse.ok || !tokenBody.access_token) {
      throw new Error(tokenBody.error?.message ?? "Access token olinmadi");
    }

    // The code exchange returns a short-lived (~1h) user token, and Page tokens
    // fetched with it expire just as fast. Swapping it for a long-lived user
    // token first makes /me/accounts return long-lived Page tokens.
    const longLivedUrl = new URL(`https://graph.facebook.com/${FACEBOOK_GRAPH_VERSION}/oauth/access_token`);
    longLivedUrl.searchParams.set("grant_type", "fb_exchange_token");
    longLivedUrl.searchParams.set("client_id", appId);
    longLivedUrl.searchParams.set("client_secret", appSecret);
    longLivedUrl.searchParams.set("fb_exchange_token", tokenBody.access_token);

    const longLivedResponse = await fetch(longLivedUrl);
    const longLivedBody = (await longLivedResponse.json()) as {
      access_token?: string;
      error?: { message: string };
    };
    if (!longLivedResponse.ok || !longLivedBody.access_token) {
      throw new Error(longLivedBody.error?.message ?? "Uzoq muddatli token olinmadi");
    }

    const pagesUrl = new URL(`https://graph.facebook.com/${FACEBOOK_GRAPH_VERSION}/me/accounts`);
    pagesUrl.searchParams.set("access_token", longLivedBody.access_token);
    const pagesResponse = await fetch(pagesUrl);
    const pagesBody = (await pagesResponse.json()) as {
      data?: FacebookPage[];
      error?: { message: string };
    };
    if (!pagesResponse.ok) {
      throw new Error(pagesBody.error?.message ?? "Sahifalar ro'yxati olinmadi");
    }

    const pages = pagesBody.data ?? [];
    if (pages.length === 0) {
      dashboardUrl.searchParams.set("facebook_error", "Boshqaradigan Facebook sahifangiz topilmadi");
      return NextResponse.redirect(dashboardUrl);
    }

    await connectDB();
    for (const page of pages) {
      // Re-connecting updates the existing record for that page instead of duplicating it.
      await Connection.findOneAndUpdate(
        { user: userId, platform: "facebook", pageId: page.id },
        { label: page.name || page.id, pageAccessToken: page.access_token },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      );

      // Tells Facebook to send "leadgen" webhook events for this Page to our
      // app-level webhook URL. Harmless to call even before that URL is
      // configured in the App Dashboard — it just means nothing gets
      // delivered until then. Failure here shouldn't block the connection.
      try {
        const subscribeUrl = new URL(`https://graph.facebook.com/${FACEBOOK_GRAPH_VERSION}/${page.id}/subscribed_apps`);
        subscribeUrl.searchParams.set("subscribed_fields", "leadgen");
        subscribeUrl.searchParams.set("access_token", page.access_token);
        await fetch(subscribeUrl, { method: "POST" });
      } catch {
        // Non-fatal — the Page connection itself already succeeded.
      }
    }

    dashboardUrl.searchParams.set("facebook_connected", String(pages.length));
  } catch (error) {
    dashboardUrl.searchParams.set(
      "facebook_error",
      error instanceof Error ? error.message : "Facebook ulanishida xatolik",
    );
  }

  const response = NextResponse.redirect(dashboardUrl);
  response.cookies.delete(FACEBOOK_OAUTH_STATE_COOKIE);
  return response;
}
