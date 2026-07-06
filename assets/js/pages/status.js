/* ==========================================================================
   EQ Sentry — site health & status page (status.html).
   Runs live checks from the visitor's browser: the site's own shell, the
   USGS and EMSC feeds, CARTO map tiles, bundled-catalogue freshness, the
   service worker / offline cache, the optional alerts backend, and the
   device's own connectivity. Re-runs every 60 s and on demand. Bilingual.
   ========================================================================== */
(function () {
  "use strict";
  var grid = document.getElementById("stGrid");
  if (!grid) return;
  function T(k) { return window.EQ ? window.EQ.t(k) : k; }
  function lang() { return window.EQ ? window.EQ.getLang() : "en"; }
  function api() { return window.EQ_API ? String(window.EQ_API).replace(/\/+$/, "") : ""; }

  var SLOW = 4000, TIMEOUT = 8000;
  var results = {};   // id → {state:'ok'|'slow'|'fail'|'na'|'wait', detail:fn|string, ms}
  var CHECKS = [
    { id: "site", core: true }, { id: "usgs", core: true }, { id: "emsc", core: true },
    { id: "tiles", core: false }, { id: "cat", core: false }, { id: "sw", core: false },
    { id: "api", core: false }, { id: "net", core: false }
  ];

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

  /* ---------- individual checks ---------- */
  function checkSite() {
    return timed(function () {
      return fetch(bust("manifest.webmanifest"), { cache: "no-store" }).then(function (r) { return r.ok; });
    }).then(function (r) {
      results.site = { state: state(r), detail: r.ok ? fmtMs(r.ms) : "" };
    });
  }
  function checkUSGS() {
    var url = (typeof window.EQ_FEED_URL === "function") ? window.EQ_FEED_URL("2.5_day")
      : "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson";
    return timed(function () {
      return fetch(url, { cache: "no-store" }).then(function (r) {
        if (!r.ok) return false;
        return r.json().then(function (d) {
          results._usgsN = (d.features || []).length;
          return true;
        });
      });
    }).then(function (r) {
      results.usgs = { state: state(r), detail: r.ok ? fmtMs(r.ms) + " · " + (results._usgsN || 0) + " " + T("st.events") + " /24h (global)" : "" };
    });
  }
  function checkEMSC() {
    var params = "format=json&limit=1&orderby=time";
    var url = (typeof window.EQ_EMSC_URL === "function") ? window.EQ_EMSC_URL(params)
      : "https://www.seismicportal.eu/fdsnws/event/1/query?" + params;
    return timed(function () {
      return fetch(url, { cache: "no-store" }).then(function (r) { return r.ok || r.status === 204; });
    }).then(function (r) {
      results.emsc = { state: state(r), detail: r.ok ? fmtMs(r.ms) : "" };
    });
  }
  function checkTiles() {
    return timed(function () {
      return new Promise(function (res, rej) {
        var img = new Image();
        img.onload = function () { res(true); };
        img.onerror = function () { rej(new Error("tile")); };
        img.src = bust("https://a.basemaps.cartocdn.com/dark_all/6/45/27.png");
      });
    }).then(function (r) {
      results.tiles = { state: state(r), detail: r.ok ? fmtMs(r.ms) : "" };
    });
  }
  function checkCatalog() {
    var w = window.EQData ? window.EQData.whenReady() : Promise.resolve();
    // data-eqdata isn't set on this page, so fetch the small summary instead
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

  /* ---------- render ---------- */
  function pill(st) {
    var label = { ok: "st.ok", slow: "st.slow", fail: "st.fail", na: "st.na", wait: "st.checking" }[st] || "st.ok";
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

    var core = CHECKS.filter(function (c) { return c.core; }).map(function (c) { return (results[c.id] || {}).state; });
    var overall = document.getElementById("stOverall");
    if (overall && core.every(function (s) { return !!s; })) {
      var fails = core.filter(function (s) { return s === "fail"; }).length;
      var slows = core.filter(function (s) { return s === "slow"; }).length;
      var st = fails >= 2 ? "fail" : (fails || slows) ? "slow" : "ok";
      overall.className = "st-pill " + st;
      overall.innerHTML = '<span class="st-dot ' + st + '"></span>' +
        T(st === "ok" ? "st.overall.ok" : st === "slow" ? "st.overall.warn" : "st.overall.down");
    }
    var when = document.getElementById("stWhen");
    if (when) {
      try { when.textContent = new Intl.DateTimeFormat(lang() === "ne" ? "ne-NP" : "en-GB", { timeStyle: "medium" }).format(new Date()); }
      catch (e) { when.textContent = new Date().toLocaleTimeString(); }
    }
  }

  var running = false;
  function runAll() {
    if (running) return; running = true;
    render();
    Promise.all([checkSite(), checkUSGS(), checkEMSC(), checkTiles(), checkCatalog(), checkSW(), checkAPI(), checkNet()])
      .then(function () { running = false; render(); })
      .catch(function () { running = false; render(); });
  }

  var btn = document.getElementById("stRecheck");
  if (btn) btn.addEventListener("click", runAll);
  window.addEventListener("online", function () { checkNet().then(render); });
  window.addEventListener("offline", function () { checkNet().then(render); });
  document.addEventListener("eq:langchange", render);
  setInterval(runAll, 60000);
  runAll();
})();
