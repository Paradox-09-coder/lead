export const FACEBOOK_GRAPH_VERSION = "v25.0";
export const FACEBOOK_OAUTH_STATE_COOKIE = "fb_oauth_state";

// Computed from the incoming request's own origin (rather than hardcoded)
// so this works unchanged on localhost during development and on whatever
// domain the app is deployed to in production.
export function getFacebookRedirectUri(origin: string): string {
  return `${origin}/api/connections/facebook/callback`;
}
