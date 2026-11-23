import { connectDB } from "@/lib/mongodb";
import { Integration } from "@/models/Integration";
import { syncFacebookLeads } from "@/lib/facebook-sync";

// Facebook does not always send the `leadgen` webhook (Leads Access not set up for a Page, app not Live …). The
// sync in "Lid tempi" is the safety net for that, but it only ran when somebody opened that page, so leads waited
// hours. This runs the same sync on a timer, for every user that has an active integration.
const INTERVAL_MS = 3 * 60 * 1000;
// Let the server finish starting (and the database connect) before the first run.
const FIRST_RUN_DELAY_MS = 30 * 1000;

let running = false;

// The same problem (a Page whose token was revoked, say) would otherwise be logged on every run; once an hour is enough.
const PROBLEM_LOG_EVERY_MS = 60 * 60 * 1000;
const lastProblemLog = new Map<string, number>();

function logProblem(scope: string, message: string): void {
  const key = `${scope}|${message}`;
  const now = Date.now();
  if (now - (lastProblemLog.get(key) ?? 0) < PROBLEM_LOG_EVERY_MS) return;
  lastProblemLog.set(key, now);
  console.warn(`[auto-sync] ${scope}: ${message.replace(/\s+/g, " ")}`);
}

async function tick(): Promise<void> {
  // A catch-up of hundreds of leads takes longer than the interval; never start a second run on top of it.
  if (running) return;
  running = true;
  try {
    await connectDB();
    const userIds = await Integration.distinct("user", { status: "active" });
    for (const userId of userIds) {
      try {
        // The Page subscription is left alone here; only leads are pulled.
        const result = await syncFacebookLeads(String(userId), { resubscribe: false });
        if (result.imported > 0 || result.retried > 0) {
          console.log(`[auto-sync] imported ${result.imported}, redelivered ${result.retried} (user ${userId})`);
        }
        for (const problem of result.problems) logProblem(problem.scope, problem.message);
      } catch (error) {
        console.error("[auto-sync] sync failed for a user:", error instanceof Error ? error.message : error);
      }
    }
  } catch (error) {
    console.error("[auto-sync] run failed:", error instanceof Error ? error.message : error);
  } finally {
    running = false;
  }
}

let started = false;

// Starts the timer once per server instance.
export function startAutoSync(): void {
  if (started) return;
  started = true;
  setTimeout(() => {
    void tick();
    setInterval(() => void tick(), INTERVAL_MS);
  }, FIRST_RUN_DELAY_MS);
  console.log(`[auto-sync] on: every ${INTERVAL_MS / 60000} min`);
}
