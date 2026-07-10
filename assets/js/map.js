/* ==========================================================================
   EQ Sentry — Live map (Leaflet) with 3 data sources:
   live USGS feed · stored Nepal catalogue · notable historic events
   Requires: Leaflet (L), i18n.js (window.EQ)
   ========================================================================== */
(function () {
  "use strict";

  var REGIONS = {
    nepal: { minLat: 26, maxLat: 31, minLon: 79, maxLon: 89, center: [28.3, 84.0], zoom: 6 },
    south: { minLat: 5, maxLat: 40, minLon: 60, maxLon: 100, center: [22, 82], zoom: 4 },
    world: { minLat: -90, maxLat: 90, minLon: -180, maxLon: 180, center: [20, 30], zoom: 2 }
  };

  var state = { source: "catalog", period: "week", mag: "2.5", region: "nepal", heat: false, plates: true, dateFrom: null, dateTo: null, fmag: 0 };
  var map, markerLayer, nepalRect, current = [];
  var pendingFocus = null;              // quake id from a #eq= deep link (home feed)
  var markersById = {};
  var cache = {}; // local files
  var heatLayer = null, platesLayer = null;
  var seenLive = {}, liveTimer = null;
  var clusterLayer = null, youLayer = null, waveLayer = null, tileLayer = null;
  var youLoc = null;   // user's located position (for distance / arrival-time lines)
  function tileURL() {
    return document.documentElement.classList.contains("light")
      ? "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      : "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
  }

  /* Plate boundaries embedded inline so they always render (no fetch / works on file://).
     Generalized India–Eurasia / India–Sunda boundary; based on Bird (2003) PB2002. */
  var PLATES = {
    type: "FeatureCollection",
    features: [
      { type: "Feature", properties: { kind: "convergent",
          name_en: "Himalayan front — India–Eurasia plate boundary",
          name_ne: "हिमालयन मोर्चा — भारत–युरेसिया प्लेट सीमा" },
        geometry: { type: "LineString", coordinates: [
          [74.0,33.2],[75.0,32.6],[76.0,32.0],[77.2,31.0],[78.5,30.4],[80.0,29.9],
          [81.2,29.3],[82.4,28.8],[83.5,28.3],[84.6,27.9],[85.7,27.5],[86.8,27.1],
          [88.0,26.8],[89.0,26.8],[90.2,26.9],[91.5,27.0],[92.8,27.4],[94.2,28.2],[95.3,28.7] ] } },
      { type: "Feature", properties: { kind: "convergent",
          name_en: "Indo-Burman ranges — India–Sunda boundary",
          name_ne: "इन्डो-बर्मन शृंखला — भारत–सुन्डा सीमा" },
        geometry: { type: "LineString", coordinates: [
          [95.3,28.7],[96.2,27.5],[95.6,25.5],[94.6,23.5],[94.0,21.5],[93.6,19.5],[93.4,17.5] ] } },
      { type: "Feature", properties: { kind: "transform",
          name_en: "Chaman fault zone — western boundary",
          name_ne: "चमन भ्रंश क्षेत्र — पश्चिमी सीमा" },
        geometry: { type: "LineString", coordinates: [
          [74.0,33.2],[72.5,32.0],[71.0,30.5],[69.5,29.5],[67.8,28.5],[66.5,27.0],[65.8,25.5] ] } },
      { type: "Feature", properties: { kind: "fault",
          name_en: "Main Boundary Thrust (MBT)", name_ne: "मुख्य सीमा थ्रस्ट (MBT)" },
        geometry: { type: "LineString", coordinates: [
          [80.0,30.25],[81.2,29.65],[82.4,29.15],[83.5,28.65],[84.6,28.25],[85.7,27.85],[86.8,27.45],[88.0,27.15] ] } },
      { type: "Feature", properties: { kind: "fault",
          name_en: "Main Central Thrust (MCT)", name_ne: "मुख्य केन्द्रीय थ्रस्ट (MCT)" },
        geometry: { type: "LineString", coordinates: [
          [80.0,30.6],[81.2,30.0],[82.4,29.5],[83.5,29.0],[84.6,28.6],[85.7,28.2],[86.8,27.8],[88.0,27.5] ] } }
    ]
  };

  function T(k) { return window.EQ ? window.EQ.t(k) : k; }
  function dg(s) { return (window.EQ && window.EQ.dg) ? window.EQ.dg(s) : String(s); }
  function PL(s) { return (window.EQ && window.EQ.place) ? window.EQ.place(s) : String(s == null ? "" : s); }
  var AC;
  function sndOn() { try { return localStorage.getItem("eqsentry_snd") === "1"; } catch (e) { return false; } }
  function chirp() {
    try {
      AC = AC || new (window.AudioContext || window.webkitAudioContext)();
      if (AC.state === "suspended") AC.resume();
      var t0 = AC.currentTime;
      [880, 660].forEach(function (f, i) {
        var o = AC.createOscillator(), g = AC.createGain();
        o.type = "sine"; o.frequency.value = f;
        g.gain.setValueAtTime(0.001, t0 + i * 0.28);
        g.gain.exponentialRampToValueAtTime(0.25, t0 + i * 0.28 + 0.04);
        g.gain.exponentialRampToValueAtTime(0.001, t0 + i * 0.28 + 0.24);
        o.connect(g); g.connect(AC.destination);
        o.start(t0 + i * 0.28); o.stop(t0 + i * 0.28 + 0.26);
      });
    } catch (e) {}
    if (navigator.vibrate) { try { navigator.vibrate([180, 90, 180]); } catch (e) {} }
  }
  function updateSnd() {
    var b = document.getElementById("sndToggle"); if (!b) return;
    var on = sndOn();
    b.textContent = T(on ? "map.snd.on" : "map.snd.off");
    b.setAttribute("aria-pressed", on ? "true" : "false");
    b.classList.toggle("active", on);
  }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  /* ---------- Shareable URLs: filters live in the hash (#src=…&fmag=…) ---------- */
  var DEFAULTS = { source: "catalog", period: "week", mag: "2.5", region: "nepal", fmag: "0" };
  function dateStr(ms) { return new Date(ms).toISOString().slice(0, 10); }
  function stateToHash() {
    var p = [];
    if (state.source !== DEFAULTS.source) p.push("src=" + state.source);
    if (state.region !== DEFAULTS.region) p.push("region=" + state.region);
    if (state.period !== DEFAULTS.period) p.push("period=" + state.period);
    if (String(state.mag) !== DEFAULTS.mag) p.push("mag=" + state.mag);
    if (Number(state.fmag)) p.push("fmag=" + state.fmag);
    if (state.dateFrom != null) p.push("from=" + dateStr(state.dateFrom));
    if (state.dateTo != null) p.push("to=" + dateStr(state.dateTo));
    if (state.heat) p.push("heat=1");
    if (!state.plates) p.push("plates=0");
    var url = location.pathname + location.search + (p.length ? "#" + p.join("&") : "");
    if (history.replaceState) history.replaceState(null, "", url);
  }
  function hashToState() {
    var h = location.hash.replace(/^#/, "");
    if (!h) return;
    var q = {};
    h.split("&").forEach(function (kv) {
      var i = kv.indexOf("="); if (i > 0) q[kv.slice(0, i)] = decodeURIComponent(kv.slice(i + 1));
    });
    if (/^(live|emsc|catalog|notable)$/.test(q.src || "")) state.source = q.src;
    if (/^(nepal|south|world)$/.test(q.region || "")) state.region = q.region;
    if (/^(day|week)$/.test(q.period || "")) state.period = q.period;
    if (/^(2\.5|4\.5)$/.test(q.mag || "")) state.mag = q.mag;
    if (/^(5|6|7)$/.test(q.fmag || "")) state.fmag = q.fmag;
    var from = q.from ? Date.parse(q.from + "T00:00:00Z") : NaN;
    var to = q.to ? Date.parse(q.to + "T23:59:59Z") : NaN;
    if (!isNaN(from)) state.dateFrom = from;
    if (!isNaN(to)) state.dateTo = to;
    if (q.heat === "1") state.heat = true;
    if (q.plates === "0") state.plates = false;
    if (q.eq) pendingFocus = q.eq;
  }
  function syncSeg(id, value) {
    var seg = document.getElementById(id); if (!seg) return;
    seg.querySelectorAll("button").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-value") === String(value));
    });
  }
  function syncControlsToState() {
    syncSeg("segSource", state.source);
    syncSeg("segRegion", state.region);
    syncSeg("segPeriod", state.period);
    syncSeg("segMag", state.mag);
    syncSeg("segFmag", state.fmag || "0");
    var f = document.getElementById("dateFrom"), t = document.getElementById("dateTo");
    if (f && state.dateFrom != null) f.value = dateStr(state.dateFrom);
    if (t && state.dateTo != null) t.value = dateStr(state.dateTo);
    if (state.dateFrom != null || state.dateTo != null) clearPreset();
  }

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
    var r = Math.max(4, Math.pow(Math.max(m, 1), 1.55) * 1.35);
    return notable ? r + 3 : r;
  }
  function fmtLocal(ms) {
    if (window.EQ && window.EQ.fmtDT) return window.EQ.fmtDT(ms);
    try { return new Date(ms).toLocaleString(); } catch (e) { return ""; }
  }

  function initMap() {
    map = L.map("map", { scrollWheelZoom: true, worldCopyJump: true, zoomControl: true })
      .setView(REGIONS.nepal.center, REGIONS.nepal.zoom);
    tileLayer = L.tileLayer(tileURL(), {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
      subdomains: "abcd", maxZoom: 19
    }).addTo(map);
    document.addEventListener("eq:themechange", function () { if (tileLayer) tileLayer.setUrl(tileURL()); });
    markerLayer = L.layerGroup().addTo(map);
    if (typeof L.markerClusterGroup === "function")
      clusterLayer = L.markerClusterGroup({ chunkedLoading: true, maxClusterRadius: 48, showCoverageOnHover: false });
  }

  function drawRegionOutline() {
    if (nepalRect) { map.removeLayer(nepalRect); nepalRect = null; }
    if (state.region === "nepal" && state.source !== "notable") {
      var b = REGIONS.nepal;
      nepalRect = L.rectangle([[b.minLat, b.minLon], [b.maxLat, b.maxLon]],
        { color: "#FF4D2E", weight: 1, dashArray: "6 7", fill: false, interactive: false, opacity: .5 }).addTo(map);
    }
  }

  function setStatus(html, spinning) {
    var el = document.getElementById("mapStatus");
    if (el) el.innerHTML = (spinning ? '<span class="spinner"></span>' : "") + html;
  }

  function youLine(e) {
    if (!youLoc || typeof e.lat !== "number") return "";
    var d = haversineKm(youLoc.lat, youLoc.lon, e.lat, e.lon);
    return '<br><span class="sub" style="color:var(--accent-2)">' + T("map.youline")
      .replace("{d}", dg(Math.round(d))).replace("{p}", dg(Math.max(1, Math.round(d / 8))))
      .replace("{s}", dg(Math.max(1, Math.round(d / 4.6)))) + '</span>';
  }
  function popupHTML(e) {
    var color = magColor(e.mag);
    if (e.notable) {
      var name = window.EQ.getLang() === "ne" ? e.name_ne : e.name_en;
      var sum = window.EQ.getLang() === "ne" ? e.summary_ne : e.summary_en;
      return '<div class="lpop"><span class="m" style="color:' + color + '">' + dg("M " + e.mag.toFixed(1)) + '</span> · ' + dg(e.year) + (e.time ? ' <span class="sub">(' + T("u.bs") + ' ' + dg(window.EQ.bsYear(e.time)) + ')</span>' : '') +
        '<br><b>' + name + '</b><br>' +
        (e.deaths ? '<span class="sub">' + dg(e.deaths.toLocaleString()) + ' ' + T("map.deaths") + '</span><br>' : '') +
        '<span style="font-size:.82rem;color:var(--ink-soft)">' + sum + '</span>' + youLine(e) +
        (e.url ? '<br><a href="' + e.url + '" target="_blank" rel="noopener">' + T("map.viewusgs") + " →</a>" : "") + '</div>';
    }
    return '<div class="lpop"><span class="m" style="color:' + color + '">' + dg("M " + (e.mag != null ? e.mag.toFixed(1) : "?")) +
      '</span><br><b>' + esc(PL(e.place || "—")) + '</b><br><span class="sub">' + T("map.depth") + ": " +
      dg((e.depth != null ? e.depth.toFixed(0) : "?") + " km") + " · " + fmtLocal(e.time) + '</span>' +
      (e.mmi != null ? '<br><span class="sub">' + T("map.mmi") + ": " + dg(e.mmi.toFixed(1)) + '</span>' : "") +
      (e.felt != null && e.felt > 0 ? '<br><span class="sub">' + T("map.felt") + ": " + dg(e.felt) + (e.cdi != null ? " · " + T("map.cdi") + " " + dg(e.cdi.toFixed(1)) : "") + '</span>' : "") +
      youLine(e) +
      (e.url ? '<br><a href="' + e.url + '" target="_blank" rel="noopener">' + (e.source === "EMSC" ? T("map.viewemsc") : T("map.viewusgs")) + " →</a>" : "") +
      (e.url && e.source !== "EMSC" ? '<br><a href="' + e.url + '/tellus" target="_blank" rel="noopener" style="color:var(--accent)">' + T("map.dyfi") + "</a>" : "") + "</div>";
  }

  function render(list) {
    current = list;
    markerLayer.clearLayers();
    if (clusterLayer) clusterLayer.clearLayers();
    var useCluster = state.source === "catalog" && clusterLayer;
    if (useCluster) { if (!map.hasLayer(clusterLayer)) clusterLayer.addTo(map); }
    else if (clusterLayer && map.hasLayer(clusterLayer)) map.removeLayer(clusterLayer);
    var target = useCluster ? clusterLayer : markerLayer;
    markersById = {};
    var box = document.getElementById("quakeList");
    box.innerHTML = "";

    if (!list.length) {
      box.innerHTML = '<div style="padding:26px 18px;color:var(--ink-faint)">' + T("map.empty") + "</div>";
      setStatus("0 " + T("map.quakes"), false);
      return;
    }

    var maxMag = -Infinity;
    list.forEach(function (e, i) {
      var color = magColor(e.mag);
      var m = L.circleMarker([e.lat, e.lon], {
        radius: magRadius(e.mag, e.notable),
        color: e.notable ? "#fff" : "rgba(255,255,255,.65)",
        weight: e.notable ? 2 : 1, fillColor: color, fillOpacity: .8
      });
      m.bindPopup(popupHTML(e));
      m.on("click", function () { playWave(e.lat, e.lon, e.mag); });
      m.addTo(target);
      var key = e.id || ("n" + i);
      m._eq = e;
      markersById[key] = m;
      if (e.mag != null && e.mag > maxMag) maxMag = e.mag;

      var sub = e.notable
        ? (dg(e.year) + (e.deaths ? " · " + dg(e.deaths.toLocaleString()) + " " + T("map.deaths") : ""))
        : (T("map.depth") + " " + dg((e.depth != null ? e.depth.toFixed(0) : "?") + " km") + " · " + window.EQ.fmtAgo(e.time));
      var place = esc(e.notable ? (window.EQ.getLang() === "ne" ? e.name_ne : e.name_en) : PL(e.place || "—"));

      var item = document.createElement("div");
      item.className = "quake-item";
      item.innerHTML = '<div class="mag-badge" style="background:' + color + '">' +
        dg(e.mag != null ? e.mag.toFixed(1) : "?") + '</div><div class="quake-meta"><div class="place">' +
        place + '</div><div class="sub">' + sub + "</div></div>";
      item.addEventListener("click", function () {
        map.setView([e.lat, e.lon], Math.max(map.getZoom(), 7));
        markersById[key].openPopup();
        playWave(e.lat, e.lon, e.mag);
      });
      box.appendChild(item);
    });

    var label = state.source === "notable" ? T("map.events") : T("map.quakes");
    setStatus(dg(list.length) + " " + label +
      (maxMag > -Infinity ? " · " + T("map.largest") + " " + dg("M" + maxMag.toFixed(1)) : ""), false);

    buildHeat(list);
    if (platesLayer && state.plates) platesLayer.bringToFront();
    if (state.source === "live" || state.source === "emsc") list.forEach(function (e) { if (e.id) seenLive[e.id] = 1; });

    // Deep link from the homepage feed: focus one quake and open its popup.
    if (pendingFocus) {
      var fm = markersById[pendingFocus];
      pendingFocus = null;                 // one attempt only — never hijack a later re-render
      if (fm) {
      var fll = fm.getLatLng();
      map.setView(fll, Math.max(map.getZoom() || 0, 9), { animate: true });
      setTimeout(function () {
        var show = function () {
          fm.openPopup();
          if (fm._eq) playWave(fm._eq.lat, fm._eq.lon, fm._eq.mag);   // same HUD as a direct marker tap
        };
        if (clusterLayer && state.source === "catalog" && clusterLayer.zoomToShowLayer) {
          try { clusterLayer.zoomToShowLayer(fm, show); } catch (e) { show(); }
        } else { show(); }
      }, 320);
      }
    }
    stateToHash();
  }

  function inRegion(lon, lat) {
    var R = REGIONS[state.region];
    return lat >= R.minLat && lat <= R.maxLat && lon >= R.minLon && lon <= R.maxLon;
  }

  function getLocal(path) {
    if (cache[path]) return Promise.resolve(cache[path]);
    return fetch(path).then(function (r) { if (!r.ok) throw new Error("nf"); return r.json(); })
      .then(function (j) { cache[path] = j; return j; });
  }
  // Prefer inline embedded data (works offline / via file://), else fetch the file.
  function getData(key, path) {
    var w = window.EQData ? window.EQData.whenReady() : Promise.resolve();
    return w.then(function () {
      if (window.EQ_DATA && window.EQ_DATA[key]) return window.EQ_DATA[key];
      return getLocal(path);
    });
  }

  function parseUSGS(data) {
    return (data.features || []).filter(function (f) {
      var c = f.geometry && f.geometry.coordinates; return c && inRegion(c[0], c[1]);
    }).map(function (f) {
      var c = f.geometry.coordinates, p = f.properties;
      return { id: f.id, lat: c[1], lon: c[0], depth: c[2], mag: p.mag, place: p.place, time: p.time, url: p.url, mmi: p.mmi, felt: p.felt, cdi: p.cdi, source: "USGS" };
    }).sort(function (a, b) { return b.time - a.time; });
  }
  function parseEMSC(data) {
    return (data.features || []).map(function (f) {
      var c = (f.geometry && f.geometry.coordinates) || [], p = f.properties || {};
      var t = typeof p.time === "number" ? p.time : Date.parse(p.time);
      return { id: f.id || p.unid, lat: c[1], lon: c[0],
        depth: p.depth != null ? Math.abs(p.depth) : (c[2] != null ? Math.abs(c[2]) : null),
        mag: (p.mag != null ? p.mag : p.magnitude), place: p.flynn_region || p.region || "—", time: t,
        url: p.unid ? "https://www.seismicportal.eu/eventdetails.html?unid=" + p.unid : null, source: "EMSC" };
    }).filter(function (e) { return e.lat != null && e.lon != null && !isNaN(e.time) && inRegion(e.lon, e.lat); })
      .sort(function (a, b) { return b.time - a.time; });
  }
  function sourceFeed() {
    if (state.source === "emsc") {
      var R = REGIONS[state.region], days = state.period === "day" ? 1 : 7;
      var start = new Date(Date.now() - days * 86400000).toISOString().slice(0, 19);
      var params = "format=json&orderby=time&limit=900&minmagnitude=" + state.mag + "&starttime=" + start
        + (state.region === "world" ? "" : "&minlatitude=" + R.minLat + "&maxlatitude=" + R.maxLat + "&minlongitude=" + R.minLon + "&maxlongitude=" + R.maxLon);
      var url = window.EQ_EMSC_URL ? window.EQ_EMSC_URL(params) : "https://www.seismicportal.eu/fdsnws/event/1/query?" + params;
      return { url: url, parse: parseEMSC };
    }
    return { url: window.EQ_FEED_URL(state.mag + "_" + state.period), parse: parseUSGS };
  }

  function load() {
    if (!map) return;
    drawRegionOutline();
    setStatus(T("map.loading"), true);

    if (state.source === "live" || state.source === "emsc") {
      var f = sourceFeed();
      fetch(f.url).then(function (r) { if (!r.ok) throw new Error("http"); return r.json(); })
        .then(function (data) { flyAndRender(f.parse(data)); }).catch(fail);

    } else if (state.source === "catalog") {
      getData("catalog", "data/nepal_earthquakes.geojson").then(function (fc) {
        var list = fc.features.filter(function (f) {
          var c = f.geometry.coordinates; return inRegion(c[0], c[1]);
        }).map(function (f) {
          var c = f.geometry.coordinates, p = f.properties;
          return { id: p.id, lat: c[1], lon: c[0], depth: c[2], mag: p.mag, place: p.place, time: p.time, url: p.url };
        }).sort(function (a, b) { return b.time - a.time; });
        flyAndRender(applyFilters(list));
      }).catch(fail);

    } else { // notable
      getData("notable", "data/notable_earthquakes.geojson").then(function (fc) {
        var list = fc.features.map(function (f) {
          var c = f.geometry.coordinates, p = f.properties;
          return { lat: c[1], lon: c[0], mag: p.mag, notable: true, year: p.year, deaths: p.deaths, url: p.usgs_url,
                   name_en: p.name_en, name_ne: p.name_ne, summary_en: p.summary_en, summary_ne: p.summary_ne, time: null };
        }).sort(function (a, b) { return b.year - a.year; });
        map.flyTo(REGIONS.nepal.center, REGIONS.nepal.zoom, { duration: .6 });
        render(list);
      }).catch(fail);
    }
  }

  function flyAndRender(list) {
    var R = REGIONS[state.region];
    map.flyTo(R.center, R.zoom, { duration: .6 });
    render(list);
  }
  function fail() {
    setStatus('<span style="color:#EF4444">' + T("map.error") + "</span>", false);
    document.getElementById("quakeList").innerHTML =
      '<div style="padding:26px 18px;color:#EF4444">' + T("map.error") + "</div>";
  }

  /* ---------- Live auto-refresh + new-quake toast ---------- */
  function toast(html) {
    var el = document.getElementById("eqToast");
    if (!el) { el = document.createElement("div"); el.id = "eqToast"; el.className = "eq-toast"; el.setAttribute("role", "status"); el.setAttribute("aria-live", "polite"); document.body.appendChild(el); }
    el.innerHTML = '<span class="dot"></span><span>' + html + "</span>";
    el.classList.add("show");
    clearTimeout(el._t); el._t = setTimeout(function () { el.classList.remove("show"); }, 6500);
  }
  function autoRefreshLive() {
    if (state.source !== "live" && state.source !== "emsc") return;
    var f = sourceFeed();
    fetch(f.url).then(function (r) { return r.json(); }).then(function (data) {
      var list = f.parse(data);
      var fresh = list.filter(function (e) { return e.id && !seenLive[e.id]; });
      render(list);
      if (fresh.length) { if (sndOn()) chirp(); var n = fresh[0]; toast("<b>" + T("map.new") + ":</b> " + dg("M" + (n.mag != null ? n.mag.toFixed(1) : "?")) + " — " + esc(PL(n.place))); }
    }).catch(function () {});
  }
  function manageAutoRefresh() {
    if (liveTimer) { clearInterval(liveTimer); liveTimer = null; }
    if (state.source === "live" || state.source === "emsc") liveTimer = setInterval(autoRefreshLive, 120000);
  }

  /* ---------- Shake-wave animation (how far the shaking was felt) ---------- */
  /* Real seismic-wave propagation: a fast P-wavefront and a slower, stronger
     S-wavefront expand from the epicentre at true crustal velocities (radii are
     geographically exact on the map). A shaded "felt" disk trails the S front.
     Runs in real time (1:1) for >=60 s, then fades. */
  var waveAnimId = 0, currentWaveStop = null;
  function playWave(lat, lon, mag) {
    if (typeof lat !== "number") return;
    if (mag == null) mag = 5;
    if (currentWaveStop) currentWaveStop();             // dismiss any wave already playing
    if (!waveLayer) waveLayer = L.layerGroup().addTo(map);
    waveLayer.clearLayers();
    var orphan = map.getContainer().querySelector(".wave-hud");
    if (orphan) orphan.parentNode.removeChild(orphan);
    var myId = ++waveAnimId;

    var vP = 8.0, vS = 4.6;                                   // km/s — regional crustal averages
    var SIM = 72;                                             // seconds of real-time animation (>= 60)
    var feltKm = Math.min(500, 12 * Math.pow(10, 0.30 * (mag - 3))); // strong-shaking radius ~ magnitude
    var accent = magColor(mag);

    var feltDisk = L.circle([lat, lon], { radius: 0, stroke: false, fillColor: accent, fillOpacity: 0.10 }).addTo(waveLayer);
    var sRing = L.circle([lat, lon], { radius: 0, color: accent, weight: 3, fill: false, opacity: 0.9 }).addTo(waveLayer);
    var pRing = L.circle([lat, lon], { radius: 0, color: "#9ecbff", weight: 1.5, dashArray: "4 5", fill: false, opacity: 0.85 }).addTo(waveLayer);
    var epi = L.circleMarker([lat, lon], { radius: 5, color: "#fff", weight: 2, fillColor: accent, fillOpacity: 1 }).addTo(waveLayer);

    var hud = document.createElement("div");
    hud.className = "wave-hud";
    hud.innerHTML = '<b>' + dg("M " + mag.toFixed(1)) + '</b><span><i class="wd wp"></i>' + T("map.pwave") + ' <u id="wpk">' + dg("0") + '</u> ' + T("u.km") + '</span>' +
      '<span><i class="wd ws"></i>' + T("map.swave") + ' <u id="wsk">' + dg("0") + '</u> ' + T("u.km") + '</span><span class="wt"><u id="wts">' + dg("0") + '</u> ' + T("u.s") + '</span>' +
      '<button type="button" class="wave-x" aria-label="' + T("map.stopwave") + '" title="' + T("map.stopwave") + ' (Esc)">✕</button>';
    map.getContainer().appendChild(hud);
    var wpk = hud.querySelector("#wpk"), wsk = hud.querySelector("#wsk"), wts = hud.querySelector("#wts");

    function stop() {
      waveAnimId++;                                      // halt the animation loop
      if (waveLayer) waveLayer.clearLayers();
      if (hud.parentNode) hud.parentNode.removeChild(hud);
      document.removeEventListener("keydown", onKey);
      if (currentWaveStop === stop) currentWaveStop = null;
    }
    function onKey(e) { if (e.key === "Escape" || e.key === "Esc") stop(); }
    document.addEventListener("keydown", onKey);
    hud.querySelector(".wave-x").addEventListener("click", stop);
    currentWaveStop = stop;

    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      pRing.setRadius(vP * SIM * 1000); sRing.setRadius(vS * SIM * 1000); feltDisk.setRadius(feltKm * 1000);
      if (wpk) wpk.textContent = dg(Math.round(vP * SIM)); if (wsk) wsk.textContent = dg(Math.round(vS * SIM)); if (wts) wts.textContent = dg(SIM);
      return;
    }

    var start = performance.now();
    function step(now) {
      if (myId !== waveAnimId) return;                       // a newer wave took over
      var te = (now - start) / 1000;                         // real seconds elapsed
      var pr = vP * te, sr = vS * te;                        // wavefront radii (km)
      pRing.setRadius(pr * 1000);
      sRing.setRadius(sr * 1000);
      feltDisk.setRadius(Math.min(sr, feltKm) * 1000);
      feltDisk.setStyle({ fillOpacity: 0.13 * Math.max(0, 1 - sr / (feltKm * 1.7)) });
      pRing.setStyle({ opacity: Math.max(0.12, 0.85 - pr / 1500) });
      sRing.setStyle({ opacity: Math.max(0.18, 0.95 - sr / 950) });
      epi.setStyle({ radius: 5 + 2.2 * Math.abs(Math.sin(te * 5)) });
      if (wpk) wpk.textContent = dg(Math.round(pr));
      if (wsk) wsk.textContent = dg(Math.round(sr));
      if (wts) wts.textContent = dg(te.toFixed(0));
      if (te < SIM) { requestAnimationFrame(step); return; }
      var fadeStart = now;
      (function fade(n2) {
        if (myId !== waveAnimId) return;
        var k = 1 - (n2 - fadeStart) / 1400;
        if (k <= 0) { stop(); return; }
        pRing.setStyle({ opacity: 0.5 * k }); sRing.setStyle({ opacity: 0.65 * k });
        feltDisk.setStyle({ fillOpacity: 0.13 * k }); hud.style.opacity = k;
        requestAnimationFrame(fade);
      })(now);
    }
    requestAnimationFrame(step);
  }

  /* ---------- "Quakes near me" (geolocation) ---------- */
  function haversineKm(aLat, aLon, bLat, bLon) {
    var R = 6371, toRad = function (d) { return d * Math.PI / 180; };
    var dLat = toRad(bLat - aLat), dLon = toRad(bLon - aLon);
    var x = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * R * Math.asin(Math.sqrt(x));
  }
  function nearMe() {
    if (!navigator.geolocation) { toast(T("map.geoerr")); return; }
    toast(T("map.locating"));
    navigator.geolocation.getCurrentPosition(function (pos) {
      var la = pos.coords.latitude, lo = pos.coords.longitude;
      youLoc = { lat: la, lon: lo };
      if (current && current.length) render(current.slice());   // rebuild popups with distance/arrival lines
      if (!youLayer) youLayer = L.layerGroup().addTo(map);
      youLayer.clearLayers();
      L.circle([la, lo], { radius: 30000, color: "#3b82f6", weight: 1, fillColor: "#3b82f6", fillOpacity: 0.06 }).addTo(youLayer);
      L.circleMarker([la, lo], { radius: 8, color: "#fff", weight: 2, fillColor: "#3b82f6", fillOpacity: 1 })
        .bindPopup(T("map.you")).addTo(youLayer).openPopup();
      map.setView([la, lo], 7);
      if (current && current.length) {
        var best = null, bd = Infinity;
        current.forEach(function (e) { var d = haversineKm(la, lo, e.lat, e.lon); if (d < bd) { bd = d; best = e; } });
        if (best) {
          var place = best.notable ? (window.EQ.getLang() === "ne" ? best.name_ne : best.name_en) : best.place;
          toast(T("map.nearest") + ": " + dg("M" + (best.mag != null ? best.mag.toFixed(1) : "?")) + " — " + dg(Math.round(bd) + " km") + " · " + place);
        }
      }
    }, function () { toast(T("map.geoerr")); }, { timeout: 8000, enableHighAccuracy: false });
  }

  /* ---------- Heatmap ---------- */
  function heatIntensity(m) {
    if (m == null) return 0.2;
    return Math.max(0.15, Math.min(1, (m - 3.5) / 4.5));
  }
  function buildHeat(list) {
    if (heatLayer) { map.removeLayer(heatLayer); heatLayer = null; }
    if (!state.heat || typeof L.heatLayer !== "function") return;
    var pts = list.map(function (e) { return [e.lat, e.lon, heatIntensity(e.mag)]; });
    heatLayer = L.heatLayer(pts, {
      radius: 24, blur: 18, minOpacity: 0.25, max: 1.0,
      gradient: { 0.2: "#22d3ee", 0.4: "#34D399", 0.6: "#FBBF24", 0.8: "#FB923C", 1.0: "#EF4444" }
    }).addTo(map);
    if (heatLayer._canvas) heatLayer._canvas.style.pointerEvents = "none";
  }

  /* ---------- Tectonic plate boundaries ---------- */
  function ensurePlates() {
    if (platesLayer) return;
    var data = PLATES; // authoritative inline data (includes MFT boundary + MBT/MCT faults)
    platesLayer = L.geoJSON(data, {
      style: function (f) {
        var k = f.properties && f.properties.kind;
        if (k === "transform") return { color: "#22d3ee", weight: 3, opacity: .9, dashArray: "7 6", lineCap: "round" };
        if (k === "fault") return { color: "#fbbf24", weight: 1.8, opacity: .8, dashArray: "2 6", lineCap: "round" };
        return { color: "#f59e0b", weight: 3, opacity: .95, lineCap: "round" };
      },
      onEachFeature: function (f, layer) {
        var p = f.properties || {};
        var nm = window.EQ.getLang() === "ne" ? p.name_ne : p.name_en;
        if (nm) layer.bindTooltip(nm, { sticky: true, className: "plate-tip" });
      }
    });
    applyPlates();
  }
  function applyPlates() {
    if (!platesLayer) return;
    if (state.plates) { platesLayer.addTo(map); platesLayer.bringToFront(); }
    else if (map.hasLayer(platesLayer)) map.removeLayer(platesLayer);
  }
  function refreshPlates() { // rebuild for language change
    if (platesLayer && map.hasLayer(platesLayer)) map.removeLayer(platesLayer);
    platesLayer = null;
    ensurePlates();
  }

  /* ---------- Date / magnitude filters (catalogue) ---------- */
  function applyFilters(list) {
    var from = state.dateFrom, to = state.dateTo, fm = Number(state.fmag) || 0;
    if (from == null && to == null && !fm) return list;
    return list.filter(function (e) {
      if (fm && (e.mag == null || e.mag < fm)) return false;
      if (e.time == null) return true;
      if (from != null && e.time < from) return false;
      if (to != null && e.time > to) return false;
      return true;
    });
  }
  function todayStr() { return new Date().toISOString().slice(0, 10); }
  function clearPreset() { var seg = document.getElementById("segPreset"); if (seg) seg.querySelectorAll("button").forEach(function (x) { x.classList.remove("active"); }); }
  function wireDates() {
    var f = document.getElementById("dateFrom"), to = document.getElementById("dateTo");
    if (f) { f.max = todayStr(); f.addEventListener("change", function () {
      state.dateFrom = f.value ? Date.parse(f.value + "T00:00:00Z") : null; clearPreset(); load(); }); }
    if (to) { to.max = todayStr(); to.addEventListener("change", function () {
      state.dateTo = to.value ? Date.parse(to.value + "T23:59:59Z") : null; clearPreset(); load(); }); }
  }
  function wirePresets() {
    var seg = document.getElementById("segPreset"); if (!seg) return;
    seg.querySelectorAll("button").forEach(function (b) {
      b.addEventListener("click", function () {
        seg.querySelectorAll("button").forEach(function (x) { x.classList.remove("active"); });
        b.classList.add("active");
        var v = b.getAttribute("data-value"), now = Date.now(), from = null;
        if (v === "1y") from = now - 365 * 86400000;
        else if (v === "10y") from = now - 3650 * 86400000;
        else if (v === "2015") from = Date.parse("2015-01-01T00:00:00Z");
        state.dateFrom = from; state.dateTo = null;
        var fi = document.getElementById("dateFrom"), ti = document.getElementById("dateTo");
        if (fi) fi.value = from != null ? new Date(from).toISOString().slice(0, 10) : "";
        if (ti) ti.value = "";
        load();
      });
    });
  }

  function setControls() {
    var liveGroup = document.getElementById("liveGroup");
    var regionGroup = document.getElementById("regionGroup");
    var note = document.getElementById("srcNote");
    if (liveGroup) liveGroup.classList.toggle("hidden", !(state.source === "live" || state.source === "emsc"));
    if (regionGroup) regionGroup.classList.toggle("hidden", state.source === "notable");
    var filterGroup = document.getElementById("filterGroup");
    if (filterGroup) filterGroup.classList.toggle("hidden", state.source !== "catalog");
    if (note) note.textContent = state.source === "catalog" ? T("map.catalognote")
      : state.source === "notable" ? T("map.notablenote")
      : state.source === "emsc" ? T("map.emscnote")
      : T("map.livenote");
    manageAutoRefresh();
  }

  function wireSeg(id, key, after) {
    var seg = document.getElementById(id);
    if (!seg) return;
    seg.querySelectorAll("button").forEach(function (b) {
      b.addEventListener("click", function () {
        seg.querySelectorAll("button").forEach(function (x) { x.classList.remove("active"); });
        b.classList.add("active");
        state[key] = b.getAttribute("data-value");
        if (after) after();
        load();
      });
    });
  }

  function wireLayerToggles() {
    [["btnHeat", "heat"], ["btnPlates", "plates"]].forEach(function (pair) {
      var b = document.getElementById(pair[0]);
      if (!b) return;
      if (state[pair[1]]) b.classList.add("active");
      b.addEventListener("click", function () {
        state[pair[1]] = !state[pair[1]];
        b.classList.toggle("active", state[pair[1]]);
        if (pair[1] === "heat") buildHeat(current);
        else applyPlates();
        stateToHash();
      });
    });
  }

  function init() {
    if (typeof L === "undefined") return;
    hashToState();                       // restore filters from a shared link
    initMap();
    ensurePlates();
    wireSeg("segSource", "source", setControls);
    wireSeg("segRegion", "region");
    wireSeg("segPeriod", "period");
    wireSeg("segMag", "mag");
    wireSeg("segFmag", "fmag");
    wireDates();
    wirePresets();
    wireLayerToggles();
    syncControlsToState();               // reflect restored state in the UI
    var nm = document.getElementById("btnNearMe");
    if (nm) nm.addEventListener("click", nearMe);
    // Copy a shareable link (filters live in the hash)
    var sh = document.getElementById("btnShare");
    if (sh) sh.addEventListener("click", function () {
      var url = location.href;
      var done = function () { toast(T("map.copied")); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, function () { window.prompt("URL", url); });
      else window.prompt("URL", url);
    });
    // Fullscreen map
    var fu = document.getElementById("btnFull"), layout = document.querySelector(".map-layout");
    if (fu && layout && layout.requestFullscreen) {
      fu.addEventListener("click", function () {
        if (document.fullscreenElement) document.exitFullscreen();
        else layout.requestFullscreen().catch(function () {});
      });
      document.addEventListener("fullscreenchange", function () {
        setTimeout(function () { if (map) map.invalidateSize(); }, 150);
      });
    } else if (fu) fu.style.display = "none";
    setControls();
    load();
    document.addEventListener("eq:langchange", function () {
      setControls();
      updateSnd();
      refreshPlates();
      if (current.length) render(current.slice());
    });
    // refresh the source note once the catalogue arrives ({count|…} tokens resolve)
    var sndBtn = document.getElementById("sndToggle");
    if (sndBtn) {
      updateSnd();
      sndBtn.addEventListener("click", function () {
        var on = !sndOn();
        try { localStorage.setItem("eqsentry_snd", on ? "1" : "0"); } catch (e) {}
        if (on) chirp();                                   // user gesture unlocks audio + preview
        updateSnd();
      });
    }
    document.addEventListener("eq:dataready", setControls);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
