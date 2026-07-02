// Pluggable delivery channels. Each returns true on success, false if not
// configured or on error (the engine logs and moves on).
import nodemailer from "nodemailer";

const env = process.env;

/* ── SMS via Sparrow SMS (Nepal) ───────────────────────────── */
export function smsConfigured() { return Boolean(env.SPARROW_TOKEN); }
export async function sendSMS(to, text) {
  if (!smsConfigured()) return false;
  try {
    const body = new URLSearchParams({
      token: env.SPARROW_TOKEN, from: env.SPARROW_FROM || "Demo",
      to: String(to).replace(/[^\d]/g, ""), text
    });
    const r = await fetch("https://api.sparrowsms.com/v2/sms/", { method: "POST", body });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || (j && j.response_code && j.response_code !== 200)) { console.warn("[sms] failed", j); return false; }
    return true;
  } catch (e) { console.warn("[sms] error", e.message); return false; }
}

/* ── Email via SMTP ────────────────────────────────────────── */
let mailer = null;
export function emailConfigured() { return Boolean(env.SMTP_HOST && env.SMTP_USER); }
function transport() {
  if (!mailer) mailer = nodemailer.createTransport({
    host: env.SMTP_HOST, port: Number(env.SMTP_PORT) || 587,
    secure: Number(env.SMTP_PORT) === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS }
  });
  return mailer;
}
export async function sendEmail(to, subject, html) {
  if (!emailConfigured()) return false;
  try {
    await transport().sendMail({ from: env.EMAIL_FROM || env.SMTP_USER, to, subject, html, text: html.replace(/<[^>]+>/g, "") });
    return true;
  } catch (e) { console.warn("[email] error", e.message); return false; }
}

/* ── Viber / WhatsApp (stubs — wire your provider's API here) ── */
export async function sendViber(to, text) {
  if (!env.VIBER_TOKEN) return false;
  // TODO: integrate Viber Business / a Nepal aggregator. Left as a stub.
  console.log("[viber] (stub) would send to", to);
  return false;
}
export async function sendWhatsApp(to, text) {
  if (!env.WHATSAPP_TOKEN) return false;
  // TODO: integrate WhatsApp Cloud API (Meta). Left as a stub.
  console.log("[whatsapp] (stub) would send to", to);
  return false;
}

/* ── Dispatch to a subscriber on their preferred channel, with fallback ── */
export async function dispatch(sub, { sms, email }) {
  const order = sub.channel === "email" ? ["email", "sms"] : ["sms", "email", "viber", "whatsapp"];
  for (const ch of order) {
    if (ch === "sms" && sub.mobile && (await sendSMS(sub.mobile, sms))) return "sms";
    if (ch === "email" && sub.email && (await sendEmail(sub.email, email.subject, email.html))) return "email";
    if (ch === "viber" && sub.mobile && (await sendViber(sub.mobile, sms))) return "viber";
    if (ch === "whatsapp" && sub.mobile && (await sendWhatsApp(sub.mobile, sms))) return "whatsapp";
  }
  return null;
}
