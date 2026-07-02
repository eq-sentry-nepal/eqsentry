/* ==========================================================================
   EQ Sentry — Insights page: charts, magnitude explorer, quake time-machine
   Requires: Chart.js, Leaflet (L), i18n.js (window.EQ), data-layers.js (EQ_DATA)
   ========================================================================== */
(function () {
  "use strict";

  var quakes = [];          // normalized catalogue
  var charts = {};          // Chart instances
  var tm = { map: null, layer: null, year: null, timer: null };
  var exp = { mag: 7.8 };

  function T(k) { return window.EQ ? window.EQ.t(k) : k; }
  function lang() { return window.EQ ? window.EQ.getLang() : "en"; }

  function magColor(m) {
    if (m == null) return "#6B7480";
    if (m >= 6) return "#EF4444"; if (m >= 5) return "#F97316";
    if (m >= 4) return "#FB923C"; if (m >= 3) return "#FBBF24"; return "#34D399";
  }

  function getCatalog() {
    var w = window.EQData ? window.EQData.whenReady() : Promise.resolve();
    return w.then(function () {
      if (window.EQ_DATA && window.EQ_DATA.catalog) return window.EQ_DATA.catalog;
      return fetch("data/nepal_earthquakes.geojson").then(function (r) { return r.json(); });
    });
  }

  function init() {
    getCatalog().then(function (fc) {
      quakes = (fc.features || []).map(function (f) {
        var p = f.properties, c = f.geometry.coordinates;
        return { mag: p.mag, time: p.time, depth: (c[2] != null ? c[2] : p.depth),
                 lat: c[1], lon: c[0], place: p.place, year: new Date(p.time).getUTCFullYear() };
      }).filter(function (e) { return e.mag != null && !isNaN(e.year); });
      buildStats();
      buildCharts();
      initExplorer();
      initTimeMachine();
      initFeelIt();
      document.addEventListener("eq:langchange", onLang);
    }).catch(function (e) { if (window.console) console.error(e); });
  }

  /* ---------- Stats ---------- */
  function buildStats() {
    var mags = quakes.map(function (e) { return e.mag; });
    var years = quakes.map(function (e) { return e.year; });
    var minY = Math.min.apply(null, years), maxY = Math.max.apply(null, years);
    var strongest = quakes.reduce(function (a, b) { return b.mag > a.mag ? b : a; });
    var deepest = quakes.reduce(function (a, b) { return (b.depth || 0) > (a.depth || 0) ? b : a; });
    var m6 = quakes.filter(function (e) { return e.mag >= 6; }).length;
    var span = (maxY - minY + 1);
    set("stTotal", quakes.length.toLocaleString());
    set("stStrong", "M" + strongest.mag.toFixed(1));
    set("stStrongP", strongest.year + " · " + strongest.place);
    set("stPerYear", (quakes.length / span).toFixed(1));
    set("stM6", m6);
    set("stDeep", Math.round(deepest.depth) + " km");
    set("stSpan", minY + "–" + maxY);
  }
  function set(id, v) { var e = document.getElementById(id); if (e) e.textContent = v; }

  /* ---------- Charts ---------- */
  function yearCounts(filterMin) {
    var years = quakes.map(function (e) { return e.year; });
    var minY = Math.min.apply(null, years), maxY = Math.max.apply(null, years);
    var labels = [], data = [], map = {};
    quakes.forEach(function (e) { if (e.mag >= filterMin) map[e.year] = (map[e.year] || 0) + 1; });
    for (var y = minY; y <= maxY; y++) { labels.push(String(y)); data.push(map[y] || 0); }
    return { labels: labels, data: data };
  }
  function gridOpts() {
    return {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { backgroundColor: "#171C27", borderColor: "rgba(255,255,255,.14)", borderWidth: 1, titleColor: "#EEF1F6", bodyColor: "#AAB2BF" } },
      scales: {
        x: { grid: { color: "rgba(255,255,255,.05)" }, ticks: { color: "#6B7480", maxRotation: 0, autoSkip: true, maxTicksLimit: 12 } },
        y: { grid: { color: "rgba(255,255,255,.05)" }, ticks: { color: "#6B7480", precision: 0 }, beginAtZero: true }
      }
    };
  }
  function buildCharts() {
    if (typeof Chart === "undefined") return;
    Chart.defaults.font.family = "'JetBrains Mono','Inter',monospace";

    var yc = yearCounts(4.5);
    charts.year = new Chart(document.getElementById("chartYear"), {
      type: "bar",
      data: { labels: yc.labels, datasets: [{ data: yc.data, backgroundColor: "rgba(255,77,46,.7)", hoverBackgroundColor: "#FF4D2E", borderRadius: 3 }] },
      options: gridOpts()
    });

    // magnitude distribution
    var buckets = [{ l: "4.5–4.9", min: 4.5, max: 5, c: "#FB923C" }, { l: "5.0–5.9", min: 5, max: 6, c: "#F97316" },
                   { l: "6.0–6.9", min: 6, max: 7, c: "#EF4444" }, { l: "7.0+", min: 7, max: 99, c: "#b91c1c" }];
    var md = buckets.map(function (b) { return quakes.filter(function (e) { return e.mag >= b.min && e.mag < b.max; }).length; });
    charts.mag = new Chart(document.getElementById("chartMag"), {
      type: "bar",
      data: { labels: buckets.map(function (b) { return b.l; }), datasets: [{ data: md, backgroundColor: buckets.map(function (b) { return b.c; }), borderRadius: 4 }] },
      options: gridOpts()
    });

    // depth distribution
    var db = [{ l: "0–10", min: 0, max: 10 }, { l: "10–30", min: 10, max: 30 }, { l: "30–70", min: 30, max: 70 }, { l: "70+", min: 70, max: 9999 }];
    var dd = db.map(function (b) { return quakes.filter(function (e) { return (e.depth || 0) >= b.min && (e.depth || 0) < b.max; }).length; });
    charts.depth = new Chart(document.getElementById("chartDepth"), {
      type: "bar",
      data: { labels: db.map(function (b) { return b.l; }), datasets: [{ data: dd, backgroundColor: "rgba(34,211,238,.7)", hoverBackgroundColor: "#22d3ee", borderRadius: 4 }] },
      options: gridOpts()
    });

    // year filter controls
    var ctl = document.getElementById("yearFilter");
    if (ctl) ctl.querySelectorAll("button").forEach(function (b) {
      b.addEventListener("click", function () {
        ctl.querySelectorAll("button").forEach(function (x) { x.classList.remove("active"); });
        b.classList.add("active");
        var yc2 = yearCounts(parseFloat(b.getAttribute("data-min")));
        charts.year.data.labels = yc2.labels;
        charts.year.data.datasets[0].data = yc2.data;
        charts.year.update();
      });
    });
  }

  /* ---------- Magnitude explorer ---------- */
  function magClass(m) { return m < 5 ? "light" : m < 6 ? "moderate" : m < 7 ? "strong" : m < 8 ? "major" : "great"; }
  function freqGlobal(m) {
    var r = Math.floor(m);
    return ({ 4: "~13,000", 5: "~1,500", 6: "~150", 7: "~15", 8: "~1" })[r] || "<1";
  }
  function fmtTNT(m) {
    // Gutenberg–Richter energy: log10 E(J) = 1.5·M + 4.8 · 1 ton TNT = 4.184e9 J
    var tons = Math.pow(10, 1.5 * m + 4.8) / 4.184e9;
    if (tons < 1000) return Math.round(tons).toLocaleString() + " t";
    if (tons < 1e6) return (tons / 1000).toFixed(1) + " kt";
    return (tons / 1e6).toFixed(1) + " Mt";
  }
  function updateExplorer() {
    var m = exp.mag, cls = magClass(m);
    set("expMag", "M" + m.toFixed(1));
    set("expClass", T("exp.cls." + cls));
    set("expFeel", T("exp.feel." + cls));
    var energy = Math.pow(10, 1.5 * (m - 4)); // vs M4.0
    set("expEnergy", (energy >= 1000 ? Math.round(energy).toLocaleString() : energy.toFixed(0)) + "×");
    set("expTNT", fmtTNT(m));
    set("expFreq", freqGlobal(m) + " /yr");
    // nearest catalogue example
    if (quakes.length) {
      var near = quakes.reduce(function (a, b) { return Math.abs(b.mag - m) < Math.abs(a.mag - m) ? b : a; });
      set("expEg", T("ins.eg") + " M" + near.mag.toFixed(1) + " — " + near.place + " (" + near.year + ")");
    }
    var pos = Math.max(0, Math.min(100, (m - 4) / (9 - 4) * 100));
    var ptr = document.getElementById("expPtr"); if (ptr) ptr.style.left = pos + "%";
    var sl = document.getElementById("magSlider");
    if (sl) sl.style.setProperty("--fill", ((m - 4) / (9 - 4) * 100) + "%");
  }
  function initExplorer() {
    var sl = document.getElementById("magSlider");
    if (!sl) return;
    sl.addEventListener("input", function () { exp.mag = parseFloat(sl.value); updateExplorer(); });
    exp.mag = parseFloat(sl.value);
    updateExplorer();
  }

  /* ---------- Time machine ---------- */
  function renderYear(y) {
    tm.year = y;
    set("tmYear", String(y));
    var sl = document.getElementById("tmYearSlider"); if (sl && +sl.value !== y) sl.value = y;
    if (sl) sl.style.setProperty("--fill", ((y - +sl.min) / (+sl.max - +sl.min) * 100) + "%");
    tm.layer.clearLayers();
    var evs = quakes.filter(function (e) { return e.year === y; });
    var maxM = 0;
    evs.forEach(function (e) {
      if (e.mag > maxM) maxM = e.mag;
      L.circleMarker([e.lat, e.lon], { radius: Math.max(4, Math.pow(e.mag, 1.5) * 1.2), color: "rgba(255,255,255,.5)", weight: 1, fillColor: magColor(e.mag), fillOpacity: .8 })
        .bindPopup('<div class="lpop"><span class="m" style="color:' + magColor(e.mag) + '">M ' + e.mag.toFixed(1) + '</span><br><b>' + e.place + "</b></div>")
        .addTo(tm.layer);
    });
    var txt = evs.length ? (evs.length + " " + T("ins.quakes") + " · " + T("ins.max") + " M" + maxM.toFixed(1)) : T("ins.none");
    set("tmReadout", txt);
  }
  function initTimeMachine() {
    if (typeof L === "undefined") return;
    tm.map = L.map("tmMap", { scrollWheelZoom: false, zoomControl: true }).setView([28.3, 84.0], 6);
    var tlURL = function () { return document.documentElement.classList.contains("light") ? "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" : "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"; };
    tm.tiles = L.tileLayer(tlURL(), { subdomains: "abcd", maxZoom: 12, attribution: '&copy; OpenStreetMap &copy; CARTO' }).addTo(tm.map);
    document.addEventListener("eq:themechange", function () { if (tm.tiles) tm.tiles.setUrl(tlURL()); });
    tm.layer = L.layerGroup().addTo(tm.map);
    var sl = document.getElementById("tmYearSlider");
    var years = quakes.map(function (e) { return e.year; });
    var minY = Math.min.apply(null, years), maxY = Math.max.apply(null, years);
    sl.min = minY; sl.max = maxY; sl.value = 2015;
    sl.addEventListener("input", function () { stopPlay(); renderYear(+sl.value); });
    document.getElementById("tmPlay").addEventListener("click", togglePlay);
    renderYear(2015);
  }
  function togglePlay() {
    if (tm.timer) { stopPlay(); return; }
    setPlayIcon(true);
    var sl = document.getElementById("tmYearSlider");
    tm.timer = setInterval(function () {
      var y = tm.year + 1;
      if (y > +sl.max) y = +sl.min;
      renderYear(y);
    }, 850);
  }
  function stopPlay() { if (tm.timer) { clearInterval(tm.timer); tm.timer = null; } setPlayIcon(false); }
  function setPlayIcon(playing) {
    var b = document.getElementById("tmPlay"); if (!b) return;
    b.innerHTML = playing
      ? '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
  }

  /* ---------- Will I feel it? (Mercalli intensity estimator) ---------- */
  var feel = { m: 7.0, d: 50 };
  function estimateMMI(M, Dkm) {
    var R = Math.sqrt(Dkm * Dkm + 100); // hypocentral distance, assumed depth ~10 km
    var I = 3.67 + 1.17 * M - 3.19 * (Math.log(R) / Math.LN10);
    return Math.max(1, Math.min(12, I));
  }
  function mmiClass(I) {
    I = Math.round(I);
    if (I <= 1) return "notfelt"; if (I <= 3) return "weak"; if (I === 4) return "light";
    if (I === 5) return "moderate"; if (I === 6) return "strong"; if (I === 7) return "verystrong";
    if (I === 8) return "severe"; if (I === 9) return "violent"; return "extreme";
  }
  function roman(I) {
    return ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"][Math.max(1, Math.min(12, Math.round(I)))];
  }
  function updateFeelIt() {
    var I = estimateMMI(feel.m, feel.d), cls = mmiClass(I);
    set("fiMMI", roman(I)); set("fiClass", T("fi.cls." + cls));
    set("fiFeel", T("fi.feel." + cls)); set("fiEffect", T("fi.effect." + cls));
    set("fiMagV", "M" + feel.m.toFixed(1)); set("fiDistV", Math.round(feel.d) + " km");
    var ptr = document.getElementById("fiPtr");
    if (ptr) ptr.style.left = Math.max(0, Math.min(100, (Math.round(I) - 1) / 11 * 100)) + "%";
    var sm = document.getElementById("fiMag"); if (sm) sm.style.setProperty("--fill", ((feel.m - 4) / 5 * 100) + "%");
    var sd = document.getElementById("fiDist"); if (sd) sd.style.setProperty("--fill", (feel.d / 300 * 100) + "%");
  }
  function initFeelIt() {
    var sm = document.getElementById("fiMag"), sd = document.getElementById("fiDist");
    if (!sm || !sd) return;
    sm.addEventListener("input", function () { feel.m = parseFloat(sm.value); updateFeelIt(); });
    sd.addEventListener("input", function () { feel.d = parseFloat(sd.value); updateFeelIt(); });
    feel.m = parseFloat(sm.value); feel.d = parseFloat(sd.value);
    updateFeelIt();
  }

  function onLang() { updateExplorer(); updateFeelIt(); if (tm.year != null) renderYear(tm.year); }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
