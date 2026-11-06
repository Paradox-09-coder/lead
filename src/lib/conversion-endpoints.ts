import { appBaseUrl } from "@/lib/app-url";
import { ApiError } from "@/lib/api-error";
import {
  CONVERSION_CURRENCIES,
  CONVERSION_EVENT_NAMES,
  type ConversionCurrency,
  type ConversionEventName,
} from "@/lib/conversion-options";
import type { ConversionEndpointDocument } from "@/models/ConversionEndpoint";

export const MAX_ENDPOINTS_PER_USER = 20;

const PIXEL_ID = /^\d{8,20}$/;
const COUNTRY_CODE = /^\d{1,4}$/;
const TEST_EVENT_CODE = /^[A-Za-z0-9_-]{1,40}$/;

export function conversionEndpointUrl(key: string): string {
  return `${appBaseUrl()}/api/conversions/${key}`;
}

// Never includes the access token, only its last characters so the owner can
// tell which token is stored.
export function toPublicEndpoint(endpoint: ConversionEndpointDocument) {
  const token = endpoint.accessToken ?? "";
  return {
    _id: endpoint._id.toString(),
    name: endpoint.name,
    url: conversionEndpointUrl(endpoint.key),
    pixelId: endpoint.pixelId,
    pixelName: endpoint.pixelName ?? null,
    tokenHint: token ? token.slice(-4) : null,
    eventName: endpoint.eventName,
    currency: endpoint.currency,
    countryCode: endpoint.countryCode,
    testEventCode: endpoint.testEventCode ?? null,
    status: endpoint.status,
    createdAt: endpoint.createdAt,
  };
}

export interface EndpointFields {
  name?: string;
  pixelId?: string;
  // Absent = keep the stored token (an edit that leaves the field blank).
  accessToken?: string;
  eventName?: ConversionEventName;
  currency?: ConversionCurrency;
  countryCode?: string;
  // null = switch test mode off.
  testEventCode?: string | null;
  status?: "active" | "paused";
}

const text = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");

// Validates what the dashboard sent. Only the fields that are present are
// returned, so the same function serves creating and editing.
export function parseEndpointFields(body: Record<string, unknown>): EndpointFields {
  const fields: EndpointFields = {};

  if (body.name !== undefined) {
    const name = text(body.name, 120);
    if (!name) throw new ApiError("Nom bo'sh bo'lmasligi kerak");
    fields.name = name;
  }
  if (body.pixelId !== undefined) {
    const pixelId = text(body.pixelId, 30).replace(/\s/g, "");
    if (!PIXEL_ID.test(pixelId)) throw new ApiError("Pixel ID noto'g'ri (faqat raqamlar)");
    fields.pixelId = pixelId;
  }
  if (body.accessToken !== undefined) {
    const accessToken = text(body.accessToken, 1000).replace(/\s/g, "");
    if (accessToken) fields.accessToken = accessToken;
  }
  if (body.eventName !== undefined) {
    if (!(CONVERSION_EVENT_NAMES as readonly unknown[]).includes(body.eventName)) {
      throw new ApiError("Hodisa noto'g'ri");
    }
    fields.eventName = body.eventName as ConversionEventName;
  }
  if (body.currency !== undefined) {
    if (!(CONVERSION_CURRENCIES as readonly unknown[]).includes(body.currency)) {
      throw new ApiError("Valyuta noto'g'ri");
    }
    fields.currency = body.currency as ConversionCurrency;
  }
  if (body.countryCode !== undefined) {
    const countryCode = text(body.countryCode, 8).replace(/^\+/, "");
    if (!COUNTRY_CODE.test(countryCode)) throw new ApiError("Davlat kodi noto'g'ri");
    fields.countryCode = countryCode;
  }
  if (body.testEventCode !== undefined) {
    const code = text(body.testEventCode, 40);
    if (code && !TEST_EVENT_CODE.test(code)) throw new ApiError("Test kodi noto'g'ri");
    fields.testEventCode = code || null;
  }
  if (body.status !== undefined) {
    if (body.status !== "active" && body.status !== "paused") throw new ApiError("Holat noto'g'ri");
    fields.status = body.status;
  }
  return fields;
}
