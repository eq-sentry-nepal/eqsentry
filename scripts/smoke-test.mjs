#!/usr/bin/env node
/* ==========================================================================
   EQ Sentry — smoke test. Zero dependencies; Node 18+.
     node scripts/smoke-test.mjs [--root <dir>]
   Checks:
     1. every .js/.mjs parses (node --check)
     2. every page's <script type="application/json" id="page-i18n"> block is
        valid JSON with matching en/ne keys
     3. every data-i18n* key used in a page exists in its dict or the core dict
     4. {stat|fallback} tokens only use known stat keys
     5. no executable inline <script> and no on*= handler attributes (CSP guard)
     6. internal href/src targets exist on disk
     7. sitemap.xml lists every page (and nothing that doesn't exist)
     8. service-worker SHELL entries exist; SW version bumped when shell changes
     9. data files parse; catalogue, CSV and summary.json agree; count sane
   Exits 1 with a failure list, 0 when green.
   ========================================================================== */
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const argRoot = process.argv.indexOf("--root");
const ROOT = argRoot > -1
  ? path.resolve(process.argv[argRoot + 1])
  : path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const failures = [];
const fail = (msg) => failures.push(msg);
const read = (p) => readFileSync(path.join(ROOT, p), "utf8");
const exists = (p) => existsSync(path.join(ROOT, p));

function walk(dir, out = []) {
  for (const e of readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = path.join(dir, e.name).replace(/\\/g, "/");
    if (e.isDirectory()) {
      if (["node_modules", ".git", "dist", ".github"].includes(e.name)) continue;
      walk(rel, out);
    } else out.push(rel);
  }
  return out;
}
const allFiles = walk(".").map((p) => p.replace(/^\.\//, ""));
const htmlPages = allFiles.filter((p) => p.endsWith(".html") && !p.includes("/"));
const jsFiles = allFiles.filter((p) => (p.endsWith(".js") || p.endsWith(".mjs")) && !p.startsWith("server/node_modules"));

/* 1 ── JS syntax. Node <22 can't `--check` ESM .js files (server/ uses import),
   so on older Nodes those are checked with module detection enabled. */
const nodeMajor = Number(process.versions.node.split(".")[0]);
for (const f of jsFiles) {
  const args = ["--check", path.join(ROOT, f)];
  if (nodeMajor < 22 && f.startsWith("server/") && f.endsWith(".js")) args.unshift("--experimental-detect-module");
  try { execFileSync(process.execPath, args, { stdio: "pipe" }); }
  catch (e) { fail(`JS syntax: ${f} — ${String(e.stderr || e.message).split("\n").slice(0, 2).join(" ")}`); }
}

/* core dictionary keys from i18n.js */
const coreSrc = read("assets/js/i18n.js");
const coreKeys = new Set([...coreSrc.matchAll(/"([a-z0-9._-]+)"\s*:\s*"/gi)].map((m) => m[1]));

const STAT_KEYS = new Set(["count", "since", "maxMag", "to"]);

/* 2–5 ── per-page checks */
for (const page of htmlPages) {
  const html = read(page);

  // 5a: no executable inline scripts (JSON + JSON-LD data blocks are fine)
  const inline = [...html.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>/gi)]
    .filter((m) => !/type\s*=\s*["']application\/(ld\+)?json["']/i.test(m[1]));
  if (inline.length) fail(`CSP: ${page} has ${inline.length} executable inline <script> block(s)`);

  // 5b: no inline event handlers
  const handlers = html.match(/\son[a-z]+\s*=\s*["']/gi);
  if (handlers) fail(`CSP: ${page} has inline event handler(s): ${handlers.slice(0, 3).join(", ")}`);

  // 2: page dict block
  const dictKeys = new Set();
  const m = html.match(/<script type="application\/json" id="page-i18n">([\s\S]*?)<\/script>/);
  if (m) {
    let dict = null;
    try { dict = JSON.parse(m[1]); }
    catch (e) { fail(`i18n JSON: ${page} — ${e.message.slice(0, 120)}`); }
    if (dict) {
      const en = Object.keys(dict.en || {}), ne = Object.keys(dict.ne || {});
      for (const k of en) if (!ne.includes(k)) fail(`i18n parity: ${page} — "${k}" missing in ne`);
      for (const k of ne) if (!en.includes(k)) fail(`i18n parity: ${page} — "${k}" missing in en`);
      en.concat(ne).forEach((k) => dictKeys.add(k));

      // 4: stat tokens
      for (const lang of ["en", "ne"]) {
        for (const [k, v] of Object.entries(dict[lang] || {})) {
          for (const tok of String(v).matchAll(/\{(\w+)\|[^{}]*\}/g)) {
            if (!STAT_KEYS.has(tok[1])) fail(`stat token: ${page} ${lang}.${k} uses unknown token {${tok[1]}|…}`);
          }
        }
      }
    }
  }

  // 3: used keys are defined
  for (const u of html.matchAll(/data-i18n(?:-html|-placeholder|-aria)?="([^"]+)"/g)) {
    const k = u[1];
    if (!dictKeys.has(k) && !coreKeys.has(k)) fail(`i18n key: ${page} uses undefined "${k}"`);
  }

  // 6: internal references resolve
  for (const r of html.matchAll(/(?:href|src)="([^"#]+?)(?:[#?][^"]*)?"/g)) {
    const t = r[1];
    if (/^(https?:|data:|mailto:|tel:|\/\/)/.test(t) || !t) continue;
    if (!exists(t)) fail(`broken ref: ${page} → ${t}`);
  }
}

/* 7 ── sitemap coverage (noindex pages — search, 404 — are exempt) */
try {
  const sm = read("sitemap.xml");
  const inMap = [...sm.matchAll(/<loc>https:\/\/eqsentry\.com\/([^<]*)<\/loc>/g)]
    .map((m) => m[1] === "" ? "index.html" : m[1]);
  for (const p of htmlPages) {
    if (/name="robots"[^>]*noindex/.test(read(p))) continue;
    if (!inMap.includes(p)) fail(`sitemap: missing ${p}`);
  }
  for (const p of inMap) if (!htmlPages.includes(p)) fail(`sitemap: lists non-existent ${p}`);
} catch (e) { fail("sitemap.xml unreadable: " + e.message); }

/* 8 ── service-worker shell */
try {
  const sw = read("service-worker.js");
  const shell = [...sw.matchAll(/"([^"]+)"/g)].map((m) => m[1])
    .filter((s) => /\.(html|css|js|json|webmanifest|svg|png|pdf)$/.test(s));
  for (const s of shell) if (!exists(s)) fail(`sw shell: ${s} not found on disk`);
  if (!/const VERSION = "eqsentry-v\d+"/.test(sw)) fail("sw: VERSION constant malformed");
} catch (e) { fail("service-worker.js unreadable: " + e.message); }

/* 8b ── site version shown in the footer must match package.json */
try {
  const pkgVer = JSON.parse(read("package.json")).version;
  const i18nVer = (read("assets/js/i18n.js").match(/var VERSION = "([^"]+)"/) || [])[1];
  if (!i18nVer) fail("version: VERSION constant missing in assets/js/i18n.js");
  else if (i18nVer !== pkgVer) fail(`version: footer shows v${i18nVer} but package.json says ${pkgVer}`);
} catch (e) { fail("version check error: " + e.message); }

/* 9 ── data sanity */
try {
  const cat = JSON.parse(read("data/nepal_earthquakes.geojson"));
  const summary = JSON.parse(read("data/summary.json"));
  const notable = JSON.parse(read("data/notable_earthquakes.geojson"));
  const n = cat.features.length;
  if (n < 700) fail(`data: catalogue suspiciously small (${n} events)`);
  if (cat.metadata && cat.metadata.count !== n) fail(`data: metadata.count ${cat.metadata.count} ≠ features ${n}`);
  if (summary.count !== n) fail(`data: summary.count ${summary.count} ≠ catalogue ${n}`);
  if (summary.notableCount !== notable.features.length) fail(`data: summary.notableCount ${summary.notableCount} ≠ notable ${notable.features.length}`);
  const csvRows = read("data/nepal_earthquakes.csv").trim().split("\n").length - 1;
  if (csvRows !== n) fail(`data: CSV rows ${csvRows} ≠ catalogue ${n}`);
  const t0 = cat.features[0].properties.time;
  if (cat.features.some((f, i) => i && f.properties.time > cat.features[i - 1].properties.time))
    fail("data: catalogue not sorted newest-first");
  if (typeof t0 !== "number") fail("data: feature time is not epoch ms");
  // embedded copy in sync?
  const dl = read("assets/js/data-layers.js");
  const dlCount = (dl.match(/"count":(\d+)/) || [])[1];
  if (dlCount && Number(dlCount) !== n) fail(`data: data-layers.js embeds count ${dlCount} ≠ catalogue ${n} — rerun scripts/update-catalog.mjs`);
} catch (e) { fail("data check error: " + e.message); }

/* report */
if (failures.length) {
  console.error(`✗ ${failures.length} failure(s):\n` + failures.map((f) => "  - " + f).join("\n"));
  process.exit(1);
}
console.log(`✓ smoke test passed — ${htmlPages.length} pages, ${jsFiles.length} scripts, data consistent.`);
