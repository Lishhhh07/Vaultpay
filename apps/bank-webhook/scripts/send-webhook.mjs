import "dotenv/config";
import crypto from "crypto";

const [token, amount] = process.argv.slice(2);
if (!token || !amount) { console.log("usage: node scripts/send-webhook.mjs <token> <amountInPaise>"); process.exit(1); }

const body = JSON.stringify({ token, amount: Number(amount) });
const ts = Date.now().toString();
const sig = crypto.createHmac("sha256", process.env.BANK_WEBHOOK_SECRET)
  .update(`${ts}.${body}`).digest("hex");

const url = process.env.WEBHOOK_URL ?? "http://localhost:3003/hdfcWebhook";
const r = await fetch(url, {
  method: "POST",
  headers: { "content-type": "application/json", "x-timestamp": ts, "x-signature": sig },
  body,
});
console.log(r.status, await r.text());