// Runs once each time a server instance starts (before it takes requests).
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.NODE_ENV !== "production") return;

  // Point the Telegram bot at this deployment. Not awaited: `register` must
  // finish before the server is ready, and a slow Telegram must not hold that up.
  void import("@/lib/telegram-api")
    .then(({ registerTelegramWebhook }) => registerTelegramWebhook())
    .then((result) => console.log(`[telegram] webhook ${result}`))
    .catch((error) => console.error("[telegram] webhook registration failed:", error instanceof Error ? error.message : error));
}
