#!/usr/bin/env node
/* Refresh the stored Nepal earthquake catalogue from USGS and regenerate the
   embedded data file. Run on a schedule (see DEPLOYMENT.md):
     node scripts/update-catalog.mjs
   Requires Node 18+ (global fetch). No npm dependencies. */
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const BOX = { minLat: 26, maxLat: 31, minLon: 79, maxLon: 89 };
// IMPORTANT: the published catalogue spans 1911→today (USGS ISC-GEM covers the
// early instrumental era). Keep this date early — raising it (e.g. to 1988)
// would silently drop the historical events, including the 1934 M8.0.
const SINCE = "1900-01-01";

const QUERY = "https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson"
  + `&starttime=${SINCE}&minmagnitude=4.5`
  + `&minlatitude=${BOX.minLat}&maxlatitude=${BOX.maxLat}`
  + `&minlongitude=${BOX.minLon}&maxlongitude=${BOX.maxLon}&orderby=time`;

const read = async (p, d) => { try { return JSON.parse(await fs.readFile(path.join(ROOT, p), "utf8")); } catch { return d; } };

async function fetchRetry(url, tries = 3) {
  for (let i = 1; i <= tries; i++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(60000) });
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r;
    } catch (e) {
      if (i === tries) throw e;
      const wait = 2000 * Math.pow(4, i - 1);
      console.warn(`fetch attempt ${i} failed (${e.message}) — retrying in ${wait / 1000}s`);
      await new Promise((res) => setTimeout(res, wait));
    }
  }
}

async function main() {
  console.log("Fetching USGS catalogue…");
  const res = await fetchRetry(QUERY);
  const raw = await res.json();
  if (!raw || !Array.isArray(raw.features)) throw new Error("USGS payload: features missing");
  for (const f of raw.features.slice(0, 50)) {
    const c = f && f.geometry && f.geometry.coordinates;
    if (!Array.isArray(c) || typeof c[0] !== "number" || typeof c[1] !== "number" || typeof (f.properties || {}).time !== "number")
      throw new Error("USGS payload: malformed feature " + (f && f.id));
  }

  const features = (raw.features || []).map((f) => {
    const c = f.geometry.coordinates, p = f.properties;
    return {
      type: "Feature",
      geometry: { type: "Point", coordinates: [c[0], c[1], c[2] ?? 0] },
      properties: {
        id: f.id, mag: p.mag, magType: p.magType, place: p.place, time: p.time,
        depth: c[2] ?? 0, url: p.url || ("https://earthquake.usgs.gov/earthquakes/eventpage/" + f.id)
      }
    };
  }).filter((f) => f.properties.mag != null)
    .sort((a, b) => b.properties.time - a.properties.time);

  // Safety net: never overwrite the catalogue with a drastically smaller one
  // (partial USGS response, transient error, wrong query…).
  const existing = await read("data/nepal_earthquakes.geojson", null);
  const prevCount = existing && existing.features ? existing.features.length : 0;
  if (prevCount && features.length < prevCount * 0.9) {
    throw new Error("Refusing to shrink catalogue: fetched " + features.length +
      " events but " + prevCount + " are stored. Check the query (SINCE / bounding box) before forcing an update.");
  }

  const mags = features.map((f) => f.properties.mag);
  const years = features.map((f) => new Date(f.properties.time).getUTCFullYear());
  const maxMag = Math.max(...mags);
  const strongest = features.find((f) => f.properties.mag === maxMag);

  const catalog = {
    type: "FeatureCollection",
    metadata: {
      title: `Significant earthquakes (M4.5+) in the Nepal region, ${Math.min(...years)}-${Math.max(...years)}`,
      source: "USGS Earthquake Hazards Program (FDSN event API)",
      region: BOX, minMagnitude: 4.5, count: features.length, generated: new Date().toISOString()
    },
    features
  };
  await fs.writeFile(path.join(ROOT, "data/nepal_earthquakes.geojson"), JSON.stringify(catalog));

  // CSV
  const csv = ["id,time_utc,mag,magType,depth_km,lat,lon,place,url"];
  for (const f of features) {
    const p = f.properties, c = f.geometry.coordinates;
    const iso = new Date(p.time).toISOString().replace(/\.\d+Z$/, "Z");
    csv.push([p.id, iso, p.mag, p.magType, p.depth, c[1], c[0], `"${(p.place || "").replace(/"/g, "'")}"`, p.url].join(","));
  }
  await fs.writeFile(path.join(ROOT, "data/nepal_earthquakes.csv"), csv.join("\n"));

  // summary
  const notable = await read("data/notable_earthquakes.geojson", { type: "FeatureCollection", features: [] });
  const prevSummary = await read("data/summary.json", {});
  const summary = {
    count: features.length, minMag: 4.5, maxMag: Math.round(maxMag * 10) / 10,
    since: Math.min(...years), region: "Nepal (26-31N, 79-89E)",
    strongest_en: `${new Date(strongest.properties.time).getUTCFullYear()} ${strongest.properties.place}, M${maxMag.toFixed(1)}`,
    // keep the hand-written Nepali label unless the strongest event changed
    ...(prevSummary.strongest_ne && prevSummary.maxMag === Math.round(maxMag * 10) / 10
      ? { strongest_ne: prevSummary.strongest_ne } : {}),
    notableCount: (notable.features || []).length || 8,
    source: "USGS Earthquake Hazards Program", generated: new Date().toISOString()
  };
  await fs.writeFile(path.join(ROOT, "data/summary.json"), JSON.stringify(summary, null, 2));

  // regenerate embedded data-layers.js
  const plates = await read("data/tectonic_plate_boundaries.geojson", { type: "FeatureCollection", features: [] });
  const out = { catalog, notable, plates, summary };
  const js = "/* Auto-generated by scripts/update-catalog.mjs — do not edit by hand. */\n"
    + "window.EQ_DATA=" + JSON.stringify(out) + ";\n";
  await fs.writeFile(path.join(ROOT, "assets/js/data-layers.js"), js);

  // RSS + JSON feeds of the 30 most recent events (refreshed by the weekly cron)
  const recent = features.slice(0, 30);
  const xe = (s) => String(s ?? "").replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" }[c]));
  const rssItems = recent.map((f) => {
    const p = f.properties, c = f.geometry.coordinates;
    const title = `M${p.mag.toFixed(1)} — ${p.place || "Nepal region"}`;
    return `    <item>\n      <title>${xe(title)}</title>\n      <link>${xe(p.url)}</link>\n      <guid isPermaLink="false">${xe(p.id)}</guid>\n      <pubDate>${new Date(p.time).toUTCString()}</pubDate>\n      <description>${xe(`Magnitude ${p.mag.toFixed(1)}, depth ${Math.round(p.depth)} km, at ${c[1].toFixed(2)}N ${c[0].toFixed(2)}E.`)}</description>\n    </item>`;
  }).join("\n");
  const rss = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel>\n  <title>EQ Sentry — earthquakes (M4.5+) near Nepal</title>\n  <link>https://eqsentry.com/map.html</link>\n  <description>Recent significant earthquakes in the Nepal region, from the USGS catalogue. Not a prediction or warning service.</description>\n  <language>en</language>\n  <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>\n${rssItems}\n</channel></rss>\n`;
  await fs.writeFile(path.join(ROOT, "data/feed.xml"), rss);
  await fs.writeFile(path.join(ROOT, "data/latest.json"), JSON.stringify({
    generated: new Date().toISOString(), source: "USGS Earthquake Hazards Program",
    events: recent.map((f) => {
      const p = f.properties, c = f.geometry.coordinates;
      return { id: p.id, mag: p.mag, place: p.place, time: p.time, lat: c[1], lon: c[0], depth: p.depth, url: p.url };
    })
  }, null, 1));

  console.log(`Updated: ${features.length} events (max M${maxMag.toFixed(1)}), data-layers.js + feeds regenerated.`);
}
main().catch((e) => { console.error(e); process.exit(1); });

// --- integrity manifest for data consumers ---
try {
  const crypto = await import("node:crypto");
  const files = ["data/nepal_earthquakes.geojson", "data/nepal_earthquakes.csv",
    "data/notable_earthquakes.geojson", "data/summary.json", "assets/js/data-layers.js"];
  const sums = {};
  for (const f of files) sums[f] = "sha256-" + crypto.createHash("sha256").update(await fs.readFile(path.join(ROOT, f))).digest("base64");
  await fs.writeFile(path.join(ROOT, "data/checksums.json"),
    JSON.stringify({ generated: new Date().toISOString(), files: sums }, null, 2) + "\n");
  console.log("checksums.json written");
} catch (e) { console.warn("checksums skipped:", e.message); }

// --- refresh the downloadable data pack (zip available on CI/most systems) ---
try {
  const { execSync } = await import("node:child_process");
  execSync('zip -j -q assets/downloads/eqsentry-data-pack.zip ' +
    'data/nepal_earthquakes.geojson data/nepal_earthquakes.csv ' +
    'data/notable_earthquakes.geojson data/summary.json ' +
    'assets/downloads/eq-emergency-kit-checklist.pdf ' +
    'assets/downloads/eq-family-plan.pdf assets/downloads/eq-school-college-plan.pdf',
    { stdio: "inherit" });
  console.log("data pack refreshed");
} catch (e) { console.warn("data pack skipped:", e.message); }
