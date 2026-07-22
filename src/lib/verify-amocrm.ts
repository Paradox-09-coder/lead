// Confirms an amoCRM/Kommo account URL + JWT token pair is valid by calling
// the account info endpoint.
export async function verifyAmoCrmToken(accountUrl: string, jwtToken: string): Promise<unknown> {
  let base: string;
  try {
    base = accountUrl.replace(/\/$/, "");
    new URL(base);
  } catch {
    throw new Error("Account URL formati noto'g'ri");
  }

  let response: Response;
  try {
    response = await fetch(`${base}/api/v4/account`, {
      headers: { Authorization: `Bearer ${jwtToken}` },
    });
  } catch {
    throw new Error("amoCRM/Kommo'ga ulanib bo'lmadi");
  }

  if (!response.ok) {
    throw new Error("Account URL yoki token noto'g'ri");
  }

  return response.json();
}
