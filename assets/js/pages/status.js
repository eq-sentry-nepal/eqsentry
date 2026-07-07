/* ==========================================================================
   EQ Sentry — status page v3: uptime bars by hour / day / month.
   Checks run from the browser every minute while the page is open; every run
   is stored locally (plus per-day aggregates), and rendered as statuspage-
   style bar timelines per service. An admin panel pulls the server's own
   24/7 probe history and collected client errors (ADMIN_KEY protected).
   ========================================================================== */
(function () {
  "use strict";
  var rowsBox = document.getElementById("upRows");
  if (!rowsBox) return;
  function T(k) { return window.EQ ? window.EQ.t(k) : k; }
  function lang() { return window.EQ ? window.EQ.getLang() : "en"; }
  function api() { return window.EQ_API ? String(window.EQ_API).replace(/\/+$/, "") : ""; }
  function dg(s) { return (window.EQ && window.EQ.dg) ? window.EQ.dg(s) : String(s); }

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  var SLOW = 4000, TIMEOUT = 8000;
  var RKEY = "eqsentry_statusruns", DKEY = "eqsentry_statusdaily", EKEY = "eqsentry_errlog", AKEY = "eqsentry_adminkey";
  var period = "day";
  var results = {};
  var CHECKS = [
    { id: "site", core: true }, { id: "usgs", core: true }, { id: "emsc", core: true },
    { id: "tiles", core: false }, { id: "cat", core: false }, { id: "sw", core: false },
    { id: "api", core: false }, { id: "net", core: false }
  ];
  var RANK = { na: 0, ok: 1, slow: 2, fail: 3 };

  /* ---------- storage ---------- */
  function ls(k, d) { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function dayKey(t) { return new Date(t).toISOString().slice(0, 10); }

  /* ---------- helpers ---------- */
  function timed(fn) {
    var t0 = performance.now();
    return new Promise(function (resolve) {
      var done = false;
      var to = setTimeout(function () { if (!done) { done = true; resolve({ ok: false, ms: TIMEOUT }); } }, TIMEOUT);
      fn().then(function (ok) {
        if (done) return; done = true; clearTimeout(to);
        resolve({ ok: ok !== false, ms: Math.round(performance.now() - t0) });
      }, function () {
        if (done) return; done = true; clearTimeout(to);
        resolve({ ok: false, ms: Math.round(performance.now() - t0) });
      });
    });
  }
  function stOf(r) { return r.ok ? (r.ms > SLOW ? "slow" : "ok") : "fail"; }
  function bust(u) { return u + (u.indexOf("?") < 0 ? "?" : "&") + "_=" + Date.now(); }
  function fmtT(t, style) {
    try { return new Intl.DateTimeFormat(lang() === "ne" ? "ne-NP" : "en-GB", style || { timeStyle: "medium" }).format(new Date(t)); }
    catch (e) { return new Date(t).toLocaleTimeString(); }
  }

  /* ---------- checks (unchanged behaviour) ---------- */
  function checkSite() {
    return timed(function () { return fetch(bust("manifest.webmanifest"), { cache: "no-store" }).then(function (r) { return r.ok; }); })
      .then(function (r) { results.site = { state: stOf(r), detail: r.ok ? dg(r.ms + " ms") : "", ms: r.ms }; });
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
      results.usgs = { state: stOf(r), detail: r.ok ? dg(r.ms + " ms · " + (results._usgsN || 0)) + " " + T("st.events") + dg("/24h") : "", ms: r.ms };
    });
  }
  function checkEMSC() {
    var params = "format=json&limit=1&orderby=time";
    var url = (typeof window.EQ_EMSC_URL === "function") ? window.EQ_EMSC_URL(params)
      : "https://www.seismicportal.eu/fdsnws/event/1/query?" + params;
    return timed(function () {
      return fetch(url, { cache: "no-store" }).then(function (r) { return r.ok || r.status === 204; });
    }).then(function (r) { results.emsc = { state: stOf(r), detail: r.ok ? dg(r.ms + " ms") : "", ms: r.ms }; });
  }
  function checkTiles() {
    return timed(function () {
      return new Promise(function (res, rej) {
        var img = new Image();
        img.onload = function () { res(true); };
        img.onerror = function () { rej(new Error("tile")); };
        img.src = bust("https://a.basemaps.cartocdn.com/dark_all/6/45/27.png");
      });
    }).then(function (r) { results.tiles = { state: stOf(r), detail: r.ok ? dg(r.ms + " ms") : "" }; });
  }
  function checkCatalog() {
    return fetch(bust("data/summary.json"), { cache: "no-store" }).then(function (r) { return r.json(); })
      .then(function (s) {
        var days = s.generated ? Math.floor((Date.now() - Date.parse(s.generated)) / 864e5) : null;
        var stale = days != null && days > 40;
        results.cat = { state: stale ? "slow" : "ok",
          detail: dg((s.count || 0).toLocaleString()) + " " + T("st.events") +
            (stale ? " · " + T("st.stale").replace("{d}", dg("40")) : (days != null ? " · " + T("st.updated") + " " + dg(days + "d") : "")) };
      })
      .catch(function () { results.cat = { state: "fail", detail: "" }; });
  }
  function checkSW() {
    if (!("serviceWorker" in navigator)) { results.sw = { state: "na", detail: T("st.sw.no") }; return Promise.resolve(); }
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
    if (!api()) { results.api = { state: "na", detail: T("st.api.static") }; return Promise.resolve(); }
    return timed(function () {
      return fetch(api() + "/api/health", { cache: "no-store" }).then(function (r) {
        if (!r.ok) return false;
        return r.json().then(function (h) { results._api = h; return !!h.ok; });
      });
    }).then(function (r) {
      var h = results._api || {};
      results.api = { state: stOf(r), detail: r.ok ? dg(r.ms + " ms") + " · SMS:" + (h.sms ? "✓" : "–") + " Email:" + (h.email ? "✓" : "–") + " Push:" + (h.push ? "✓" : "–") : "" };
    });
  }
  function checkNet() {
    var on = navigator.onLine !== false;
    results.net = { state: on ? "ok" : "fail", detail: T(on ? "st.net.on" : "st.net.off") };
    return Promise.resolve();
  }

  /* ---------- record runs ---------- */
  function record() {
    var run = { t: Date.now(), c: {}, ms: { site: (results.site || {}).ms, usgs: (results.usgs || {}).ms, emsc: (results.emsc || {}).ms } };
    CHECKS.forEach(function (ch) { run.c[ch.id] = (results[ch.id] || {}).state || "na"; });
    var runs = ls(RKEY, []); runs.push(run); lsSet(RKEY, runs.slice(-400));
    var daily = ls(DKEY, {}); var dk = dayKey(run.t);
    var day = daily[dk] || (daily[dk] = {});
    CHECKS.forEach(function (ch) {
      var s = run.c[ch.id]; if (s === "na") return;
      var slot = day[ch.id] || (day[ch.id] = { ok: 0, slow: 0, fail: 0 });
      slot[s]++;
    });
    var keys = Object.keys(daily).sort();
    while (keys.length > 60) { delete daily[keys.shift()]; }
    lsSet(DKEY, daily);
  }

  /* ---------- bucketing ---------- */
  function buckets(id) {
    var out = [];
    if (period === "month") {
      var daily = ls(DKEY, {});
      for (var i = 29; i >= 0; i--) {
        var t = Date.now() - i * 864e5, dk = dayKey(t);
        var d = (daily[dk] || {})[id];
        if (!d) { out.push({ t: t, state: "na" }); continue; }
        out.push({ t: t, state: d.fail ? "fail" : d.slow ? "slow" : "ok", n: d.ok + d.slow + d.fail });
      }
      return out;
    }
    var span = period === "hour" ? 36e5 : 864e5;
    var step = period === "hour" ? 12e4 : 36e5;      // 2-min / 1-hour buckets
    var runs = ls(RKEY, []);
    var start = Date.now() - span;
    for (var t2 = start; t2 < Date.now(); t2 += step) {
      var worst = "na", n = 0;
      for (var j = 0; j < runs.length; j++) {
        var r = runs[j];
        if (r.t < t2 || r.t >= t2 + step) continue;
        var s = r.c[id]; if (!s || s === "na") continue;
        n++;
        if (RANK[s] > RANK[worst] || worst === "na") worst = s;
      }
      out.push({ t: t2, state: worst, n: n });
    }
    return out;
  }
  function uptimePct(bks) {
    var with_ = bks.filter(function (b) { return b.state !== "na"; });
    if (!with_.length) return null;
    return Math.round(1000 * with_.filter(function (b) { return b.state !== "fail"; }).length / with_.length) / 10;
  }
  function barHTML(bks, big) {
    return '<div class="up-bars' + (big ? " big" : "") + '">' + bks.map(function (b) {
      var tip = fmtT(b.t, period === "month" ? { dateStyle: "medium" } : { timeStyle: "short" }) +
        (b.state === "na" ? "" : " · " + T("st." + (b.state === "fail" ? "fail" : b.state)));
      return '<i class="' + b.state + '" title="' + esc(tip) + '"></i>';
    }).join("") + "</div>";
  }

  /* ---------- render ---------- */
  function stateWord(s) {
    return '<span class="up-word ' + s + '">' + T(s === "na" ? "st.na" : "st." + s) + "</span>";
  }
  function render() {
    var coreStates = [];
    rowsBox.innerHTML = CHECKS.map(function (ch) {
      var r = results[ch.id] || { state: "na", detail: "" };
      if (ch.core && r.state !== "na") coreStates.push(r.state);
      var bks = buckets(ch.id), pct = uptimePct(bks);
      var pctTxt = pct == null ? T("st.nodata") : dg(pct + "%");
      return '<div class="up-row">' +
        '<div class="up-rowhead">' +
          '<div><b>' + T("st.c." + ch.id) + "</b>" + stateWord(r.state) +
            '<span class="up-detail">' + (r.detail || "") + "</span></div>" +
          '<span class="up-pct">' + pctTxt + "</span>" +
        "</div>" + barHTML(bks) +
        '<p class="up-sub">' + T("st.d." + ch.id) + "</p></div>";
    }).join("");

    // overall
    var ov = !coreStates.length ? "wait"
      : coreStates.filter(function (s) { return s === "fail"; }).length >= 2 ? "fail"
      : coreStates.some(function (s) { return s !== "ok"; }) ? "slow" : "ok";
    var now = document.getElementById("upNow");
    if (now) {
      now.className = ov;
      now.textContent = T({ ok: "st.ov.ok", slow: "st.ov.warn", fail: "st.ov.down", wait: "st.ov.wait" }[ov]);
    }
    var coreB = ["site", "usgs", "emsc"].map(function (id) { return uptimePct(buckets(id)); })
      .filter(function (p) { return p != null; });
    var pctEl = document.getElementById("upPct");
    if (pctEl) pctEl.textContent = coreB.length ? dg((Math.round(10 * coreB.reduce(function (a, b) { return a + b; }, 0) / coreB.length) / 10) + "%") : T("st.nodata");
    var when = document.getElementById("stWhen");
    if (when) when.textContent = fmtT(Date.now());
    renderLocalLogs();
  }

  /* ---------- device-local full logs ---------- */
  function ovOfRun(r) {
    var cs = ["site", "usgs", "emsc"].map(function (id) { return r.c[id]; });
    return cs.filter(function (s) { return s === "fail"; }).length >= 2 ? "fail"
      : cs.some(function (s) { return s && s !== "ok" && s !== "na"; }) ? "slow" : "ok";
  }
  function renderLocalLogs() {
    var hb = document.getElementById("lgHistBody");
    if (hb) {
      var runs = ls(RKEY, []).slice().reverse().slice(0, 100);
      hb.innerHTML = runs.map(function (r) {
        var ov = ovOfRun(r);
        var issues = CHECKS.filter(function (c) { return /fail|slow/.test(r.c[c.id]); })
          .map(function (c) { return T("st.c." + c.id) + (r.c[c.id] === "fail" ? " ✕" : " ~"); });
        return "<tr><td class=\"mono\">" + fmtT(r.t) + "</td><td>" + stateWord(ov) + "</td>" +
          '<td class="mono">' + dg([r.ms.site, r.ms.usgs, r.ms.emsc].map(function (m) { return m == null ? "–" : m; }).join(" / ")) + "</td>" +
          "<td>" + (issues.length ? esc(issues.join(", ")) : "—") + "</td></tr>";
      }).join("");
      var none = document.getElementById("lgHistNone");
      if (none) none.style.display = runs.length ? "none" : "block";
    }
    var eb = document.getElementById("lgErrBody");
    if (eb) {
      var errs = ls(EKEY, []).slice().reverse().slice(0, 50);
      eb.innerHTML = errs.map(function (e) {
        return "<tr><td class=\"mono\">" + fmtT(e.t) + "</td>" +
          "<td><b>" + esc(e.type) + "</b> " + esc((e.msg || "").slice(0, 90)) + "</td>" +
          '<td class="mono">' + esc((e.page || "") + (e.line ? ":" + e.line : "")) + "</td></tr>";
      }).join("");
      var none2 = document.getElementById("lgErrNone");
      if (none2) none2.style.display = errs.length ? "none" : "block";
    }
  }
  function download(name, obj) {
    var blob = new Blob([JSON.stringify(obj, null, 1)], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 400);
  }

  /* ---------- admin panel (server-side history) ---------- */
  function adminHeaders() {
    var k = "";
    try { k = localStorage.getItem(AKEY) || ""; } catch (e) {}
    return k ? "?key=" + encodeURIComponent(k) + "&" : "?";
  }
  function loadAdmin() {
    if (!api()) return;
    var msg = document.getElementById("adMsg"), barsBox = document.getElementById("adBars");
    var q = adminHeaders() + "period=" + period;
    Promise.all([
      fetch(api() + "/api/status/history" + q, { cache: "no-store" }),
      fetch(api() + "/api/status/errors" + q, { cache: "no-store" })
    ]).then(function (rs) {
      if (rs[0].status === 401 || rs[1].status === 401) { if (msg) msg.textContent = T("ad.denied"); return null; }
      return Promise.all(rs.map(function (r) { return r.json(); }));
    }).then(function (data) {
      if (!data) return;
      var hist = data[0], errs = data[1];
      if (msg) msg.textContent = "";
      var mk = function (labelKey, msKeyName) {
        var bks = hist.buckets.map(function (b) {
          return { t: b.t, state: b.n ? b.state : "na" };
        });
        return '<div class="up-row"><div class="up-rowhead"><div><b>' + T(labelKey) + "</b></div>" +
          '<span class="up-pct">' + (hist.uptime == null ? T("st.nodata") : dg(hist.uptime + "%")) + "</span></div>" +
          barHTML(bks) + "</div>";
      };
      if (barsBox) barsBox.innerHTML = mk("ad.usgs") + mk("ad.emsc");
      var meta = document.getElementById("adMeta");
      if (meta && hist.server) {
        var up = hist.server.uptime_s, ustr = up > 86400 ? Math.floor(up / 86400) + "d " + Math.floor(up % 86400 / 3600) + "h" : Math.floor(up / 3600) + "h " + Math.floor(up % 3600 / 60) + "m";
        meta.textContent = T("ad.meta").replace("{up}", dg(ustr)).replace("{node}", dg(hist.server.node))
          .replace("{n}", dg(hist.samples)).replace("{pct}", hist.uptime == null ? "—" : dg(hist.uptime));
      }
      var eb = document.getElementById("adErrBody");
      if (eb) {
        eb.innerHTML = (errs.errors || []).slice(0, 100).map(function (e) {
          return "<tr><td class=\"mono\">" + fmtT(Date.parse(e.at)) + "</td>" +
            "<td><b>" + esc(e.type) + "</b> " + esc((e.msg || "").slice(0, 90)) + "</td>" +
            '<td class="mono">' + esc((e.page || "") + (e.line ? ":" + e.line : "")) + "</td></tr>";
        }).join("");
        var none = document.getElementById("adErrNone");
        if (none) none.style.display = (errs.errors || []).length ? "none" : "block";
      }
    }).catch(function () { if (msg) msg.textContent = T("ad.err"); });
  }
  function initAdmin() {
    var panel = document.getElementById("adPanel"), stat = document.getElementById("adStatic");
    if (!api()) { if (stat) stat.style.display = "block"; return; }
    if (panel) panel.style.display = "block";
    var input = document.getElementById("adKey"), btn = document.getElementById("adConnect");
    try { if (input) input.value = localStorage.getItem(AKEY) || ""; } catch (e) {}
    if (btn) btn.addEventListener("click", function () {
      try { localStorage.setItem(AKEY, input ? input.value.trim() : ""); } catch (e) {}
      loadAdmin();
    });
    loadAdmin();
  }

  /* ---------- run ---------- */
  var running = false;
  function runAll() {
    if (running) return; running = true;
    render();
    Promise.all([checkSite(), checkUSGS(), checkEMSC(), checkTiles(), checkCatalog(), checkSW(), checkAPI(), checkNet()])
      .then(function () { running = false; record(); render(); })
      .catch(function () { running = false; render(); });
  }

  // period tabs
  var seg = document.getElementById("stPeriod");
  if (seg) seg.querySelectorAll("button").forEach(function (b) {
    b.addEventListener("click", function () {
      seg.querySelectorAll("button").forEach(function (x) { x.classList.remove("active"); });
      b.classList.add("active");
      period = b.getAttribute("data-value");
      render(); loadAdmin();
    });
  });
  var btn = document.getElementById("stRecheck");
  if (btn) btn.addEventListener("click", runAll);
  var ex1 = document.getElementById("lgExport");
  if (ex1) ex1.addEventListener("click", function () {
    download("eqsentry-status-log.json", { runs: ls(RKEY, []), daily: ls(DKEY, {}) });
  });
  var ex2 = document.getElementById("lgErrExport");
  if (ex2) ex2.addEventListener("click", function () { download("eqsentry-error-log.json", ls(EKEY, [])); });
  var clr = document.getElementById("lgErrClear");
  if (clr) clr.addEventListener("click", function () { try { localStorage.removeItem(EKEY); } catch (e) {} renderLocalLogs(); });
  window.addEventListener("online", function () { checkNet().then(render); });
  window.addEventListener("offline", function () { checkNet().then(render); });
  document.addEventListener("eq:langchange", render);
  setInterval(runAll, 60000);
  initAdmin();
  runAll();
})();
