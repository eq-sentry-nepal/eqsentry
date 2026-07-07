/* ==========================================================================
   EQ Sentry — insights analytics pack.
   Adds to insights.html: "now & then" monthly summary, record book, energy
   timeline, Gutenberg–Richter chart, depth–magnitude scatter, aftershock
   explorer and a compare-two-quakes tool. Self-contained: reads the embedded
   catalogue (EQ_DATA), uses Chart.js + i18n.js already loaded by the page.
   ========================================================================== */
(function () {
  "use strict";
  function T(k) { return window.EQ ? window.EQ.t(k) : k; }
  function dg(s) { return (window.EQ && window.EQ.dg) ? window.EQ.dg(s) : String(s); }

  function lang() { return window.EQ ? window.EQ.getLang() : "en"; }
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function hav(aLat, aLon, bLat, bLon) {
    var R = 6371, r = function (d) { return d * Math.PI / 180; };
    var dLa = r(bLat - aLat), dLo = r(bLon - aLon);
    var x = Math.sin(dLa / 2) * Math.sin(dLa / 2) + Math.cos(r(aLat)) * Math.cos(r(bLat)) * Math.sin(dLo / 2) * Math.sin(dLo / 2);
    return 2 * R * Math.asin(Math.sqrt(x));
  }
  function magColor(m) {
    if (m == null) return "#6B7480";
    if (m >= 7) return "#b91c1c"; if (m >= 6) return "#EF4444";
    if (m >= 5) return "#F97316"; return "#FB923C";
  }
  function energyJ(m) { return Math.pow(10, 1.5 * m + 4.8); }
  function feltKm(m) { return Math.min(500, 12 * Math.pow(10, 0.30 * (m - 3))); }
  function sub(str, map) { return String(str).replace(/\{(\w+)\}/g, function (_, k) { return map[k] != null ? dg(map[k]) : "{" + k + "}"; }); }

  var Q = [], NOTABLE = [], minY = 0, maxY = 0;
  var charts = {};

  function grid() {
    return {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { backgroundColor: "#171C27", borderColor: "rgba(255,255,255,.14)", borderWidth: 1, titleColor: "#EEF1F6", bodyColor: "#AAB2BF" } },
      scales: {
        x: { grid: { color: "rgba(255,255,255,.05)" }, ticks: { color: "#6B7480", maxRotation: 0, autoSkip: true, maxTicksLimit: 12,
          callback: function (v) { var l = this.getLabelForValue ? this.getLabelForValue(v) : v; return dg(l); } } },
        y: { grid: { color: "rgba(255,255,255,.05)" }, ticks: { color: "#6B7480",
          callback: function (v) { return dg(v); } }, beginAtZero: true }
      }
    };
  }

  function init() {
    var w = window.EQData ? window.EQData.whenReady() : Promise.resolve();
    w.then(function () {
      var cat = (window.EQ_DATA && window.EQ_DATA.catalog && window.EQ_DATA.catalog.features) || [];
      if (!cat.length) return;
      Q = cat.map(function (f) {
        var p = f.properties, c = f.geometry.coordinates, d = new Date(p.time);
        return { mag: p.mag, time: p.time, depth: (c[2] != null ? c[2] : p.depth) || 0,
                 lat: c[1], lon: c[0], place: p.place, year: d.getUTCFullYear(), month: d.getUTCMonth() };
      }).filter(function (e) { return e.mag != null; });
      NOTABLE = ((window.EQ_DATA.notable && window.EQ_DATA.notable.features) || []).map(function (f) {
        var p = f.properties;
        return { mag: p.mag, year: p.year, month: p.date ? new Date(p.date).getUTCMonth() : null,
                 name_en: p.name_en, name_ne: p.name_ne, deaths: p.deaths, depth: p.depth_km, time: p.date ? Date.parse(p.date) : null };
      });
      var years = Q.map(function (e) { return e.year; });
      minY = Math.min.apply(null, years); maxY = Math.max.apply(null, years);

      nowAndThen(); records(); buildEnergy(); buildGR(); buildScatter();
      initAftershocks(); initCompare();
      document.addEventListener("eq:langchange", relabel);
    });
  }

  /* ---------- Now & then ---------- */
  function monthName(mi) {
    try { return new Intl.DateTimeFormat(lang() === "ne" ? "ne-NP" : "en-GB", { month: "long" }).format(new Date(Date.UTC(2000, mi, 1))); }
    catch (e) { return String(mi + 1); }
  }
  function nowAndThen() {
    var now = new Date(), m = now.getUTCMonth(), y = now.getUTCFullYear();
    var cur = Q.filter(function (e) { return e.year === y && e.month === m; });
    var el = $("ntMonth");
    if (el) {
      if (!cur.length) el.textContent = T("nt.month.none");
      else {
        var big = cur.reduce(function (a, b) { return b.mag > a.mag ? b : a; });
        el.textContent = sub(T(cur.length === 1 ? "nt.month.one" : "nt.month.line"),
          { n: cur.length, m: big.mag.toFixed(1), place: big.place || "—" });
      }
    }
    var histCount = Q.filter(function (e) { return e.month === m; }).length;
    var avg = (histCount / (maxY - minY + 1)).toFixed(1);
    var av = $("ntAvg"); if (av) av.textContent = sub(T("nt.month.avg"), { avg: avg }) + " · " + monthName(m);

    var hist = $("ntHist");
    if (hist) {
      var items = [];
      NOTABLE.forEach(function (n) { if (n.month === m) items.push({ year: n.year, mag: n.mag, label: lang() === "ne" ? n.name_ne : n.name_en }); });
      Q.forEach(function (e) {
        if (e.month === m && e.mag >= 6.3 && !items.some(function (i) { return i.year === e.year && Math.abs(i.mag - e.mag) < 0.4; }))
          items.push({ year: e.year, mag: e.mag, label: e.place });
      });
      items.sort(function (a, b) { return b.mag - a.mag; });
      hist.innerHTML = items.length
        ? items.slice(0, 5).map(function (i) {
            return '<div style="display:flex;gap:10px;align-items:baseline;padding:4px 0">' +
              '<b style="font-family:var(--mono);color:' + magColor(i.mag) + '">' + dg("M" + i.mag.toFixed(1)) + '</b>' +
              '<span>' + esc(i.label || "—") + '</span><span class="muted" style="margin-left:auto;font-family:var(--mono);font-size:.8rem">' + dg(i.year) + "</span></div>";
          }).join("")
        : '<p class="muted" style="margin:0">' + T("nt.hist.none") + "</p>";
    }
  }

  /* ---------- Record book ---------- */
  function records() {
    var deep = Q.reduce(function (a, b) { return b.depth > a.depth ? b : a; });
    var perYear = {}; Q.forEach(function (e) { perYear[e.year] = (perYear[e.year] || 0) + 1; });
    var act = null, quiet = null;
    for (var yy = minY; yy <= maxY; yy++) {
      var n = perYear[yy] || 0;
      if (!act || n > act.n) act = { y: yy, n: n };
      if (!quiet || n < quiet.n) quiet = { y: yy, n: n };
    }
    var m6 = Q.filter(function (e) { return e.mag >= 6; }).sort(function (a, b) { return a.time - b.time; });
    var gap = null;
    for (var i = 1; i < m6.length; i++) {
      var d = m6[i].time - m6[i - 1].time;
      if (!gap || d > gap.d) gap = { d: d, from: m6[i - 1], to: m6[i] };
    }
    set("recDeep", dg(Math.round(deep.depth) + " km")); set("recDeepP", dg(deep.year) + " · " + (deep.place || ""));
    set("recActive", dg(act.y)); set("recActiveN", dg(act.n) + " " + T("rec.evs"));
    set("recQuiet", dg(quiet.y)); set("recQuietN", dg(quiet.n) + " " + T("rec.evs"));
    if (gap) {
      set("recGap", sub(T("rec.gapv"), { d: Math.round(gap.d / 864e5).toLocaleString() }));
      set("recGapP", dg(gap.from.year) + " → " + dg(gap.to.year));
    }
  }
  function set(id, v) { var e = $(id); if (e) e.textContent = v; }

  /* ---------- Energy timeline ---------- */
  function buildEnergy() {
    var c = $("chartEnergy"); if (!c || typeof Chart === "undefined") return;
    var per = {}; Q.forEach(function (e) { per[e.year] = (per[e.year] || 0) + energyJ(e.mag); });
    var labels = [], data = [], cum = 0;
    for (var y = minY; y <= maxY; y++) { cum += per[y] || 0; labels.push(String(y)); data.push(cum / 1e15); }
    var o = grid(); o.scales.y.title = { display: true, text: "PJ", color: "#6B7480" };
    charts.energy = new Chart(c, {
      type: "line",
      data: { labels: labels, datasets: [{ data: data, borderColor: "#FF4D2E", backgroundColor: "rgba(255,77,46,.12)", fill: true, pointRadius: 0, borderWidth: 2, tension: 0.1 }] },
      options: o
    });
  }

  /* ---------- Gutenberg–Richter ---------- */
  function buildGR() {
    var c = $("chartGR"); if (!c || typeof Chart === "undefined") return;
    var bins = [], labels = [], pts = [];
    for (var m = 4.5; m <= 8.01; m += 0.5) bins.push(Math.round(m * 10) / 10);
    bins.forEach(function (m) {
      var n = Q.filter(function (e) { return e.mag >= m; }).length;
      labels.push("M" + m.toFixed(1) + "+"); pts.push(n > 0 ? n : null);
    });
    // b-value: least-squares slope of log10(N) vs M
    var xs = [], ys = [];
    bins.forEach(function (m, i) { if (pts[i]) { xs.push(m); ys.push(Math.log10(pts[i])); } });
    var b = null;
    if (xs.length > 2) {
      var n = xs.length, sx = 0, sy = 0, sxy = 0, sxx = 0;
      for (var i = 0; i < n; i++) { sx += xs[i]; sy += ys[i]; sxy += xs[i] * ys[i]; sxx += xs[i] * xs[i]; }
      b = -(n * sxy - sx * sy) / (n * sxx - sx * sx);
    }
    var o = grid(); o.scales.y.type = "logarithmic"; delete o.scales.y.beginAtZero;
    charts.gr = new Chart(c, {
      type: "bar",
      data: { labels: labels, datasets: [{ data: pts, backgroundColor: "rgba(34,211,238,.65)", hoverBackgroundColor: "#22d3ee", borderRadius: 4 }] },
      options: o
    });
    if (b != null) { var g = $("grB"); if (g) { g.setAttribute("data-b", b.toFixed(2)); g.textContent = sub(T("ins.c.gr.b"), { b: b.toFixed(2) }); } }
  }

  /* ---------- Depth vs magnitude scatter ---------- */
  function buildScatter() {
    var c = $("chartScatter"); if (!c || typeof Chart === "undefined") return;
    var pts = Q.map(function (e) { return { x: e.mag, y: e.depth }; });
    var cols = Q.map(function (e) { return magColor(e.mag); });
    var o = grid();
    o.scales.y.reverse = true; o.scales.y.beginAtZero = true;
    o.scales.y.title = { display: true, text: "km", color: "#6B7480" };
    o.scales.x.type = "linear"; o.scales.x.min = 4.4;
    charts.sc = new Chart(c, {
      type: "scatter",
      data: { datasets: [{ data: pts, pointBackgroundColor: cols, pointRadius: 2.6, pointHoverRadius: 5 }] },
      options: o
    });
  }

  /* ---------- Aftershock explorer ---------- */
  var mains = [], asChart = null;
  function eventLabel(e) { return dg(e.year + " · M" + e.mag.toFixed(1)) + " — " + (e.place || "—"); }
  function initAftershocks() {
    var sel = $("asPick"); if (!sel) return;
    mains = Q.filter(function (e) { return e.mag >= 6.8; }).sort(function (a, b) { return b.time - a.time; });
    if (!mains.length) return;
    fillMainSelect(sel);
    sel.addEventListener("change", function () { renderAS(+sel.value); });
    // default to the 2015 Gorkha mainshock if present
    var gi = 0;
    mains.forEach(function (m, i) { if (m.year === 2015 && m.mag >= 7.7) gi = i; });
    sel.value = String(gi);
    renderAS(gi);
  }
  function fillMainSelect(sel) {
    var cur = sel.value;
    sel.innerHTML = mains.map(function (m, i) { return '<option value="' + i + '">' + esc(eventLabel(m)) + "</option>"; }).join("");
    if (cur !== "") sel.value = cur;
  }
  function renderAS(i) {
    var ms = mains[i]; if (!ms) return;
    var W = 90 * 864e5;
    var af = Q.filter(function (e) {
      return e.time > ms.time && e.time <= ms.time + W && e.mag < ms.mag && hav(ms.lat, ms.lon, e.lat, e.lon) <= 120;
    });
    set("asCount", dg(af.length));
    var big = af.length ? af.reduce(function (a, b) { return b.mag > a.mag ? b : a; }) : null;
    set("asBig", big ? dg("M" + big.mag.toFixed(1)) : "—");
    set("asBigP", big ? (big.place || "") : "");
    var span = af.length ? Math.ceil((Math.max.apply(null, af.map(function (e) { return e.time; })) - ms.time) / 864e5) : 0;
    set("asSpan", af.length ? dg(span) + " " + T("as.days") : "—");
    var none = $("asNone"); if (none) none.style.display = af.length ? "none" : "block";

    var days = [], counts = [];
    for (var d = 1; d <= 45; d++) { days.push(String(d)); counts.push(0); }
    af.forEach(function (e) {
      var d = Math.floor((e.time - ms.time) / 864e5);
      if (d >= 0 && d < 45) counts[d]++;
    });
    var c = $("chartAS"); if (!c || typeof Chart === "undefined") return;
    if (asChart) { asChart.data.labels = days; asChart.data.datasets[0].data = counts; asChart.update(); return; }
    var o = grid(); o.scales.y.ticks.precision = 0;
    asChart = new Chart(c, {
      type: "bar",
      data: { labels: days, datasets: [{ data: counts, backgroundColor: "rgba(255,138,61,.7)", hoverBackgroundColor: "#FF8A3D", borderRadius: 2 }] },
      options: o
    });
  }

  /* ---------- Compare two quakes ---------- */
  var cmpEvents = [];
  function initCompare() {
    var a = $("cmpA"), b = $("cmpB"); if (!a || !b) return;
    cmpEvents = NOTABLE.map(function (n) {
      return { mag: n.mag, year: n.year, depth: n.depth, deaths: n.deaths, label: function () { return (lang() === "ne" ? n.name_ne : n.name_en) + " (" + n.year + ")"; } };
    });
    Q.filter(function (e) { return e.mag >= 6.5; }).forEach(function (e) {
      var dup = cmpEvents.some(function (n) { return n.year === e.year && Math.abs(n.mag - e.mag) < 0.25; });
      if (!dup) cmpEvents.push({ mag: e.mag, year: e.year, depth: e.depth, deaths: null, label: function () { return (e.place || "—") + " (" + e.year + ")"; } });
    });
    cmpEvents.sort(function (x, y) { return y.mag - x.mag; });
    fillCmp(a); fillCmp(b);
    a.value = "0"; b.value = String(Math.min(1, cmpEvents.length - 1));
    a.addEventListener("change", renderCmp); b.addEventListener("change", renderCmp);
    renderCmp();
  }
  function fillCmp(sel) {
    var cur = sel.value;
    sel.innerHTML = cmpEvents.map(function (e, i) { return '<option value="' + i + '">' + dg("M" + e.mag.toFixed(1)) + " — " + esc(e.label()) + "</option>"; }).join("");
    if (cur !== "") sel.value = cur;
  }
  function row(k, va, vb) {
    return '<div style="display:grid;grid-template-columns:1.2fr 1fr 1fr;gap:10px;padding:9px 0;border-bottom:1px solid var(--line)">' +
      '<span style="color:var(--ink-faint);font-size:.85rem">' + k + "</span>" +
      '<b style="font-family:var(--mono)">' + va + "</b><b style=\"font-family:var(--mono)\">" + vb + "</b></div>";
  }
  function renderCmp() {
    var a = cmpEvents[+$("cmpA").value], b = cmpEvents[+$("cmpB").value];
    var box = $("cmpTable"); if (!a || !b || !box) return;
    var ratio = Math.pow(10, 1.5 * Math.abs(a.mag - b.mag));
    var bigger = a.mag >= b.mag ? a : b, smaller = a.mag >= b.mag ? b : a;
    box.innerHTML =
      row("", esc(a.label()), esc(b.label())) +
      row(T("cmp.mag"), dg("M" + a.mag.toFixed(1)), dg("M" + b.mag.toFixed(1))) +
      row(T("cmp.depth"), a.depth != null ? dg(Math.round(a.depth) + " km") : "—", b.depth != null ? dg(Math.round(b.depth) + " km") : "—") +
      row(T("cmp.deaths"), a.deaths != null ? dg(a.deaths.toLocaleString()) : "—", b.deaths != null ? dg(b.deaths.toLocaleString()) : "—") +
      row(T("cmp.feltr"), dg("~" + Math.round(feltKm(a.mag)) + " km"), dg("~" + Math.round(feltKm(b.mag)) + " km")) +
      row(T("cmp.energy"), (a === bigger ? dg(Math.round(ratio).toLocaleString() + "×") : dg("1×")), (b === bigger ? dg(Math.round(ratio).toLocaleString() + "×") : dg("1×")));
    var line = $("cmpLine");
    if (line) line.textContent = ratio < 1.5 ? T("cmp.same")
      : sub(T("cmp.line"), { a: bigger.label(), b: smaller.label(), x: Math.round(ratio).toLocaleString() });
  }

  /* ---------- language change ---------- */
  function relabel() {
    nowAndThen(); records();
    Object.keys(charts).forEach(function (k) { if (charts[k]) charts[k].update(); });
    if (asChart) asChart.update();
    var g = $("grB"); if (g && g.getAttribute("data-b")) g.textContent = sub(T("ins.c.gr.b"), { b: g.getAttribute("data-b") });
    var sel = $("asPick");
    if (sel && mains.length) { fillMainSelect(sel); renderAS(+sel.value || 0); }
    var a = $("cmpA"), b = $("cmpB");
    if (a && cmpEvents.length) { fillCmp(a); fillCmp(b); renderCmp(); }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
