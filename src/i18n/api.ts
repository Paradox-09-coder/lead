import { NextResponse } from "next/server";
import { getLocale } from "./server";
import { translateMessage } from "./messages";

// NextResponse.json for `{ message }` error bodies, with the message translated
// into the visitor's language (from the locale cookie).
export async function localizedJson(body: { message: string }, init?: ResponseInit): Promise<NextResponse> {
  const locale = await getLocale();
  return NextResponse.json({ ...body, message: translateMessage(body.message, locale) }, init);
}
