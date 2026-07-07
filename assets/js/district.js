/* ==========================================================================
   EQ Sentry — district risk tool.
   Pick a district → source-derived insights (recorded seismicity nearby from the
   USGS catalogue + the notable-quake record) and an interactive map, plus
   terrain-based hazard context. Requires i18n.js, districts-data.js
   (window.EQ_DISTRICTS), data-layers.js (window.EQ_DATA) and Leaflet.
   ========================================================================== */
(function () {
  "use strict";
  function ready(fn) { document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", fn) : fn(); }
  ready(init);

  function T(k) { return window.EQ ? window.EQ.t(k) : k; }
  function dg(s) { return (window.EQ && window.EQ.dg) ? window.EQ.dg(s) : String(s); }

  function lang() { return window.EQ ? window.EQ.getLang() : "en"; }
  function hav(aLat, aLon, bLat, bLon) {
    var R = 6371, r = function (d) { return d * Math.PI / 180; };
    var dLat = r(bLat - aLat), dLon = r(bLon - aLon);
    var x = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(r(aLat)) * Math.cos(r(bLat)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * R * Math.asin(Math.sqrt(x));
  }
  function yearOf(ms) { return new Date(ms).getUTCFullYear(); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  /* ---- magnitude styling (matches the live map) ---- */
  function magColor(m) {
    if (m == null) return "#6B7480";
    if (m >= 6) return "#EF4444";
    if (m >= 5) return "#F97316";
    if (m >= 4) return "#FB923C";
    if (m >= 3) return "#FBBF24";
    return "#34D399";
  }
  function magRadius(m, notable) {
    if (m == null) return 4;
    var r = Math.max(4, Math.pow(Math.max(m, 1), 1.55) * 1.15);
    return notable ? r + 3 : r;
  }

  var ICON_WARN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 9v4M12 17h.01M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.7 3.86a2 2 0 0 0-3.4 0z"/></svg>';
  var ICON_INFO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>';
  var ZONE_ICON = {
    terai: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:15px;height:15px"><path d="M2 15q3-2.5 6 0t6 0 6 0M2 19q3-2.5 6 0t6 0 6 0"/></svg>',
    hill: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:15px;height:15px"><path d="M2 19l6-8 4 4 5-7 5 11z"/></svg>',
    mountain: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:15px;height:15px"><path d="M2 19l6-11 3 5 2-3 6 9z"/><path d="M7 11l1.6 1.6"/></svg>',
    valley: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:15px;height:15px"><path d="M3 7c1.5 8 5 10 9 10s7.5-2 9-10"/></svg>'
  };

  var cat = [], notable = [];
  function getCat() {
    var w = window.EQData ? window.EQData.whenReady() : Promise.resolve();
    return w.then(function () {
      if (window.EQ_DATA && window.EQ_DATA.catalog) return window.EQ_DATA.catalog.features;
      return fetch("data/nepal_earthquakes.geojson").then(function (r) { return r.json(); }).then(function (d) { return d.features; });
    });
  }
  function getNotable() { return (window.EQ_DATA && window.EQ_DATA.notable) ? window.EQ_DATA.notable.features : []; }
  function getPlates() { return (window.EQ_DATA && window.EQ_DATA.plates) ? window.EQ_DATA.plates.features : []; }

  /* ---- nearest mapped fault / plate boundary (generalized traces) ---- */
  function nearestFault(lat, lon) {
    var best = null, bd = Infinity, feats = getPlates();
    for (var i = 0; i < feats.length; i++) {
      var co = feats[i].geometry && feats[i].geometry.coordinates; if (!co) continue;
      for (var j = 0; j < co.length - 1; j++) {
        var a = co[j], b = co[j + 1];
        for (var s = 0; s <= 10; s++) {
          var f = s / 10, plon = a[0] + (b[0] - a[0]) * f, plat = a[1] + (b[1] - a[1]) * f;
          var dist = hav(lat, lon, plat, plon);
          if (dist < bd) { bd = dist; best = feats[i]; }
        }
      }
    }
    if (!best) return null;
    var p = best.properties || {};
    return { name: (lang() === "ne" ? p.name_ne : p.name_en) || p.name_en || "", d: bd };
  }

  /* ---- map ---- */
  var map = null, tile = null, qLayer = null, dLayer = null, faultLayer = null, themeWired = false;
  function tileURL() {
    return document.documentElement.classList.contains("light")
      ? "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      : "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
  }
  function ensureMap() {
    if (map || typeof L === "undefined") return;
    map = L.map("distMap", { scrollWheelZoom: false, zoomControl: true, worldCopyJump: true }).setView([28.3, 84.0], 7);
    tile = L.tileLayer(tileURL(), {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
      subdomains: "abcd", maxZoom: 18
    }).addTo(map);
    if (!themeWired) { document.addEventListener("eq:themechange", function () { if (tile) tile.setUrl(tileURL()); }); themeWired = true; }
    faultLayer = L.layerGroup().addTo(map);
    qLayer = L.layerGroup().addTo(map);
    dLayer = L.layerGroup().addTo(map);
    getPlates().forEach(function (f) {
      var co = f.geometry && f.geometry.coordinates; if (!co) return;
      L.polyline(co.map(function (c) { return [c[1], c[0]]; }), { color: "#FF8A3D", weight: 1.3, opacity: .4, dashArray: "5 6", interactive: false }).addTo(faultLayer);
    });
  }
  function popupHTML(q, d) {
    var dist = Math.round(hav(d.lat, d.lon, q.lat, q.lon));
    var label = esc(q.notable ? q.name : (q.place || ""));
    var when = q.notable ? q.year : (q.time != null ? yearOf(q.time) : "");
    return '<b>' + dg("M" + (q.mag != null ? q.mag.toFixed(1) : "?")) + '</b> ' + label +
      '<br>' + (when ? dg(when) + " · " : "") + dg(dist + " km") + (q.depth != null ? " · " + dg(Math.round(q.depth) + " km") : "");
  }
  function updateMap(d, name, nearby) {
    ensureMap();
    if (!map) return;
    qLayer.clearLayers(); dLayer.clearLayers();
    L.circle([d.lat, d.lon], { radius: 100000, color: "#FF4D2E", weight: 1, dashArray: "6 7", fill: false, opacity: .55, interactive: false }).addTo(dLayer);
    L.circle([d.lat, d.lon], { radius: 50000, color: "#FF4D2E", weight: 1, fill: false, opacity: .28, interactive: false }).addTo(dLayer);
    nearby.forEach(function (q) {
      var mk = L.circleMarker([q.lat, q.lon], {
        radius: magRadius(q.mag, q.notable), color: magColor(q.mag), weight: q.notable ? 2 : 1,
        fillColor: magColor(q.mag), fillOpacity: q.notable ? .95 : .68, opacity: 1
      });
      mk.bindPopup(popupHTML(q, d));
      if (q.notable) mk.bindTooltip(dg("M" + q.mag.toFixed(1) + (q.year ? " · " + q.year : "")), { direction: "top", className: "dist-tt" });
      qLayer.addLayer(mk);
    });
    L.circleMarker([d.lat, d.lon], { radius: 7, color: "#fff", weight: 2, fillColor: "#FF4D2E", fillOpacity: 1 })
      .addTo(dLayer).bindTooltip(name, { direction: "top", className: "dist-tt" });
    map.invalidateSize();
    map.fitBounds(L.latLng(d.lat, d.lon).toBounds(235000), { padding: [10, 10] });
  }

  function init() {
    var sel = document.getElementById("distSelect");
    if (!sel) return;
    getCat().then(function (f) {
      cat = f; notable = getNotable(); populate();
      if (window.EQMyDistrict) window.EQMyDistrict.applyToSelect();   // restore saved "my district"
    });
    sel.addEventListener("change", render);
    document.addEventListener("eq:langchange", function () { populate(); render(); });
  }

  function populate() {
    var sel = document.getElementById("distSelect");
    if (!sel || !window.EQ_DISTRICTS) return;
    var cur = sel.value, L0 = lang();
    var arr = window.EQ_DISTRICTS.map(function (d, i) { return { i: i, label: L0 === "ne" ? d.ne : d.en }; })
      .sort(function (a, b) { return a.label.localeCompare(b.label); });
    var opts = '<option value="">' + T("dr.choose") + "</option>";
    arr.forEach(function (o) { opts += '<option value="' + o.i + '">' + o.label + "</option>"; });
    sel.innerHTML = opts;
    if (cur !== "") sel.value = cur;
  }

  function median(a) {
    if (!a.length) return null;
    var s = a.slice().sort(function (x, y) { return x - y; }), m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  }

  function render() {
    var sel = document.getElementById("distSelect");
    var res = document.getElementById("distResult"), resB = document.getElementById("distResultB");
    var mapSec = document.getElementById("distMapSection");
    if (!sel || !res) return;
    var idx = sel.value;
    if (idx === "") { res.style.display = "none"; if (resB) resB.style.display = "none"; if (mapSec) mapSec.style.display = "none"; return; }
    var d = window.EQ_DISTRICTS[+idx]; if (!d) return;
    var L0 = lang(), name = L0 === "ne" ? d.ne : d.en;

    /* ---- insights from the catalogue ---- */
    var n100 = 0, n50 = 0, b6 = 0, b5 = 0, b45 = 0;
    var strongest = null, nearest = null, nd = Infinity, recent = null, rt = -Infinity, depths = [], nearby = [];
    cat.forEach(function (f) {
      var c = f.geometry.coordinates, p = f.properties;
      var dist = hav(d.lat, d.lon, c[1], c[0]);
      if (dist <= 170) nearby.push({ lat: c[1], lon: c[0], mag: p.mag, place: p.place, time: p.time, depth: p.depth });
      if (dist <= 100) {
        n100++; if (dist <= 50) n50++;
        if (p.mag >= 6) b6++; else if (p.mag >= 5) b5++; else b45++;
        if (p.depth != null) depths.push(p.depth);
        if (!strongest || p.mag > strongest.mag) strongest = { mag: p.mag, d: dist, place: p.place, year: yearOf(p.time) };
        if (p.time > rt) { rt = p.time; recent = { mag: p.mag, d: dist, place: p.place, year: yearOf(p.time) }; }
      }
      if (dist < nd) { nd = dist; nearest = { mag: p.mag, d: dist }; }
    });

    /* ---- nearest notable / great earthquake ---- */
    var gNear = null, gd = Infinity;
    notable.forEach(function (f) {
      var c = f.geometry.coordinates, p = f.properties;
      var dist = hav(d.lat, d.lon, c[1], c[0]);
      if (dist < gd) { gd = dist; gNear = { mag: p.mag, d: dist, year: p.year, name: (L0 === "ne" ? p.name_ne : p.name_en) }; }
      if (dist <= 260) nearby.push({ lat: c[1], lon: c[0], mag: p.mag, name: (L0 === "ne" ? p.name_ne : p.name_en), year: p.year, depth: p.depth_km, notable: true });
    });

    var fault = nearestFault(d.lat, d.lon), medDepth = median(depths);
    var dangerZone = (d.zone === "valley" || d.zone === "terai");

    /* ---- header + stats ---- */
    var h = '<div class="card reveal in" style="margin-bottom:16px">' +
      '<div class="flex aic wrap" style="gap:10px;justify-content:space-between">' +
      '<h3 style="margin:0">' + name + '</h3>' +
      '<span class="badge" style="display:inline-flex;align-items:center;gap:6px">' + (ZONE_ICON[d.zone] || "") + T("dr.zone." + d.zone) + "</span></div>" +
      '<p style="margin:.6rem 0 0;color:var(--ink-soft)">' + T("dr.universal") + "</p></div>";

    h += '<div class="stat-row reveal in" style="margin-bottom:14px">' +
      '<div class="stat"><div class="num accent">' + dg(n100) + '</div><div class="lbl">' + T("dr.s.count") + "</div></div>" +
      '<div class="stat"><div class="num">' + (strongest ? dg("M" + strongest.mag.toFixed(1)) : "—") + '</div><div class="lbl">' + T("dr.s.max") + "</div></div>" +
      '<div class="stat"><div class="num">' + (nearest ? dg(Math.round(nd) + " km") : "—") + '</div><div class="lbl">' + T("dr.s.nearest") + "</div></div>" +
      '<div class="stat"><div class="num">' + (recent ? dg(recent.year) : "—") + '</div><div class="lbl">' + T("dr.s.recent") + "</div></div></div>";

    /* ---- insights card ---- */
    var lines = [];
    if (strongest) lines.push(T("dr.strongline").replace("{m}", dg(strongest.mag.toFixed(1))).replace("{place}", esc(strongest.place)).replace("{year}", dg(strongest.year)).replace("{d}", dg(Math.round(strongest.d))));
    if (recent) lines.push(T("dr.recentline").replace("{m}", dg(recent.mag.toFixed(1))).replace("{place}", esc(recent.place)).replace("{when}", dg(recent.year)).replace("{d}", dg(Math.round(recent.d))));
    if (n100 > 0) lines.push(T("dr.bandline").replace("{a}", dg(b6)).replace("{b}", dg(b5)).replace("{c}", dg(b45)).replace("{n}", dg(n50)));
    else lines.push(T("dr.none.near"));
    if (medDepth != null) lines.push(T("dr.depthline").replace("{d}", dg(Math.round(medDepth))));
    if (fault) lines.push(T("dr.faultline").replace("{name}", fault.name).replace("{d}", dg(Math.round(fault.d))));

    var insights = '<div class="card reveal in" style="margin-bottom:14px">' +
      '<h4 style="margin:0 0 10px">' + T("dr.insights.t") + "</h4>" +
      '<ul style="margin:0;padding-left:1.05em;color:var(--ink-soft);line-height:1.65">' +
      lines.map(function (x) { return "<li>" + x + "</li>"; }).join("") + "</ul>";

    if (gNear) {
      var feltKm = 12 * Math.pow(10, 0.30 * (gNear.mag - 3));
      var feltKey = gNear.d <= feltKm ? "dr.felt.strong" : (gNear.d <= 2 * feltKm ? "dr.felt.mod" : "dr.felt.light");
      insights += '<div class="callout" style="margin-top:12px"><div><strong>' + T("dr.great.t") + "</strong>" +
        '<p style="margin-top:6px">' + T("dr.greatline").replace("{name}", esc(gNear.name)).replace("{m}", dg(gNear.mag.toFixed(1))).replace("{year}", dg(gNear.year)).replace("{d}", dg(Math.round(gNear.d))) +
        " " + T(feltKey) + "</p></div></div>";
    }
    insights += "</div>";
    res.innerHTML = h + insights;
    res.style.display = "block";

    /* ---- terrain hazard + disclaimer ---- */
    if (resB) {
      resB.innerHTML = '<div class="callout ' + (dangerZone ? "danger" : "") + ' reveal in" style="margin-bottom:14px">' + ICON_WARN +
        "<div><strong>" + T("dr.haz.t") + '</strong><p style="margin-top:6px">' + T("dr.note." + d.zone) + "</p></div></div>" +
        '<div class="callout info reveal in">' + ICON_INFO + "<p>" + T("dr.disclaimer") + "</p></div>";
      resB.style.display = "block";
    }

    /* ---- map ---- */
    if (mapSec) {
      mapSec.style.display = "block";
      var ttl = document.getElementById("distMapTitle"); if (ttl) ttl.textContent = T("dr.map.t").replace("{name}", name);
      var hint = document.getElementById("distMapHint"); if (hint) hint.textContent = T("dr.map.hint");
      var leg = document.getElementById("distLegend");
      if (leg) leg.innerHTML =
        '<span><i style="background:#FB923C"></i>' + T("dr.leg.m45") + "</span>" +
        '<span><i style="background:#F97316"></i>' + T("dr.leg.m5") + "</span>" +
        '<span><i style="background:#EF4444"></i>' + T("dr.leg.m6") + "</span>" +
        '<span><i style="background:#FF4D2E;border:2px solid #fff"></i>' + T("dr.leg.you") + "</span>";
      updateMap(d, name, nearby);
    }
  }
})();
