// `npm run build` wrapper: stamps every build with a unique id so a page that
// is still open in someone's browser can tell a newer version has been
// deployed (see UpdateBanner and /api/version). Works on Windows and Linux.
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const nextBin = require.resolve("next/dist/bin/next");

const buildId = process.env.RAILWAY_DEPLOYMENT_ID || String(Date.now());

const result = spawnSync(process.execPath, [nextBin, "build"], {
  stdio: "inherit",
  env: { ...process.env, NEXT_PUBLIC_BUILD_ID: buildId },
});

process.exit(result.status ?? 1);
