import crypto from "node:crypto";
import { FACEBOOK_GRAPH_VERSION } from "@/lib/facebook-oauth";

// Facebook Conversions API: helpers for sending one event for one customer.
// Customer fields must be normalised and SHA-256 hashed before they are sent.
// https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/customer-information-parameters

const REQUEST_TIMEOUT_MS = 15_000;

export function sha256(text: string): string {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

// Digits only, with the country code (no "+", no leading zeros), as Facebook
// wants it. A number written without "+" or "00" and with 9 digits or fewer is
// taken to be a local one, so `defaultCountryCode` is put in front. Returns null
// when what is left cannot be a phone number (8 to 15 digits).
export function normalizePhone(raw: string, defaultCountryCode: string): string | null {
  const trimmed = raw.trim();
  let digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;

  const isInternational = trimmed.startsWith("+") || digits.startsWith("00");
  digits = digits.replace(/^0+/, "");
  if (!isInternational && digits.length <= 9) digits = defaultCountryCode.replace(/\D/g, "") + digits;

  return digits.length >= 8 && digits.length <= 15 ? digits : null;
}

// Lowercase letters only: digits, punctuation and symbols are dropped.
function normalizeNamePart(part: string): string {
  return part
    .toLowerCase()
    .replace(/[\p{P}\p{S}\p{N}]+/gu, "")
    .trim();
}

// "Ali Valiyev" -> first "ali", last "valiyev". The first word is the first
// name and everything after it the last name.
export function splitName(fullName: string): { first?: string; last?: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const first = parts[0] ? normalizeNamePart(parts[0]) : "";
  const last = parts.length > 1 ? normalizeNamePart(parts.slice(1).join(" ")) : "";
  return { first: first || undefined, last: last || undefined };
}

// Reads an amount the way people write it: "1500000", "1 500 000", "1,500,000",
// "1.500.000", "1500,50", "1500.5". Returns null for anything that is not a
// non-negative number.
export function parseAmount(raw: unknown): number | null {
  if (typeof raw === "number") return Number.isFinite(raw) && raw >= 0 ? raw : null;
  if (typeof raw !== "string") return null;

  const text = raw.replace(/[\s ]/g, "");
  if (!/^\d[\d.,]*$/.test(text)) return null;

  const lastDot = text.lastIndexOf(".");
  const lastComma = text.lastIndexOf(",");
  let normalized: string;
  if (lastDot >= 0 && lastComma >= 0) {
    // Both appear: the later one is the decimal separator, the other groups thousands.
    const decimal = Math.max(lastDot, lastComma);
    normalized = `${text.slice(0, decimal).replace(/[.,]/g, "")}.${text.slice(decimal + 1)}`;
  } else {
    const separator = lastDot >= 0 ? "." : lastComma >= 0 ? "," : "";
    const count = separator ? text.split(separator).length - 1 : 0;
    // One separator followed by 1-2 digits is a decimal point; otherwise it groups thousands.
    const isDecimal = count === 1 && new RegExp(`^\\d+\\${separator}\\d{1,2}$`).test(text);
    normalized = separator ? (isDecimal ? text.replace(separator, ".") : text.split(separator).join("")) : text;
  }

  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

export interface ConversionEventInput {
  eventName: string;
  eventId: string;
  eventTimeSeconds: number;
  fullName?: string;
  // Already normalised with `normalizePhone`.
  phone?: string;
  amount?: number;
  currency: string;
}

export interface FacebookConversionEvent {
  event_name: string;
  event_time: number;
  event_id: string;
  action_source: "system_generated";
  user_data: { ph?: string[]; fn?: string[]; ln?: string[] };
  custom_data: Record<string, unknown>;
}

// The event as Facebook's /events edge takes it. `system_generated` with the
// CRM markers is how Meta wants events that a business system (a CRM) reports
// after the fact, rather than ones a visitor triggered on a website.
export function buildConversionEvent(input: ConversionEventInput): FacebookConversionEvent {
  const userData: FacebookConversionEvent["user_data"] = {};
  if (input.phone) userData.ph = [sha256(input.phone)];
  if (input.fullName) {
    const { first, last } = splitName(input.fullName);
    if (first) userData.fn = [sha256(first)];
    if (last) userData.ln = [sha256(last)];
  }

  const customData: Record<string, unknown> = { event_source: "crm", lead_event_source: "LeadSync" };
  if (input.amount !== undefined) {
    customData.value = input.amount;
    customData.currency = input.currency;
  }

  return {
    event_name: input.eventName,
    event_time: input.eventTimeSeconds,
    event_id: input.eventId,
    action_source: "system_generated",
    user_data: userData,
    custom_data: customData,
  };
}

// Facebook refused the request (or could not be reached). `message` is safe to
// show to the user: it never contains the access token.
export class ConversionSendError extends Error {
  code?: number;
  constructor(message: string, code?: number) {
    super(message);
    this.code = code;
  }
}

interface GraphErrorBody {
  error?: { message?: string; error_user_msg?: string; code?: number };
}

async function graphRequest(url: URL, init?: RequestInit): Promise<{ status: number; ok: boolean; body: unknown }> {
  let response: Response;
  try {
    response = await fetch(url, { ...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  } catch {
    throw new ConversionSendError("Facebook'ga ulanib bo'lmadi");
  }
  const body = await response.json().catch(() => null);
  return { status: response.status, ok: response.ok, body };
}

function graphError(result: { status: number; body: unknown }): ConversionSendError {
  const error = (result.body as GraphErrorBody | null)?.error;
  return new ConversionSendError(error?.error_user_msg ?? error?.message ?? `Facebook HTTP ${result.status}`, error?.code);
}

export interface SendResult {
  eventsReceived: number;
  fbtraceId?: string;
}

// POST /{pixel-id}/events with the endpoint's Conversions API token.
export async function sendConversionEvent(options: {
  pixelId: string;
  accessToken: string;
  event: FacebookConversionEvent;
  testEventCode?: string;
}): Promise<SendResult> {
  const url = new URL(`https://graph.facebook.com/${FACEBOOK_GRAPH_VERSION}/${encodeURIComponent(options.pixelId)}/events`);
  url.searchParams.set("access_token", options.accessToken);

  const result = await graphRequest(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      data: [options.event],
      ...(options.testEventCode ? { test_event_code: options.testEventCode } : {}),
    }),
  });

  const body = result.body as { events_received?: number; fbtrace_id?: string } | null;
  if (!result.ok || !body || (body as GraphErrorBody).error) throw graphError(result);
  return { eventsReceived: body.events_received ?? 0, fbtraceId: body.fbtrace_id };
}

// Best-effort check when an endpoint is saved: reads the Pixel's name with the
// token. Returns the name when Facebook gives it. Throws only when Facebook says
// the token itself is invalid (error code 190): a Conversions API token may be
// allowed to send events without being allowed to read the Pixel, and that must
// not stop it from being saved.
export async function lookupPixelName(pixelId: string, accessToken: string): Promise<string | undefined> {
  const url = new URL(`https://graph.facebook.com/${FACEBOOK_GRAPH_VERSION}/${encodeURIComponent(pixelId)}`);
  url.searchParams.set("fields", "name");
  url.searchParams.set("access_token", accessToken);

  const result = await graphRequest(url);
  if (result.ok) {
    const name = (result.body as { name?: unknown } | null)?.name;
    return typeof name === "string" && name ? name : undefined;
  }
  const error = graphError(result);
  if (error.code === 190) throw error;
  return undefined;
}
