import bcrypt from "bcryptjs";
import crypto from "node:crypto";

const password = process.argv[2];
if (!password) {
  console.error("Foydalanish: npm run generate-secrets -- <admin-paroli>");
  process.exit(1);
}

const hash = await bcrypt.hash(password, 12);
const sessionSecret = crypto.randomBytes(32).toString("hex");

console.log("\nQuyidagilarni .env fayliga (yoki Vercel environment variables'ga) qo'ying:\n");
console.log(`ADMIN_PASSWORD_HASH="${hash}"`);
console.log(`SESSION_SECRET="${sessionSecret}"`);
