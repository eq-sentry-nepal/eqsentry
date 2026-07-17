// Automated alert engine: poll USGS, match events to subscribers
// (district + magnitude), de-duplicate, and dispatch. Cron- or interval-driven.
import { listConfirmed, wasSent, markSent, pruneSent, removeByEndpoint } from "./db.js";
import { findDistrict, haversineKm } from "./districts.js";
import { dispatch } from "./channels.js";
import { sendPush } from "./push.js";
import { tgAnnounce } from "./telegram.js";

const env = process.env;
const num = (k, d) => (env[k] !== undefined && env[k] !== "" ? Number(env[k]) : d);

function region() {
  return {
    minLat: num("REGION_MIN_LAT", 26), maxLat: num("REGION_MAX_LAT", 31),
    minLon: num("REGION_MIN_LON", 79), maxLon: num("REGION_MAX_LON", 89)
  };
}
function inRegion(lon, lat) {
  const r = region();
  return lat >= r.minLat && lat <= r.maxLat && lon >= r.minLon && lon <= r.maxLon;
}
function fmtTime(ms) {
  try { return new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kathmandu", dateStyle: "medium", timeStyle: "short" }).format(new Date(ms)); }
  catch { return new Date(ms).toISOString(); }
}

function buildMessages(ev, sub) {
  const m = ev.mag != null ? ev.mag.toFixed(1) : "?";
  const when = fmtTime(ev.time);
  const unsub = `${env.PUBLIC_BASE_URL || ""}/api/unsubscribe?token=${sub.unsubToken}`;
  if (sub.lang === "ne") {
    return {
      sms: `EQ Sentry: M${m} भूकम्प — ${ev.place}, ${when}. हल्लिएमा घोप्टिनुहोस्-ओत लिनुहोस्-समाउनुहोस्। बन्द गर्न: ${unsub}`,
      email: { subject: `भूकम्प सूचना: M${m} — ${ev.place}`,
        html: `<h2>EQ Sentry भूकम्प सूचना</h2><p><b>M${m}</b> भूकम्प — ${ev.place}</p><p>${when} (नेपाली समय)</p>
        <p>हल्लिएमा <b>घोप्टिनुहोस्, ओत लिनुहोस्, समाउनुहोस्</b>। आपत्कालमा १०० / १०२ / ११४९।</p>
        <p><a href="${ev.url}">USGS विवरण</a> · <a href="${unsub}">सूचना बन्द गर्नुहोस्</a></p>` },
      push: { title: `M${m} भूकम्प — ${ev.place}`, body: `${when} (नेपाली समय)। हल्लिएमा घोप्टिनुहोस्-ओत लिनुहोस्-समाउनुहोस्।`, url: ev.url || "map.html", tag: ev.id, lang: "ne" }
    };
  }
  return {
    sms: `EQ Sentry: M${m} earthquake — ${ev.place}, ${when}. If shaking: Drop, Cover, Hold On. Stop: ${unsub}`,
    email: { subject: `Earthquake alert: M${m} — ${ev.place}`,
      html: `<h2>EQ Sentry earthquake alert</h2><p><b>M${m}</b> earthquake — ${ev.place}</p><p>${when} (Nepal time)</p>
      <p>If you feel shaking, <b>Drop, Cover, Hold On</b>. Emergencies: 100 / 102 / 1149.</p>
      <p><a href="${ev.url}">USGS details</a> · <a href="${unsub}">Unsubscribe</a></p>` },
    push: { title: `M${m} earthquake — ${ev.place}`, body: `${when} (Nepal time). If shaking: Drop, Cover, Hold On.`, url: ev.url || "map.html", tag: ev.id, lang: "en" }
  };
}

export async function runOnce(log = console.log) {
  const feed = env.USGS_FEED || "2.5_hour";
  let data;
  try {
    const r = await fetch(`https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/${feed}.geojson`);
    data = await r.json();
  } catch (e) { log("[engine] fetch failed:", e.message); return { checked: 0, sent: 0 }; }

  const events = (data.features || []).filter((f) => {
    const c = f.geometry && f.geometry.coordinates; return c && inRegion(c[0], c[1]);
  });
  const subs = await listConfirmed();
  const radius = num("DEFAULT_RADIUS_KM", 150);
  let sent = 0;

  for (const f of events) {
    const c = f.geometry.coordinates, p = f.properties;
    const ev = { id: f.id, mag: p.mag, place: p.place, time: p.time, url: p.url, lon: c[0], lat: c[1] };
    if (ev.mag == null) continue;
    // Public Telegram channel: one announcement per qualifying event.
    if (ev.mag >= num("TELEGRAM_MIN_MAG", 4.5) && !(await wasSent(ev.id, "tg-channel"))) {
      if (await tgAnnounce(ev)) { await markSent(ev.id, "tg-channel"); log(`[engine] telegram announce M${ev.mag}`); }
    }
    for (const sub of subs) {
      if (ev.mag < (sub.threshold || 4.5)) continue;
      const loc = sub.lat != null && sub.lon != null ? { lat: sub.lat, lon: sub.lon } : findDistrict(sub.district);
      if (loc && haversineKm(loc.lat, loc.lon, ev.lat, ev.lon) > radius) continue; // too far from their area
      if (await wasSent(ev.id, sub.id)) continue;
      const msg = buildMessages(ev, sub);
      let via = null;
      if (sub.channel === "push" && sub.push) {
        const r = await sendPush(sub.push, msg.push);
        if (r === "gone") await removeByEndpoint(sub.push.endpoint);
        else if (r) via = "push";
      } else {
        via = await dispatch(sub, msg);
      }
      if (via) { await markSent(ev.id, sub.id); sent++; log(`[engine] sent M${ev.mag} → ${sub.id} via ${via}`); }
    }
  }
  await pruneSent();
  return { checked: events.length, subscribers: subs.length, sent };
}

// Standalone: `node lib/alertEngine.js --once`  (for cron)
if (process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("lib/alertEngine.js")) {
  await import("dotenv/config");
  const res = await runOnce();
  console.log("[engine] run complete:", res);
  process.exit(0);
}
