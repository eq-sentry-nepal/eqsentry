// Web Push (VAPID) — sends browser notifications to subscribers.
// Configure with VAPID_PUBLIC / VAPID_PRIVATE in .env
//   (generate once with:  npx web-push generate-vapid-keys ).
// Optional VAPID_SUBJECT — a "mailto:" address or your site URL.
import webpush from "web-push";

const env = process.env;
let ready = false;
if (env.VAPID_PUBLIC && env.VAPID_PRIVATE) {
  try {
    webpush.setVapidDetails(env.VAPID_SUBJECT || "mailto:alerts@eqsentry.com", env.VAPID_PUBLIC, env.VAPID_PRIVATE);
    ready = true;
  } catch (e) { console.warn("[push] VAPID setup failed:", e.message); }
}

export function pushConfigured() { return ready; }
export function vapidPublicKey() { return env.VAPID_PUBLIC || ""; }

// Returns true on success, "gone" if the subscription is expired/invalid
// (the caller should delete it), or false otherwise.
export async function sendPush(subscription, payload) {
  if (!ready) return false;
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload), { TTL: 1800 });
    return true;
  } catch (e) {
    if (e.statusCode === 404 || e.statusCode === 410) return "gone";
    console.warn("[push] send error", e.statusCode || e.message);
    return false;
  }
}
