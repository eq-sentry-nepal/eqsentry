/* EQ Sentry — home page: notable-events grid + recent-quakes feed.
   (Hero readout, pulse stats and the live banner are driven by engine.js via
   [data-eq] attributes.) Extracted from index.html so the CSP can forbid
   inline scripts. Requires i18n.js (window.EQ); engine.js recommended. */
(function () {
  "use strict";

  /* Notable events cards from stored data */
  (function () {
    var grid = document.getElementById("notableGrid");
    if (!grid) return;
    function render() {
      var lang = window.EQ.getLang();
      var nbP = (window.EQ_DATA && window.EQ_DATA.notable)
        ? Promise.resolve(window.EQ_DATA.notable)
        : fetch("data/notable_earthquakes.geojson").then(function (r) { return r.json(); });
      nbP.then(function (fc) {
        var ev = fc.features.map(function (f) { return f.properties; }).sort(function (a, b) { return b.year - a.year; });
        grid.innerHTML = ev.map(function (p) {
          var name = lang === "ne" ? p.name_ne : p.name_en;
          var deaths = p.deaths ? window.EQ.dg(p.deaths.toLocaleString()) + " " + window.EQ.t("nb.deaths") : "";
          return '<div class="card reveal in" style="padding:20px">' +
            '<div style="font-family:var(--mono);color:var(--ink-faint);font-size:.78rem">' + window.EQ.dg(p.year) + '</div>' +
            '<div style="font-family:var(--mono);font-size:1.7rem;font-weight:700;color:var(--accent);line-height:1.1;margin:.2rem 0">' + window.EQ.dg("M" + p.mag.toFixed(1)) + '</div>' +
            '<div style="font-weight:600;color:var(--ink);font-size:.95rem;margin-bottom:.3rem">' + name + '</div>' +
            '<div style="font-family:var(--mono);font-size:.78rem;color:var(--ink-faint)">' + deaths + '</div>' +
            '</div>';
        }).join("");
      }).catch(function () { grid.innerHTML = ""; });
    }
    render();
    document.addEventListener("eq:langchange", render);
  })();

  /* Recent-quakes feed — driven by the shared engine (USGS + EMSC, merged). */
  (function () {
    var feed = document.getElementById("quakeFeed"); if (!feed) return;
    function dg(s) { return (window.EQ && window.EQ.dg) ? window.EQ.dg(s) : String(s); }
  function PL(s) { return (window.EQ && window.EQ.place) ? window.EQ.place(s) : String(s == null ? "" : s); }
    function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
    function magColor(m) { if (m == null) return "#9aa3af"; if (m < 4) return "#34D399"; if (m < 5) return "#FB923C"; if (m < 6) return "#F97316"; if (m < 7) return "#EF4444"; return "#b91c1c"; }
    function catRecent() {
      var cat = (window.EQ_DATA && window.EQ_DATA.catalog && window.EQ_DATA.catalog.features) || [];
      return cat.map(function (f) { var p = f.properties; return { id: f.id, mag: p.mag, place: p.place, time: p.time, source: "USGS", src: "catalog" }; }).sort(function (a, b) { return b.time - a.time; });
    }
    function render(list) {
      if (!list || !list.length) list = catRecent();
      if (!list.length) { feed.innerHTML = '<div class="feed-empty">' + window.EQ.t("la.empty") + '</div>'; return; }
      feed.innerHTML = list.slice(0, 6).map(function (q) {
        var col = magColor(q.mag);
        var deep = q.id
          ? 'map.html#src=' + (q.src || (q.source === "EMSC" ? "emsc" : "live")) + '&eq=' + encodeURIComponent(q.id)
          : 'map.html';
        return '<a class="feed-item" href="' + deep + '">' +
          '<span class="fi-mag" style="background:' + col + '">' + dg(q.mag != null ? q.mag.toFixed(1) : "?") + '</span>' +
          '<span class="fi-meta"><span class="fi-place">' + esc(PL(q.place || "—")) + '</span>' +
          '<span class="fi-time">' + window.EQ.fmtAgo(q.time) + (q.source ? ' · <b style="color:var(--ink-soft)">' + q.source + '</b>' : '') + '</span></span>' +
          '<span class="fi-arrow">→</span></a>';
      }).join("");
    }
    if (window.EQEngine) window.EQEngine.onUpdate(function (m) { render(m.recent); });
    else render(catRecent());
    document.addEventListener("eq:langchange", function () { var m = window.EQEngine && window.EQEngine.get(); render(m ? m.recent : null); });
  })();

  /* ---------- "Since your last visit" digest ---------- */
  (function lastVisit() {
    var KEY = "eqsentry_lastseen";
    var card = document.getElementById("lvCard");
    var last = 0;
    try { last = +localStorage.getItem(KEY) || 0; localStorage.setItem(KEY, String(Date.now())); } catch (e) {}
    if (!card || !last || Date.now() - last < 6 * 36e5) return;
    function T(k) { return window.EQ ? window.EQ.t(k) : k; }
    function dg(x) { return (window.EQ && window.EQ.dg) ? window.EQ.dg(x) : String(x); }
    function PL(x) { return (window.EQ && window.EQ.place) ? window.EQ.place(x) : String(x == null ? "" : x); }
    function esc(x) { return String(x == null ? "" : x).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
    var done = false;
    function paint(model) {
      if (done || !model || !model.events) return;
      var evs = model.events.filter(function (q) { return q.time > last && q.mag != null && q.mag >= 2.5; });
      if (!evs.length) { done = true; return; }
      var big = evs.reduce(function (a, b) { return b.mag > a.mag ? b : a; });
      done = true;
      card.innerHTML = '<div class="callout info" style="margin-bottom:16px;align-items:center">' +
        '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>' +
        '<p style="margin:0"><b>' + T("lv.t") + '</b> (' + (window.EQ ? window.EQ.fmtAgo(last) : "") + '): ' +
        T("lv.line").replace("{n}", dg(evs.length)).replace("{m}", dg("M" + big.mag.toFixed(1))).replace("{p}", esc(PL(big.place || ""))) +
        '</p><button type="button" class="btn btn-ghost" id="lvOk" style="margin-left:auto;flex:0 0 auto;font-size:.82rem">' + T("lv.ok") + '</button></div>';
      card.hidden = false;
      var ok = document.getElementById("lvOk");
      if (ok) ok.addEventListener("click", function () { card.hidden = true; });
    }
    function hook() { if (window.EQEngine) window.EQEngine.onUpdate(paint); else setTimeout(hook, 400); }
    hook();
  })();

  /* ---------- "On this day" in quake history ---------- */
  (function onThisDay() {
    var card = document.getElementById("otdCard"); if (!card) return;
    function T(k) { return window.EQ ? window.EQ.t(k) : k; }
    function dg(x) { return (window.EQ && window.EQ.dg) ? window.EQ.dg(x) : String(x); }
    function PL(x) { return (window.EQ && window.EQ.place) ? window.EQ.place(x) : String(x == null ? "" : x); }
    function esc(x) { return String(x == null ? "" : x).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
    var done = false;
    function paint() {
      if (done) return;
      var cat = window.EQ_DATA && window.EQ_DATA.catalog && window.EQ_DATA.catalog.features;
      if (!cat || !cat.length) return;
      done = true;
      var now = new Date(Date.now() + 5.75 * 36e5);           // Nepal time
      var mm = now.getUTCMonth(), dd = now.getUTCDate();
      var best = null;
      cat.forEach(function (f) {
        var p = f.properties; if (p.mag == null || p.mag < 5) return;
        var d = new Date(p.time + 5.75 * 36e5);
        if (d.getUTCMonth() === mm && d.getUTCDate() === dd && d.getUTCFullYear() !== now.getUTCFullYear()) {
          if (!best || p.mag > best.mag) best = p;
        }
      });
      if (!best) return;
      var y = new Date(best.time + 5.75 * 36e5).getUTCFullYear();
      var bs = window.EQ.bsYear ? T("u.bs") + " " + dg(window.EQ.bsYear(best.time)) : "";
      card.innerHTML = '<div class="callout info" style="margin-bottom:16px;align-items:center">' +
        '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 11h18"/></svg>' +
        '<p style="margin:0"><b>' + T("otd.t") + '</b>: ' +
        T("otd.line").replace("{y}", dg(y)).replace("{b}", bs).replace("{m}", dg("M" + best.mag.toFixed(1))).replace("{p}", esc(PL(best.place || ""))) +
        "</p></div>";
      card.hidden = false;
    }
    document.addEventListener("eq:dataready", paint);
    var tries = 0, iv = setInterval(function () { paint(); if (done || ++tries > 20) clearInterval(iv); }, 500);
    document.addEventListener("eq:langchange", function () { done = false; paint(); });
  })();
})();
