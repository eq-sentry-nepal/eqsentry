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
          var deaths = p.deaths ? p.deaths.toLocaleString() + " " + window.EQ.t("nb.deaths") : "";
          return '<div class="card reveal in" style="padding:20px">' +
            '<div style="font-family:var(--mono);color:var(--ink-faint);font-size:.78rem">' + p.year + '</div>' +
            '<div style="font-family:var(--mono);font-size:1.7rem;font-weight:700;color:var(--accent);line-height:1.1;margin:.2rem 0">M' + p.mag.toFixed(1) + '</div>' +
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
    function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
    function magColor(m) { if (m == null) return "#9aa3af"; if (m < 4) return "#34D399"; if (m < 5) return "#FB923C"; if (m < 6) return "#F97316"; if (m < 7) return "#EF4444"; return "#b91c1c"; }
    function catRecent() {
      var cat = (window.EQ_DATA && window.EQ_DATA.catalog && window.EQ_DATA.catalog.features) || [];
      return cat.map(function (f) { var p = f.properties; return { mag: p.mag, place: p.place, time: p.time, source: "USGS" }; }).sort(function (a, b) { return b.time - a.time; });
    }
    function render(list) {
      if (!list || !list.length) list = catRecent();
      if (!list.length) { feed.innerHTML = '<div class="feed-empty">' + window.EQ.t("la.empty") + '</div>'; return; }
      feed.innerHTML = list.slice(0, 6).map(function (q) {
        var col = magColor(q.mag);
        return '<a class="feed-item" href="map.html">' +
          '<span class="fi-mag" style="background:' + col + '">' + (q.mag != null ? q.mag.toFixed(1) : "?") + '</span>' +
          '<span class="fi-meta"><span class="fi-place">' + esc(q.place || "—") + '</span>' +
          '<span class="fi-time">' + window.EQ.fmtAgo(q.time) + (q.source ? ' · <b style="color:var(--ink-soft)">' + q.source + '</b>' : '') + '</span></span>' +
          '<span class="fi-arrow">→</span></a>';
      }).join("");
    }
    if (window.EQEngine) window.EQEngine.onUpdate(function (m) { render(m.recent); });
    else render(catRecent());
    document.addEventListener("eq:langchange", function () { var m = window.EQEngine && window.EQEngine.get(); render(m ? m.recent : null); });
  })();
})();
