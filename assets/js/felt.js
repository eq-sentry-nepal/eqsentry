/* ==========================================================================
   EQ Sentry — "Did You Feel It?" community intensity reports.
   Lets people report how strong shaking felt; plots an aggregated intensity
   map (Leaflet) from /api/reports. Degrades gracefully with no backend.
   Requires: Leaflet, districts-data.js (window.EQ_DISTRICTS), i18n.js, config.js.
   ========================================================================== */
(function () {
  "use strict";
  function ready(fn) { document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", fn) : fn(); }
  ready(init);

  function T(k) { return window.EQ ? window.EQ.t(k) : k; }
  function lang() { return window.EQ && window.EQ.getLang ? window.EQ.getLang() : (document.documentElement.lang || "en"); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function $(id) { return document.getElementById(id); }
  function api() { return (window.EQ_API || (window.EQ_CONFIG && window.EQ_CONFIG.api) || "").replace(/\/$/, ""); }
  function motionOff() { return !!(window.EQ_A11Y && window.EQ_A11Y.motionOff && window.EQ_A11Y.motionOff()); }

  // Intensity levels people can self-report (loosely Modified Mercalli II–VIII).
  var INTENSITY = [
    { v: 2, key: "dyfi.i2", c: "#9FB0BD" },
    { v: 3, key: "dyfi.i3", c: "#7BD389" },
    { v: 4, key: "dyfi.i4", c: "#B9E266" },
    { v: 5, key: "dyfi.i5", c: "#F2E14C" },
    { v: 6, key: "dyfi.i6", c: "#F5B53D" },
    { v: 7, key: "dyfi.i7", c: "#F07B2E" },
    { v: 8, key: "dyfi.i8", c: "#E8503A" }
  ];
  function intColor(i) {
    i = Math.round(i);
    if (i <= 2) return "#9FB0BD"; if (i === 3) return "#7BD389"; if (i === 4) return "#B9E266";
    if (i === 5) return "#F2E14C"; if (i === 6) return "#F5B53D"; if (i === 7) return "#F07B2E"; return "#E8503A";
  }
  function intLabelKey(i) {
    i = Math.round(i);
    if (i <= 3) return "dyfi.l.weak"; if (i === 4) return "dyfi.l.light"; if (i === 5) return "dyfi.l.mod"; if (i === 6) return "dyfi.l.strong"; return "dyfi.l.severe";
  }

  var geo = null;            // {lat,lon} if the user shared precise location
  var chosen = 0;            // chosen intensity value
  var reports = [];          // current report list (server + optimistic)
  var map = null, tile = null, layer = null;
  var statusT;

  function status(msg, ok) {
    var el = $("feltStatus"); if (!el) return;
    el.textContent = msg || "";
    el.style.color = ok ? "var(--ok,#34D399)" : "var(--ink-soft)";
    clearTimeout(statusT);
    if (msg && ok) statusT = setTimeout(function () { el.textContent = ""; }, 6000);
  }

  /* ---- form pieces ---- */
  function fillDistricts() {
    var sel = $("feltDistrict"); if (!sel || !window.EQ_DISTRICTS) return;
    var prev = sel.value, ne = lang() === "ne";
    var list = window.EQ_DISTRICTS.slice().sort(function (a, b) { return (ne ? a.ne : a.en).localeCompare(ne ? b.ne : b.en); });
    var html = '<option value="">' + esc(T("dyfi.district.ph")) + "</option>";
    list.forEach(function (d) { html += '<option value="' + esc(d.en) + '" data-lat="' + d.lat + '" data-lon="' + d.lon + '">' + esc(ne ? d.ne : d.en) + "</option>"; });
    sel.innerHTML = html;
    if (prev) sel.value = prev;
  }
  function renderScale() {
    var box = $("feltScale"); if (!box) return;
    box.innerHTML = INTENSITY.map(function (o) {
      var sel = chosen === o.v;
      return '<label class="felt-opt' + (sel ? " sel" : "") + '" data-v="' + o.v + '">' +
        '<input type="radio" name="felt-int" value="' + o.v + '"' + (sel ? " checked" : "") + ' />' +
        '<span class="felt-sw" style="background:' + o.c + '"></span>' +
        '<span class="lv">' + o.v + '</span><span class="tx">' + esc(T(o.key)) + "</span></label>";
    }).join("");
  }
  function renderLegend() {
    var box = $("feltLegend"); if (!box) return;
    var items = [["#9FB0BD", "dyfi.l.weak"], ["#B9E266", "dyfi.l.light"], ["#F2E14C", "dyfi.l.mod"], ["#F07B2E", "dyfi.l.strong"], ["#E8503A", "dyfi.l.severe"]];
    box.innerHTML = items.map(function (it) { return '<span><i style="background:' + it[0] + '"></i>' + esc(T(it[1])) + "</span>"; }).join("");
  }

  function relTime(at) {
    var d = new Date(at).getTime(); if (isNaN(d)) return "";
    var s = Math.max(0, (Date.now() - d) / 1000);
    if (s < 90) return T("dyfi.now");
    if (s < 3600) return Math.round(s / 60) + T("dyfi.min");
    if (s < 86400) return Math.round(s / 3600) + T("dyfi.hr");
    return Math.round(s / 86400) + T("dyfi.day");
  }

  /* ---- map ---- */
  function tileURL() {
    return document.documentElement.classList.contains("light")
      ? "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      : "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
  }
  function initMap() {
    var el = $("feltMap"); if (!el || !window.L) return;
    var noAnim = motionOff();
    map = L.map(el, { zoomAnimation: !noAnim, fadeAnimation: !noAnim, markerZoomAnimation: !noAnim, scrollWheelZoom: false })
      .setView([28.3, 84.0], 7);
    tile = L.tileLayer(tileURL(), { attribution: '&copy; OpenStreetMap &copy; CARTO', subdomains: "abcd", maxZoom: 18 }).addTo(map);
    layer = L.layerGroup().addTo(map);
    document.addEventListener("eq:themechange", function () { if (tile) tile.setUrl(tileURL()); });
    setTimeout(function () { map.invalidateSize(); }, 200);
  }
  function drawMap() {
    if (!layer) return;
    layer.clearLayers();
    // group reports by district (fall back to rounded coords)
    var groups = {};
    reports.forEach(function (r) {
      if (r.lat == null || r.lon == null) return;
      var key = r.district || (r.lat.toFixed(2) + "," + r.lon.toFixed(2));
      var g = groups[key] || (groups[key] = { lat: 0, lon: 0, n: 0, sum: 0, name: r.district || "" });
      g.lat += r.lat; g.lon += r.lon; g.sum += (r.intensity || 0); g.n++;
    });
    Object.keys(groups).forEach(function (k) {
      var g = groups[k], avg = g.sum / g.n, lat = g.lat / g.n, lon = g.lon / g.n;
      L.circleMarker([lat, lon], {
        radius: 8 + Math.min(g.n, 22) * 0.7, color: "rgba(0,0,0,.35)", weight: 1,
        fillColor: intColor(avg), fillOpacity: 0.72
      }).bindPopup(
        '<strong>' + esc(g.name || "—") + '</strong><br>' +
        g.n + " " + esc(T(g.n === 1 ? "dyfi.report1" : "dyfi.reports")) + " · " + esc(T(intLabelKey(avg)))
      ).addTo(layer);
    });
  }
  function drawRecent() {
    var box = $("feltRecent"); if (!box) return;
    if (!reports.length) { box.innerHTML = '<p class="muted" style="margin:0">' + esc(T(api() ? "dyfi.none" : "dyfi.offline")) + "</p>"; return; }
    box.innerHTML = reports.slice(0, 12).map(function (r) {
      return '<div class="felt-rec"><span class="dot" style="background:' + intColor(r.intensity) + '"></span><div>' +
        '<div><strong>' + esc(r.district || "—") + '</strong> <span class="rmeta">· ' + esc(relTime(r.at)) + " · " + esc(T(intLabelKey(r.intensity))) + "</span></div>" +
        (r.message ? '<p class="rmsg">' + esc(r.message) + "</p>" : "") + "</div></div>";
    }).join("");
  }

  function loadReports() {
    var a = api();
    if (!a) { drawRecent(); return; }
    fetch(a + "/api/reports").then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
      if (j && Array.isArray(j.reports)) { reports = j.reports; drawMap(); drawRecent(); }
    }).catch(function () { /* offline — keep whatever we have */ });
  }

  /* ---- submit ---- */
  function submit(e) {
    e.preventDefault();
    var sel = $("feltDistrict"), opt = sel && sel.options[sel.selectedIndex];
    var district = sel ? sel.value : "";
    if (!district && !geo) { status(T("dyfi.err.where")); return; }
    if (!chosen) { status(T("dyfi.err.how")); return; }
    var lat = geo ? geo.lat : (opt ? parseFloat(opt.getAttribute("data-lat")) : null);
    var lon = geo ? geo.lon : (opt ? parseFloat(opt.getAttribute("data-lon")) : null);
    var a = api();
    if (!a) { status(T("dyfi.nobackend")); return; }

    var payload = {
      name: $("feltName").value.trim(), district: district, intensity: chosen,
      severity: T(intLabelKey(chosen)), message: $("feltMsg").value.trim(),
      lat: lat, lon: lon, lang: lang()
    };
    var btn = $("feltSubmit"); btn.disabled = true; status(T("dyfi.sending"));
    fetch(a + "/api/report", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
      .then(function () {
        status(T("dyfi.ok"), true);
        reports.unshift({ district: district, intensity: chosen, lat: lat, lon: lon, at: new Date().toISOString(), message: payload.message });
        drawMap(); drawRecent();
        chosen = 0; renderScale(); $("feltMsg").value = "";
      })
      .catch(function () { status(T("dyfi.err.send")); })
      .finally(function () { btn.disabled = false; });
  }

  function init() {
    if (!$("feltForm")) return;
    fillDistricts(); renderScale(); renderLegend(); initMap(); loadReports();

    $("feltScale").addEventListener("click", function (e) {
      var l = e.target.closest(".felt-opt"); if (!l) return;
      chosen = +l.getAttribute("data-v"); renderScale();
    });
    $("feltGeo").addEventListener("click", function () {
      if (!navigator.geolocation) { status(T("dyfi.geo.fail")); return; }
      navigator.geolocation.getCurrentPosition(function (p) {
        geo = { lat: p.coords.latitude, lon: p.coords.longitude };
        var b = $("feltGeo"); b.classList.add("on"); b.textContent = T("dyfi.geo.on");
      }, function () { status(T("dyfi.geo.fail")); }, { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 });
    });
    $("feltForm").addEventListener("submit", submit);

    document.addEventListener("eq:langchange", function () {
      fillDistricts(); renderScale(); renderLegend(); drawRecent();
      var b = $("feltGeo"); if (geo && b) b.textContent = T("dyfi.geo.on");
    });
  }
})();
