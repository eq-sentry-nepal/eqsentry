#!/usr/bin/env node
/* EQ Sentry — cloud status probe. Checks the live site + upstream feeds and
   prints one JSON sample to stdout. Run by .github/workflows/status-monitor.yml
   every 15 minutes. Node 18+; no dependencies. */

const SITE = process.env.SITE_URL || "https://eq-sentry-nepal.github.io/eqsentry";
const SLOW = 4000;

const PROBES = [
  { id: "site",  url: `${SITE}/index.html` },
  { id: "data",  url: `${SITE}/data/summary.json`, fresh: true },
  { id: "usgs",  url: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson" },
  { id: "emsc",  url: "https://www.seismicportal.eu/fdsnws/event/1/query?format=json&limit=1" },
  { id: "tiles", url: "https://a.basemaps.cartocdn.com/dark_all/5/23/13.png" }
];

async function probe(p) {
  const t0 = Date.now();
  try {
    const r = await fetch(p.url, { signal: AbortSignal.timeout(15000), cache: "no-store" });
    const ms = Date.now() - t0;
    if (!r.ok) return { id: p.id, state: "fail", ms, err: "HTTP " + r.status };
    if (p.fresh) {
      const j = await r.json().catch(() => null);
      const gen = j && (j.generated || j.updated);
      if (gen && Date.now() - new Date(gen).getTime() > 9 * 864e5)
        return { id: p.id, state: "fail", ms, err: "data stale (" + gen + ")" };
    }
    return { id: p.id, state: ms > SLOW ? "slow" : "ok", ms };
  } catch (e) {
    return { id: p.id, state: "fail", ms: Date.now() - t0, err: String(e.message || e).slice(0, 120) };
  }
}

const results = await Promise.all(PROBES.map(probe));
const sample = { t: Date.now(), c: {}, ms: {} };
const errors = [];
for (const r of results) {
  sample.c[r.id] = r.state;
  sample.ms[r.id] = r.ms;
  if (r.state === "fail") errors.push({ t: sample.t, check: r.id, err: r.err || "failed", ms: r.ms });
}
console.log(JSON.stringify({ sample, errors }));
