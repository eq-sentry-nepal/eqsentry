/* ==========================================================================
   EQ Sentry — client-side error monitor.
   Captures uncaught JS errors, unhandled promise rejections and failed
   resource loads. Keeps a small ring buffer in localStorage (inspect with
   EQ_MONITOR.dump() in the console) and, when a backend is configured
   (window.EQ_API), reports up to 10 events per page view to /api/client-log.
   No personal data is collected. Injected on every page by i18n.js.
   ========================================================================== */
(function () {
  "use strict";
  var KEY = "eqsentry_errlog", MAX = 30, LIMIT = 10, sent = 0;

  function api() { return window.EQ_API ? String(window.EQ_API).replace(/\/+$/, "") : ""; }

  function record(type, msg, src, line) {
    var entry = {
      t: Date.now(), type: String(type || "error"),
      msg: String(msg == null ? "" : msg).slice(0, 300),
      src: String(src == null ? "" : src).slice(0, 200),
      line: Number(line) || 0,
      page: location.pathname + location.hash
    };
    try {
      var log = JSON.parse(localStorage.getItem(KEY) || "[]");
      log.push(entry);
      if (log.length > MAX) log = log.slice(-MAX);
      localStorage.setItem(KEY, JSON.stringify(log));
    } catch (e) { /* storage full/blocked — skip */ }
    if (api() && sent < LIMIT) {
      sent++;
      try {
        fetch(api() + "/api/client-log", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(entry), keepalive: true
        }).catch(function () {});
      } catch (e) {}
    }
  }

  // Uncaught errors + failed resource loads (capture phase sees <script>/<img>/<link> errors)
  window.addEventListener("error", function (e) {
    var t = e && e.target;
    if (t && t !== window && (t.tagName === "SCRIPT" || t.tagName === "LINK" || t.tagName === "IMG")) {
      record("resource", t.src || t.href || "", t.tagName.toLowerCase());
      return;
    }
    record("error", e.message, e.filename, e.lineno);
  }, true);

  window.addEventListener("unhandledrejection", function (e) {
    var r = e && e.reason;
    record("promise", r && r.message ? r.message : r,
      r && r.stack ? String(r.stack).split("\n").slice(0, 2).join(" | ") : "");
  });

  window.EQ_MONITOR = {
    log: record,
    dump: function () { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch (e) { return []; } },
    clear: function () { try { localStorage.removeItem(KEY); } catch (e) {} }
  };

  /* ---------- background health sampling (any open page) ----------
     Keeps the device-local status history warm and logs failures, so the
     status page reflects reality even if it is rarely opened. Light probes,
     every 5 minutes, only when visible/online and not on the status page
     (which runs its own richer checks). Respects Save-Data. */
  (function bgHealth() {
    if ((document.body && document.body.getAttribute("data-page")) === "status") return;
    var conn = navigator.connection || {};
    if (conn.saveData) return;
    var RKEY = "eqsentry_statusruns", DKEY = "eqsentry_statusdaily";
    function ls(k, d) { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } }
    function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
    function probe(url) {
      var t0 = Date.now();
      return fetch(url, { cache: "no-store", signal: AbortSignal.timeout(10000) })
        .then(function (r) { var ms = Date.now() - t0; return r.ok ? { state: ms > 4000 ? "slow" : "ok", ms: ms } : { state: "fail", ms: ms, err: "HTTP " + r.status }; })
        .catch(function (e) { return { state: "fail", ms: Date.now() - t0, err: String(e && e.message || e).slice(0, 80) }; });
    }
    function sample() {
      if (document.visibilityState !== "visible" || !navigator.onLine) return;
      Promise.all([
        probe("assets/js/config.js?bg=" + Date.now()),
        probe("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson"),
        probe("https://www.seismicportal.eu/fdsnws/event/1/query?format=json&limit=1")
      ]).then(function (r) {
        var run = { t: Date.now(), c: { site: r[0].state, usgs: r[1].state, emsc: r[2].state, tiles: "na", cat: "na", sw: "na", api: "na", net: navigator.onLine ? "ok" : "fail" },
                    ms: { site: r[0].ms, usgs: r[1].ms, emsc: r[2].ms } };
        var runs = ls(RKEY, []); runs.push(run); lsSet(RKEY, runs.slice(-400));
        var daily = ls(DKEY, {}); var dk = new Date(run.t).toISOString().slice(0, 10);
        var day = daily[dk] || (daily[dk] = {});
        Object.keys(run.c).forEach(function (id) {
          var st = run.c[id]; if (st === "na") return;
          var slot = day[id] || (day[id] = { ok: 0, slow: 0, fail: 0 });
          slot[st]++;
        });
        var keys = Object.keys(daily).sort();
        while (keys.length > 60) { delete daily[keys.shift()]; }
        lsSet(DKEY, daily);
        ["site", "usgs", "emsc"].forEach(function (id, i) {
          if (r[i].state === "fail") push({ t: run.t, type: "bgcheck", msg: id + " check failed: " + (r[i].err || "error") });
        });
      });
    }
    setTimeout(sample, 45000);
    setInterval(sample, 5 * 60 * 1000);
  })();
})();
