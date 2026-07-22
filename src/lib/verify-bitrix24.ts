interface Bitrix24Profile {
  NAME?: string;
  LAST_NAME?: string;
  [key: string]: unknown;
}

// Confirms a Bitrix24 inbound webhook URL is valid by calling a harmless
// read-only method (profile.json) and returns the profile info on success.
export async function verifyBitrix24Webhook(webhookUrl: string): Promise<Bitrix24Profile> {
  let url: URL;
  try {
    url = new URL("profile.json", webhookUrl.endsWith("/") ? webhookUrl : `${webhookUrl}/`);
  } catch {
    throw new Error("Webhook URL formati noto'g'ri");
  }

  let response: Response;
  try {
    response = await fetch(url);
  } catch {
    throw new Error("Bitrix24'ga ulanib bo'lmadi");
  }

  const body = await response.json().catch(() => null);

  if (!response.ok || !body || body.error) {
    throw new Error(body?.error_description || body?.error || "Bitrix24 webhook yaroqsiz");
  }

  return body.result;
}
