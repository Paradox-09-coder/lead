import { NextRequest, NextResponse } from "next/server";
import { LOCALE_COOKIE, isLocale } from "@/i18n/config";

export const runtime = "nodejs";

// Sets the user's locale cookie. Called by the language switcher.
export async function POST(request: NextRequest) {
  const { locale } = (await request.json().catch(() => ({}))) as { locale?: string };
  if (!isLocale(locale)) {
    return NextResponse.json({ error: "invalid locale" }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true, locale });
  response.cookies.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  return response;
}
