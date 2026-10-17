import { appBaseUrl } from "@/lib/app-url";

export const GOOGLE_OAUTH_STATE_COOKIE = "google_oauth_state";

// Must match an "Authorized redirect URI" in the Google Cloud OAuth client.
export function getGoogleRedirectUri(requestOrigin: string): string {
  return `${appBaseUrl(requestOrigin)}/api/auth/google/callback`;
}
