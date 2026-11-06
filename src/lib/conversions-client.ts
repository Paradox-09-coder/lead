import type { ConversionCurrency, ConversionEventName } from "@/lib/conversion-options";

export interface ConversionEndpointItem {
  _id: string;
  name: string;
  url: string;
  pixelId: string;
  pixelName: string | null;
  // Last characters of the stored token; the token itself never comes back.
  tokenHint: string | null;
  eventName: ConversionEventName;
  currency: ConversionCurrency;
  countryCode: string;
  testEventCode: string | null;
  status: "active" | "paused";
  createdAt: string;
}

export interface ConversionEventItem {
  _id: string;
  endpointName: string | null;
  eventName: string;
  fullName: string | null;
  phone: string | null;
  summa: number | null;
  currency: string | null;
  status: "success" | "failed";
  error: string | null;
  test: boolean;
  createdAt: string;
}

export interface EndpointInput {
  name: string;
  pixelId: string;
  // Left out when editing and the token should stay as it is.
  accessToken?: string;
  eventName: ConversionEventName;
  currency: ConversionCurrency;
  countryCode: string;
  // Empty string switches test mode off.
  testEventCode: string;
}

async function readMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string };
    return body.message ?? fallback;
  } catch {
    return fallback;
  }
}

export async function fetchEndpoints(): Promise<ConversionEndpointItem[]> {
  const response = await fetch("/api/conversion-endpoints");
  if (!response.ok) throw new Error(await readMessage(response, "Endpointlarni yuklab bo'lmadi"));
  return (await response.json()) as ConversionEndpointItem[];
}

export async function fetchRecentEvents(): Promise<ConversionEventItem[]> {
  const response = await fetch("/api/conversion-events");
  if (!response.ok) throw new Error(await readMessage(response, "So'rovlarni yuklab bo'lmadi"));
  return (await response.json()) as ConversionEventItem[];
}

export async function createEndpoint(input: EndpointInput): Promise<ConversionEndpointItem> {
  const response = await fetch("/api/conversion-endpoints", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error(await readMessage(response, "Endpoint saqlanmadi"));
  return (await response.json()) as ConversionEndpointItem;
}

export async function updateEndpoint(id: string, input: Partial<EndpointInput> & { status?: "active" | "paused" }) {
  const response = await fetch(`/api/conversion-endpoints/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error(await readMessage(response, "Saqlanmadi"));
  return (await response.json()) as ConversionEndpointItem;
}

export async function deleteEndpoint(id: string): Promise<void> {
  const response = await fetch(`/api/conversion-endpoints/${id}`, { method: "DELETE" });
  if (!response.ok) throw new Error(await readMessage(response, "O'chirilmadi"));
}
