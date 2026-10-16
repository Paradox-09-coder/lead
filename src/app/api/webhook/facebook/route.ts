// Legacy single-tenant (Postgres) receiver. The URL is kept so a callback
// registered in the Meta App Dashboard keeps working; it now shares the
// multi-tenant handler.
export { GET, POST } from "@/app/api/webhooks/facebook/route";

export const runtime = "nodejs";
