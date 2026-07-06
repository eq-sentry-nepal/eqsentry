/* ==========================================================================
   EQ Sentry — site health & status page (status.html).
   Runs live checks from the visitor's browser: the site's own shell, the
   USGS and EMSC feeds, CARTO map tiles, bundled-catalogue freshness, the
   service worker / offline cache, the optional alerts backend, and the
   device's own connectivity. The overall state renders as an animated
   seismogram monitor; every completed run is logged locally (check history)
   alongside the device's captured error log. Re-runs every 60 s. Bilingual.
   ========================================================================== */
(function () {
  "use strict";
  var grid = document.getElementById("stGrid");
  if (!grid) return;
  function T(k) { return window.EQ ? window.EQ.t(k) : k; }
  function lang() { return window.EQ ? window.EQ.getLang() : "en"; }
  function api() { return window.EQ_API ? String(window.EQ_API).replace(/\/+$/, "") : ""; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  var SLOW = 4000, TIMEOUT = 8000, HKEY = "eqsentry_statuslog", EKEY = "eqsentry_errlog";
  var results = {};
  var CHECKS = [
    { id: "site", core: true }, { id: "usgs", core: true }, { id: "emsc", core: true },
    { id: "tiles", core: false }, { id: "cat", core: false }, { id: "sw", core: false },
    { id: "api", core: false }, { id: "net", core: false }
  ];

  /* seismogram trace paths for each overall state */
  var TRACE = {
    wait: "M0,18 L18,18 L24,12 L30,24 L36,18 L58,18 L64,10 L70,26 L76,18 L98,18 L104,13 L110,23 L116,18 L140,18",
    ok:   "M0,18 L20,18 L26,14 L32,22 L38,18 L64,18 L70,15 L76,21 L82,18 L108,18 L114,16 L120,20 L126,18 L140,18",
    slow: "M0,18 L14,18 L19,6 L24,30 L29,18 L44,18 L49,9 L54,27 L59,18 L76,18 L82,4 L88,32 L94,18 L112,18 L117,10 L122,26 L127,18 L140,18",
    fail: "M0,18 L44,18 M60,6 L66,30 L72,12 M96,18 L140,18"
  };

  /* ---------- helpers ---------- */
  function timed(promiseFactory) {
    var t0 = performance.now();
    return new Promise(function (resolve) {
      var done = false;
      var to = setTimeout(function () { if (!done) { done = true; resolve({ ok: false, ms: TIMEOUT }); } }, TIMEOUT);
      promiseFactory().then(function (ok) {
        if (done) return; done = true; clearTimeout(to);
        resolve({ ok: ok !== false, ms: Math.round(performance.now() - t0) });
      }, function () {
        if (done) return; done = true; clearTimeout(to);
        resolve({ ok: false, ms: Math.round(performance.now() - t0) });
      });
    });
  }
  function state(r) { return r.ok ? (r.ms > SLOW ? "slow" : "ok") : "fail"; }
  function fmtMs(ms) { return ms + " ms"; }
  function bust(u) { return u + (u.indexOf("?") < 0 ? "?" : "&") + "_=" + Date.now(); }
  function fmtT(t) {
    try { return new Intl.DateTimeFormat(lang() === "ne" ? "ne-NP" : "en-GB", { timeStyle: "medium" }).format(new Date(t)); }
    catch (e) { return new Date(t).toLocaleTimeString(); }
  }
  function ls(k, d) { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  /* ---------- individual checks ---------- */
  function checkSite() {
    return timed(function () {
      return fetch(bust("manifest.webmanifest"), { cache: "no-store" }).then(function (r) { return r.ok; });
    }).then(function (r) { results.site = { state: state(r), detail: r.ok ? fmtMs(r.ms) : "", ms: r.ms }; });
  }
  function checkUSGS() {
    var url = (typeof window.EQ_FEED_URL === "function") ? window.EQ_FEED_URL("2.5_day")
      : "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson";
    return timed(function () {
      return fetch(url, { cache: "no-store" }).then(function (r) {
        if (!r.ok) return false;
        return r.json().then(function (d) { results._usgsN = (d.features || []).length; return true; });
      });
    }).then(function (r) {
      results.usgs = { state: state(r), detail: r.ok ? fmtMs(r.ms) + " · " + (results._usgsN || 0) + " " + T("st.events") + " /24h (global)" : "", ms: r.ms };
    });
  }
  function checkEMSC() {
    var params = "format=json&limit=1&orderby=time";
    var url = (typeof window.EQ_EMSC_URL === "function") ? window.EQ_EMSC_URL(params)
      : "https://www.seismicportal.eu/fdsnws/event/1/query?" + params;
    return timed(function () {
      return fetch(url, { cache: "no-store" }).then(function (r) { return r.ok || r.status === 204; });
    }).then(function (r) { results.emsc = { state: state(r), detail: r.ok ? fmtMs(r.ms) : "", ms: r.ms }; });
  }
  function checkTiles() {
    return timed(function () {
      return new Promise(function (res, rej) {
        var img = new Image();
        img.onload = function () { res(true); };
        img.onerror = function () { rej(new Error("tile")); };
        img.src = bust("https://a.basemaps.cartocdn.com/dark_all/6/45/27.png");
      });
    }).then(function (r) { results.tiles = { state: state(r), detail: r.ok ? fmtMs(r.ms) : "" }; });
  }
  function checkCatalog() {
    return fetch(bust("data/summary.json"), { cache: "no-store" }).then(function (r) { return r.json(); })
      .then(function (s) {
        var days = s.generated ? Math.floor((Date.now() - Date.parse(s.generated)) / 864e5) : null;
        var detail = (s.count || 0).toLocaleString() + " " + T("st.events") +
          (days != null ? " · " + T("st.updated") + " " + days + "d" : "");
        var stale = days != null && days > 40;
        if (stale) detail = (s.count || 0).toLocaleString() + " " + T("st.events") + " · " + T("st.stale").replace("{d}", "40");
        results.cat = { state: stale ? "slow" : "ok", detail: detail };
      })
      .catch(function () { results.cat = { state: "fail", detail: "" }; });
  }
  function checkSW() {
    if (!("serviceWorker" in navigator)) {
      results.sw = { state: "na", detail: T("st.sw.no") }; return Promise.resolve();
    }
    return navigator.serviceWorker.getRegistration().then(function (reg) {
      if (reg && reg.active) {
        var p = window.caches ? caches.keys() : Promise.resolve([]);
        return p.then(function (keys) {
          var v = keys.filter(function (k) { return k.indexOf("eqsentry-") === 0; })[0];
          results.sw = { state: "ok", detail: T("st.sw.on") + (v ? " · " + v : "") };
        });
      }
      results.sw = { state: reg ? "slow" : "na", detail: T(reg ? "st.sw.wait" : "st.sw.off") };
    }).catch(function () { results.sw = { state: "na", detail: T("st.sw.off") }; });
  }
  function checkAPI() {
    if (!api()) {
      results.api = { state: "na", detail: T("st.api.static") }; return Promise.resolve();
    }
    return timed(function () {
      return fetch(api() + "/api/health", { cache: "no-store" }).then(function (r) {
        if (!r.ok) return false;
        return r.json().then(function (h) { results._api = h; return !!h.ok; });
      });
    }).then(function (r) {
      var h = results._api || {};
      results.api = { state: state(r), detail: r.ok ? fmtMs(r.ms) + " · SMS:" + (h.sms ? "✓" : "–") + " Email:" + (h.email ? "✓" : "–") + " Push:" + (h.push ? "✓" : "–") : "" };
    });
  }
  function checkNet() {
    var on = navigator.onLine !== false;
    results.net = { state: on ? "ok" : "fail", detail: T(on ? "st.net.on" : "st.net.off") };
    return Promise.resolve();
  }

  /* ---------- overall ---------- */
  function overallState() {
    var core = CHECKS.filter(function (c) { return c.core; }).map(function (c) { return (results[c.id] || {}).state; });
    if (!core.every(function (s) { return !!s; })) return "wait";
    var fails = core.filter(function (s) { return s === "fail"; }).length;
    var slows = core.filter(function (s) { return s === "slow"; }).length;
    return fails >= 2 ? "fail" : (fails || slows) ? "slow" : "ok";
  }

  /* ---------- render: cards + monitor ---------- */
  function pill(st) {
    if (st === "wait") return '<span class="st-pill sm wait">…</span>';
    var label = { ok: "st.ok", slow: "st.slow", fail: "st.fail", na: "st.na" }[st] || "st.ok";
    return '<span class="st-pill sm ' + st + '"><span class="st-dot ' + st + '"></span>' + T(label) + "</span>";
  }
  function render() {
    grid.innerHTML = CHECKS.map(function (c) {
      var r = results[c.id] || { state: "wait", detail: "" };
      return '<div class="card st-card" style="padding:16px 20px">' +
        '<div class="flex aic" style="justify-content:space-between;gap:10px">' +
        '<h3 style="margin:0;font-size:1rem">' + T("st.c." + c.id) + "</h3>" + pill(r.state) + "</div>" +
        '<p class="muted" style="margin:6px 0 0;font-size:.83rem">' + T("st.d." + c.id) + "</p>" +
        (r.detail ? '<p style="margin:8px 0 0;font-family:var(--mono);font-size:.8rem;color:var(--ink-soft)">' + r.detail + "</p>" : "") +
        "</div>";
    }).join("");

    var ov = overallState();
    var mon = document.getElementById("stMonitor");
    if (mon) {
      mon.className = "st-monitor " + ov;
      var tr = document.getElementById("stTrace");
      if (tr) tr.setAttribute("d", TRACE[ov] || TRACE.wait);
      var big = document.getElementById("stOverallTxt");
      if (big) big.textContent = T({ ok: "st.ov.ok", slow: "st.ov.warn", fail: "st.ov.down", wait: "st.ov.wait" }[ov]);
      var sub = document.getElementById("stOverallSub");
      if (sub) sub.textContent = T({ ok: "st.overall.ok", slow: "st.overall.warn", fail: "st.overall.down", wait: "st.checking" }[ov]);
    }
    var when = document.getElementById("stWhen");
    if (when) when.textContent = fmtT(Date.now());
    renderHistory(); renderErrors();
  }

  /* ---------- check history (device-local) ---------- */
  function logRun() {
    var ov = overallState(); if (ov === "wait") return;
    var fails = CHECKS.filter(function (c) { return /fail|slow/.test((results[c.id] || {}).state) && (results[c.id] || {}).state !== "na"; })
      .map(function (c) { return T("st.c." + c.id) + (results[c.id].state === "fail" ? " ✕" : " ~"); });
    var log = ls(HKEY, []);
    log.push({ t: Date.now(), ov: ov,
      ms: { site: (results.site || {}).ms, usgs: (results.usgs || {}).ms, emsc: (results.emsc || {}).ms },
      fails: fails });
    lsSet(HKEY, log.slice(-48));
  }
  function ovChip(ov) {
    return '<span class="st-pill sm ' + ov + '"><span class="st-dot ' + ov + '"></span>' +
      T({ ok: "st.ov.ok", slow: "st.ov.warn", fail: "st.ov.down" }[ov] || "st.ov.ok") + "</span>";
  }
  function renderHistory() {
    var body = document.getElementById("stHistBody"); if (!body) return;
    var log = ls(HKEY, []).slice().reverse().slice(0, 14);
    body.innerHTML = log.map(function (e) {
      var msTxt = [e.ms.site, e.ms.usgs, e.ms.emsc].map(function (m) { return m == null ? "–" : m; }).join(" / ");
      return "<tr><td class=\"mono\">" + fmtT(e.t) + "</td><td>" + ovChip(e.ov) + "</td>" +
        '<td class="mono">' + msTxt + " ms</td><td>" + (e.fails.length ? esc(e.fails.join(", ")) : "—") + "</td></tr>";
    }).join("");
    var none = document.getElementById("stHistNone");
    if (none) none.style.display = log.length ? "none" : "block";
  }

  /* ---------- error log (from monitor.js ring buffer) ---------- */
  function renderErrors() {
    var body = document.getElementById("stErrBody"); if (!body) return;
    var log = ls(EKEY, []).slice().reverse().slice(0, 12);
    body.innerHTML = log.map(function (e) {
      return "<tr><td class=\"mono\">" + fmtT(e.t) + "</td>" +
        "<td><b>" + esc(e.type) + "</b> " + esc((e.msg || "").slice(0, 90)) + "</td>" +
        '<td class="mono">' + esc((e.page || "") + (e.line ? ":" + e.line : "")) + "</td></tr>";
    }).join("");
    var none = document.getElementById("stErrNone");
    if (none) none.style.display = log.length ? "none" : "block";
    var tbl = body.closest("table"); if (tbl) tbl.style.display = log.length ? "" : "none";
  }

  /* ---------- run ---------- */
  var running = false;
  function runAll() {
    if (running) return; running = true;
    render();
    Promise.all([checkSite(), checkUSGS(), checkEMSC(), checkTiles(), checkCatalog(), checkSW(), checkAPI(), checkNet()])
      .then(function () { running = false; logRun(); render(); })
      .catch(function () { running = false; render(); });
  }

  var btn = document.getElementById("stRecheck");
  if (btn) btn.addEventListener("click", runAll);
  var clr = document.getElementById("stErrClear");
  if (clr) clr.addEventListener("click", function () { try { localStorage.removeItem(EKEY); } catch (e) {} renderErrors(); });
  window.addEventListener("online", function () { checkNet().then(render); });
  window.addEventListener("offline", function () { checkNet().then(render); });
  document.addEventListener("eq:langchange", render);
  setInterval(runAll, 60000);
  runAll();
})();
