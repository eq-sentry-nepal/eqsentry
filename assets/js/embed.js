/* EQ Sentry — embeddable mini widget. Self-contained: no framework, no cookies.
   Params: ?lang=ne  ?theme=light  ?n=5 (rows). Usage:
   <iframe src="https://eq-sentry-nepal.github.io/eqsentry/embed.html" width="100%" height="260" style="border:0" title="EQ Sentry"></iframe> */
(function () {
  "use strict";
  var Q = {}; location.search.replace(/[?&]([^=&]+)=([^&]*)/g, function (_, k, v) { Q[k] = decodeURIComponent(v); });
  var NE = Q.lang === "ne", N = Math.min(8, +Q.n || 5);
  if (Q.theme === "light") document.body.parentNode.className = "light";
  var T = NE
    ? { title: "पछिल्ला भूकम्प — नेपाल क्षेत्र", upd: "अद्यावधिक", m: "मि.", h: "घण्टा", d: "दिन", now: "भर्खरै", empty: "पछिल्लो अवधिमा घटना छैन" }
    : { title: "Recent earthquakes — Nepal region", upd: "updated", m: "min", h: "hr", d: "d", now: "just now", empty: "No recent events" };
  var ND = ["०","१","२","३","४","५","६","७","८","९"];
  function dg(s) { s = String(s); return NE ? s.replace(/[0-9]/g, function (d) { return ND[+d]; }) : s; }
  function col(m) { return m == null ? "#9aa3af" : m < 4 ? "#34D399" : m < 5 ? "#FB923C" : m < 6 ? "#F97316" : "#EF4444"; }
  function ago(t) {
    var s = (Date.now() - t) / 1e3;
    if (s < 90) return T.now;
    if (s < 5400) return dg(Math.round(s / 60)) + " " + T.m;
    if (s < 129600) return dg(Math.round(s / 3600)) + " " + T.h;
    return dg(Math.round(s / 86400)) + " " + T.d;
  }
  function esc(x) { return String(x == null ? "" : x).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  document.getElementById("eqwTitle").textContent = T.title;
  function load() {
    fetch("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.geojson")
      .then(function (r) { return r.json(); })
      .then(function (d) {
        var evs = (d.features || []).map(function (f) {
          var c = f.geometry.coordinates;
          return { m: f.properties.mag, p: f.properties.place, t: f.properties.time, lat: c[1], lon: c[0] };
        }).filter(function (e) { return e.lat >= 26 && e.lat <= 31.5 && e.lon >= 79 && e.lon <= 89.5; })
          .sort(function (a, b) { return b.t - a.t; }).slice(0, N);
        var el = document.getElementById("eqwList");
        if (!evs.length) { el.innerHTML = '<div class="eqw-empty">' + T.empty + "</div>"; return; }
        el.innerHTML = evs.map(function (e) {
          return '<a class="eqw-row" href="https://eq-sentry-nepal.github.io/eqsentry/map.html" target="_blank" rel="noopener">' +
            '<span class="eqw-m" style="background:' + col(e.m) + '">' + dg(e.m != null ? e.m.toFixed(1) : "?") + '</span>' +
            '<span class="eqw-p">' + esc(e.p || "—") + '</span><span class="eqw-t">' + ago(e.t) + "</span></a>";
        }).join("");
        document.getElementById("eqwUpd").textContent = T.upd + " " + ago(Date.now() - 1);
      }).catch(function () {});
  }
  load(); setInterval(load, 3e5);
})();
