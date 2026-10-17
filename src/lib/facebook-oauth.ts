import { appBaseUrl } from "@/lib/app-url";

export const FACEBOOK_GRAPH_VERSION = "v25.0";
export const FACEBOOK_OAUTH_STATE_COOKIE = "fb_oauth_state";

// Built from APP_URL, not the request origin: behind Railway's proxy the
// request origin is https://localhost:8080, which Facebook rejects.
export function getFacebookRedirectUri(requestOrigin: string): string {
  return `${appBaseUrl(requestOrigin)}/api/connections/facebook/callback`;
}
