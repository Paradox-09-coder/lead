// Public origin of the app. Behind Railway's proxy a request's own origin is
// the internal address (https://localhost:8080), so anything a browser or an
// OAuth provider is sent to must be built from APP_URL. Without APP_URL (local
// dev) the request origin is used when given.
export function appBaseUrl(requestOrigin?: string): string {
  const configured = process.env.APP_URL?.replace(/\/$/, "");
  return configured || requestOrigin || "https://leadsync-production-5873.up.railway.app";
}
