/* EQ Sentry — Telegram channel announcer. One message per qualifying quake to a
   public channel/group. Configure TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID in .env. */
import https from "node:https";

const env = process.env;
export function tgConfigured() { return !!(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID); }

export function tgAnnounce(ev) {
  if (!tgConfigured()) return Promise.resolve(false);
  const m = ev.mag != null ? ev.mag.toFixed(1) : "?";
  const when = new Date(ev.time).toISOString().replace("T", " ").slice(0, 16) + " UTC";
  const text =
    `🔴 M${m} earthquake — ${ev.place}\n${when}\n` +
    `${ev.url || "https://eqsentry.com/map.html"}\n\n` +
    `भूकम्प गएको छ। हल्लाइ महसुस भए: घोप्टिनुहोस्, ओत लिनुहोस्, समाउनुहोस्।`;
  const body = JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text, disable_web_page_preview: true });
  return new Promise((resolve) => {
    const req = https.request({
      hostname: "api.telegram.org",
      path: `/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
      timeout: 8000
    }, (res) => { res.resume(); resolve(res.statusCode === 200); });
    req.on("error", () => resolve(false));
    req.on("timeout", () => { req.destroy(); resolve(false); });
    req.write(body); req.end();
  });
}
