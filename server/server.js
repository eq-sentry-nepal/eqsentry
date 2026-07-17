import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { addPending, confirm, removeByUnsub, addReport, listReports, addPush, removeByEndpoint, listConfirmed, appendStatusSample, listStatusSamples, appendClientError, listClientErrors } from "./lib/db.js";
import { findDistrict } from "./lib/districts.js";
import { sendSMS, sendEmail, smsConfigured, emailConfigured } from "./lib/channels.js";
import { runOnce } from "./lib/alertEngine.js";
import { pushConfigured, vapidPublicKey, sendPush } from "./lib/push.js";

const env = process.env;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE_ROOT = path.join(__dirname, "..");           // serve the static website too
const BASE = env.PUBLIC_BASE_URL || `http://localhost:${env.PORT || 8787}`;

// Escape user-supplied values before interpolating them into HTML (emails / pages).
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g,
  (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const app = express();
app.use(express.json());
app.use(cors({ origin: env.ALLOW_ORIGIN || "*" }));

/* ── USGS proxy + 60s cache (avoids browser CORS / rate limits) ── */
const cache = new Map();
const FEED_RE = /^(significant|4\.5|2\.5|1\.0|all)_(hour|day|week|month)$/;
app.get("/api/usgs/:feed", async (req, res) => {
  const feed = req.params.feed;
  if (!FEED_RE.test(feed)) return res.status(400).json({ error: "bad feed" });
  const hit = cache.get(feed);
  if (hit && Date.now() - hit.t < 60000) return res.json(hit.data);
  try {
    const r = await fetch(`https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/${feed}.geojson`);
    const data = await r.json();
    cache.set(feed, { t: Date.now(), data });
    res.set("Cache-Control", "public, max-age=60").json(data);
  } catch (e) {
    if (hit) return res.json(hit.data);                 // serve stale if USGS is down
    res.status(502).json({ error: "usgs unavailable" });
  }
});

/* ── EMSC proxy + 60s cache (independent cross-check source; avoids CORS) ── */
const emscCache = new Map();
const EMSC_ALLOW = ["format", "limit", "minmag", "minmagnitude", "maxmag", "maxmagnitude",
  "start", "starttime", "end", "endtime", "orderby",
  "minlat", "maxlat", "minlon", "maxlon", "minlatitude", "maxlatitude", "minlongitude", "maxlongitude"];
app.get("/api/emsc", async (req, res) => {
  const qs = new URLSearchParams();
  for (const k of EMSC_ALLOW) if (req.query[k] != null) qs.set(k, String(req.query[k]));
  if (!qs.has("format")) qs.set("format", "json");
  if (!qs.has("limit")) qs.set("limit", "900");
  const key = qs.toString();
  const hit = emscCache.get(key);
  if (hit && Date.now() - hit.t < 60000) return res.json(hit.data);
  try {
    const r = await fetch(`https://www.seismicportal.eu/fdsnws/event/1/query?${key}`,
      { headers: { "User-Agent": "EQSentry/1.0 (+https://eqsentry.com)", "Accept": "application/json" } });
    if (r.status === 204) {                               // FDSN returns 204 when nothing matches
      const empty = { type: "FeatureCollection", features: [] };
      emscCache.set(key, { t: Date.now(), data: empty });
      return res.json(empty);
    }
    if (!r.ok) throw new Error("emsc " + r.status);
    const data = await r.json();
    emscCache.set(key, { t: Date.now(), data });
    res.set("Cache-Control", "public, max-age=60").json(data);
  } catch (e) {
    if (hit) return res.json(hit.data);                   // serve stale if EMSC is down
    res.status(502).json({ error: "emsc unavailable" });
  }
});

app.get("/api/health", (_req, res) => res.json({ ok: true, sms: smsConfigured(), email: emailConfigured(), push: pushConfigured() }));

/* ── Browser push (Web Push) ── */
app.get("/api/stats", async (_req, res) => {
  const subs = await listConfirmed();
  const reports = await listReports();
  res.set("Cache-Control", "public, max-age=120").json({ subscribers: subs.length, reports: reports.length });
});

app.get("/api/push/key", (_req, res) => res.json({ key: vapidPublicKey(), configured: pushConfigured() }));
app.post("/api/push/subscribe", async (req, res) => {
  const b = req.body || {};
  if (!b.subscription || !b.subscription.endpoint) return res.status(400).json({ error: "subscription required" });
  const loc = findDistrict(b.district) || {};
  const rec = await addPush({ subscription: b.subscription, district: b.district || "", lat: loc.lat ?? null, lon: loc.lon ?? null, threshold: b.threshold, lang: b.lang });
  res.json({ ok: true, id: rec && rec.id, sending: pushConfigured() });
});
app.post("/api/push/unsubscribe", async (req, res) => {
  const b = req.body || {};
  if (!b.endpoint) return res.status(400).json({ error: "endpoint required" });
  await removeByEndpoint(b.endpoint);
  res.json({ ok: true });
});
// Dev-only: fire a test notification to every push subscriber. Disabled in production.
app.post("/api/push/test", async (_req, res) => {
  if (process.env.NODE_ENV === "production") return res.status(404).end();
  if (!pushConfigured()) return res.status(400).json({ error: "VAPID keys not set" });
  const subs = (await listConfirmed()).filter((s) => s.channel === "push" && s.push);
  let sent = 0;
  for (const s of subs) {
    const r = await sendPush(s.push, { title: "EQ Sentry test ✓", body: "Browser alerts are working on this device.", url: "alerts.html", tag: "eq-test", lang: s.lang || "en" });
    if (r === "gone") await removeByEndpoint(s.push.endpoint); else if (r) sent++;
  }
  res.json({ ok: true, subscribers: subs.length, sent });
});

/* ── Subscribe (double opt-in) ── */
app.post("/api/subscribe", async (req, res) => {
  const b = req.body || {};
  if (!b.consent) return res.status(400).json({ error: "consent required" });
  if (!b.mobile && !b.email) return res.status(400).json({ error: "mobile or email required" });
  const loc = findDistrict(b.district) || {};
  const sub = await addPending({ ...b, lat: loc.lat ?? null, lon: loc.lon ?? null });
  const link = `${BASE}/api/confirm?token=${sub.confirmToken}`;
  let sentVia = null;
  if (sub.email && emailConfigured()) {
    const ok = await sendEmail(sub.email, "Confirm your EQ Sentry alerts",
      `<h2>Confirm your earthquake alerts</h2><p>Tap to confirm alerts for <b>${esc(sub.district || "Nepal")}</b> (M${esc(sub.threshold)}+):</p><p><a href="${link}">Confirm my alerts</a></p><p>If you didn't request this, ignore this email.</p>`);
    if (ok) sentVia = "email";
  }
  if (!sentVia && sub.mobile && smsConfigured()) {
    if (await sendSMS(sub.mobile, `EQ Sentry: confirm earthquake alerts — ${link}`)) sentVia = "sms";
  }
  if (!sentVia) console.log(`[subscribe] no channel configured — confirm manually: ${link}`);
  res.json({ ok: true, pending: true, sentVia });
});

/* ── Confirm / Unsubscribe (one click) ── */
function page(title, body) {
  return `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title}</title><body style="font-family:system-ui;background:#0A0C10;color:#EEF1F6;display:grid;place-items:center;height:100vh;margin:0;text-align:center">
  <div style="max-width:460px;padding:24px"><h1 style="color:#FF4D2E">${title}</h1>${body}
  <p style="margin-top:24px"><a href="${env.ALLOW_ORIGIN || "/"}" style="color:#FF8A3D">← Back to EQ Sentry</a></p></div>`;
}
app.get("/api/confirm", async (req, res) => {
  const sub = await confirm(req.query.token);
  res.status(sub ? 200 : 400).send(sub
    ? page("You're subscribed ✓", `<p>You'll be alerted about significant earthquakes near <b>${esc(sub.district || "Nepal")}</b>.</p>`)
    : page("Link expired", "<p>This confirmation link is invalid or already used.</p>"));
});
app.get("/api/unsubscribe", async (req, res) => {
  const ok = await removeByUnsub(req.query.token);
  res.send(page(ok ? "Unsubscribed" : "Already removed", `<p>${ok ? "You will no longer receive EQ Sentry alerts." : "This contact is not on our list."}</p>`));
});

/* ── Client error reports (monitor.js) — persisted ring ── */
app.post("/api/client-log", async (req, res) => {
  const b = req.body || {};
  await appendClientError({
    at: new Date().toISOString(),
    type: String(b.type || "").slice(0, 20),
    msg: String(b.msg || "").slice(0, 300),
    src: String(b.src || "").slice(0, 200),
    line: Number(b.line) || 0,
    page: String(b.page || "").slice(0, 120)
  });
  console.warn("[client]", b.type || "error", "—", String(b.msg || "").slice(0, 120), "@", b.page);
  res.json({ ok: true });
});

/* ── Admin status API: uptime history + error log with time periods ──
   Protect with ADMIN_KEY in .env (required in production; open in dev). */
function adminOk(req) {
  const key = env.ADMIN_KEY || "";
  if (!key) return process.env.NODE_ENV !== "production";
  const got = req.query.key || req.get("x-admin-key") || "";
  return got === key;
}
const PERIOD_MS = { hour: 36e5, day: 864e5, month: 30 * 864e5 };
app.get("/api/status/history", async (req, res) => {
  if (!adminOk(req)) return res.status(401).json({ error: "admin key required" });
  const period = PERIOD_MS[req.query.period] ? req.query.period : "day";
  const span = PERIOD_MS[period];
  const bucketMs = period === "hour" ? 12e4 : period === "day" ? 36e5 : 864e5;
  const since = Date.now() - span;
  const samples = await listStatusSamples(since);
  const buckets = [];
  for (let t = since; t < Date.now(); t += bucketMs) {
    const in_ = samples.filter((s) => s.t >= t && s.t < t + bucketMs);
    if (!in_.length) { buckets.push({ t, n: 0 }); continue; }
    const worst = in_.some((s) => !s.usgs.ok || !s.emsc.ok) ? "fail"
      : in_.some((s) => s.usgs.ms > 4000 || s.emsc.ms > 4000) ? "slow" : "ok";
    buckets.push({
      t, n: in_.length, state: worst,
      usgs_ms: Math.round(in_.reduce((a, s) => a + (s.usgs.ms || 0), 0) / in_.length),
      emsc_ms: Math.round(in_.reduce((a, s) => a + (s.emsc.ms || 0), 0) / in_.length)
    });
  }
  const withData = buckets.filter((b) => b.n);
  const upt = withData.length
    ? Math.round(100 * withData.filter((b) => b.state !== "fail").length / withData.length * 10) / 10 : null;
  res.json({ period, bucketMs, generated: Date.now(), uptime: upt,
    samples: samples.length, buckets,
    server: { uptime_s: Math.round(process.uptime()), node: process.version } });
});
app.get("/api/status/errors", async (req, res) => {
  if (!adminOk(req)) return res.status(401).json({ error: "admin key required" });
  const period = PERIOD_MS[req.query.period] ? req.query.period : "day";
  const list = await listClientErrors(Date.now() - PERIOD_MS[period]);
  res.json({ period, count: list.length, errors: list.slice(-500).reverse() });
});

/* Self-sampling: probe USGS + EMSC on an interval and persist the result. */
async function probe(url, opts) {
  const t0 = Date.now();
  try {
    const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 8000);
    const r = await fetch(url, { ...opts, signal: ctl.signal });
    clearTimeout(to);
    return { ok: r.ok || r.status === 204, ms: Date.now() - t0, code: r.status };
  } catch { return { ok: false, ms: Date.now() - t0, code: 0 }; }
}
async function sampleStatus() {
  const [usgs, emsc] = await Promise.all([
    probe("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_hour.geojson"),
    probe("https://www.seismicportal.eu/fdsnws/event/1/query?format=json&limit=1")
  ]);
  await appendStatusSample({ t: Date.now(), usgs, emsc });
}
const STATUS_POLL_S = Number(env.STATUS_POLL_SECONDS) || 300;
sampleStatus().catch(() => {});
setInterval(() => sampleStatus().catch(() => {}), STATUS_POLL_S * 1000);

/* ── Community "Did you feel it?" reports ── */
app.post("/api/report", async (req, res) => {
  const rec = await addReport(req.body || {});
  res.json({ ok: true, id: rec.id, intensity: rec.intensity });
});
app.get("/api/reports", async (_req, res) => {
  const since = Date.now() - 7 * 864e5;                  // last 7 days
  const list = (await listReports()).filter((r) => new Date(r.at).getTime() >= since);
  const out = list.slice(-600).reverse().map((r) => ({
    district: r.district, intensity: r.intensity || 0,
    lat: r.lat ?? null, lon: r.lon ?? null, at: r.at,
    message: r.message ? String(r.message).slice(0, 200) : ""
  }));
  res.set("Cache-Control", "public, max-age=30").json({ reports: out });
});

/* ── Static website (optional: run site + API from one process) ── */
app.use(express.static(SITE_ROOT, { extensions: ["html"] }));

const PORT = Number(env.PORT) || 8787;
app.listen(PORT, () => {
  console.log(`EQ Sentry server on :${PORT}  (SMS:${smsConfigured()} email:${emailConfigured()})`);
  if (String(env.ALERT_POLL).toLowerCase() === "true") {
    const every = (Number(env.ALERT_POLL_SECONDS) || 120) * 1000;
    console.log(`[engine] polling every ${every / 1000}s`);
    runOnce().then((r) => console.log("[engine] initial", r)).catch(() => {});
    setInterval(() => runOnce().then((r) => r.sent && console.log("[engine]", r)).catch(() => {}), every);
  }
});
