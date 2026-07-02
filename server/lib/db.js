// Minimal zero-dependency JSON store (atomic writes). Fine for an MVP / small
// subscriber base. For scale, swap these functions for Postgres/SQLite.
import { promises as fs } from "node:fs";
import { existsSync, mkdirSync } from "node:fs";
import { randomUUID, randomBytes } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "data");
const SUBS = path.join(DIR, "subscribers.json");
const SENT = path.join(DIR, "sent.json");
const REPORTS = path.join(DIR, "reports.json");

if (!existsSync(DIR)) mkdirSync(DIR, { recursive: true });

async function read(file, fallback) {
  try { return JSON.parse(await fs.readFile(file, "utf8")); }
  catch { return fallback; }
}
async function write(file, data) {
  const tmp = file + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(data, null, 2));
  await fs.rename(tmp, file);           // atomic replace
}
const token = () => randomBytes(24).toString("hex");

export async function addPending(d) {
  const subs = await read(SUBS, []);
  // de-dupe by contact: replace any existing record for same mobile/email
  const key = (s) => (s.mobile || "") + "|" + (s.email || "");
  const filtered = subs.filter((s) => key(s) !== key(d));
  const rec = {
    id: randomUUID(),
    name: d.name || "",
    mobile: d.mobile || "",
    email: d.email || "",
    district: d.district || "",
    lat: d.lat ?? null,
    lon: d.lon ?? null,
    lang: d.lang || "en",
    threshold: Number(d.threshold) || 4.5,
    channel: d.channel || (d.mobile ? "sms" : "email"),
    status: "pending",
    confirmToken: token(),
    unsubToken: token(),
    createdAt: new Date().toISOString(),
    confirmedAt: null
  };
  filtered.push(rec);
  await write(SUBS, filtered);
  return rec;
}

export async function confirm(confirmToken) {
  const subs = await read(SUBS, []);
  const rec = subs.find((s) => s.confirmToken === confirmToken);
  if (!rec) return null;
  rec.status = "confirmed";
  rec.confirmedAt = new Date().toISOString();
  await write(SUBS, subs);
  return rec;
}

export async function removeByUnsub(unsubToken) {
  const subs = await read(SUBS, []);
  const next = subs.filter((s) => s.unsubToken !== unsubToken);
  const changed = next.length !== subs.length;
  if (changed) await write(SUBS, next);
  return changed;
}

// Browser push subscriber (no double opt-in — the browser permission is consent).
export async function addPush(d) {
  const subs = await read(SUBS, []);
  const ep = d.subscription && d.subscription.endpoint;
  if (!ep) return null;
  const filtered = subs.filter((s) => !(s.push && s.push.endpoint === ep));
  const rec = {
    id: randomUUID(),
    name: "", mobile: "", email: "",
    district: d.district || "",
    lat: d.lat ?? null, lon: d.lon ?? null,
    lang: d.lang || "en",
    threshold: Number(d.threshold) || 4.5,
    channel: "push",
    push: d.subscription,
    status: "confirmed",
    confirmToken: null,
    unsubToken: token(),
    createdAt: new Date().toISOString(),
    confirmedAt: new Date().toISOString()
  };
  filtered.push(rec);
  await write(SUBS, filtered);
  return rec;
}
export async function removeByEndpoint(endpoint) {
  const subs = await read(SUBS, []);
  const next = subs.filter((s) => !(s.push && s.push.endpoint === endpoint));
  const changed = next.length !== subs.length;
  if (changed) await write(SUBS, next);
  return changed;
}

export async function listConfirmed() {
  return (await read(SUBS, [])).filter((s) => s.status === "confirmed");
}

export async function wasSent(eventId, subId) {
  const sent = await read(SENT, {});
  return Boolean(sent[eventId] && sent[eventId][subId]);
}
export async function markSent(eventId, subId) {
  const sent = await read(SENT, {});
  (sent[eventId] = sent[eventId] || {})[subId] = Date.now();
  await write(SENT, sent);
}
// drop dedupe records older than 30 days to keep the file small
export async function pruneSent(maxAgeMs = 30 * 864e5) {
  const sent = await read(SENT, {});
  const now = Date.now();
  for (const ev of Object.keys(sent)) {
    for (const sub of Object.keys(sent[ev])) if (now - sent[ev][sub] > maxAgeMs) delete sent[ev][sub];
    if (!Object.keys(sent[ev]).length) delete sent[ev];
  }
  await write(SENT, sent);
}

// Community "Did you feel it?" reports (crowdsourced shaking intensity).
export async function addReport(d) {
  const list = await read(REPORTS, []);
  const num = (v) => { const n = typeof v === "number" ? v : parseFloat(v); return isFinite(n) ? n : null; };
  let lat = num(d.lat), lon = num(d.lon);
  if (lat != null && (lat < -90 || lat > 90)) lat = null;
  if (lon != null && (lon < -180 || lon > 180)) lon = null;
  let intensity = Math.round(num(d.intensity) || 0);
  if (intensity < 0) intensity = 0; else if (intensity > 10) intensity = 10;
  const rec = {
    id: randomUUID(),
    name: String(d.name || "").slice(0, 80),
    district: String(d.district || "").slice(0, 80),
    intensity,
    severity: String(d.severity || "").slice(0, 20),
    message: String(d.message || "").slice(0, 1000),
    lat, lon,
    at: new Date().toISOString()
  };
  list.push(rec);
  await write(REPORTS, list);
  return rec;
}
export async function listReports() { return await read(REPORTS, []); }
