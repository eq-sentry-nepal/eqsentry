/* ==========================================================================
   EQ Sentry — shared live-data ENGINE (window.EQEngine)
   One fetch per page feeds every dynamic element on the site. It merges live
   data from USGS + EMSC near Nepal (de-duplicated), derives summary stats,
   updates the live banner (#alertBar), and fills any element that carries a
   data-eq="field" attribute. Auto-refreshes every 2 min and re-binds on
   language change. Degrades gracefully if a source (or the network) is down.

   Depends on: window.EQ (i18n.js) for fmtAgo / t / NEPAL_BOX,
               window.EQ_FEED_URL + window.EQ_EMSC_URL,
               window.EQ_DATA (data-layers.js) for catalogue totals (optional).

   Declarative fields (use as <span data-eq="latest.mag"></span>):
     latest.mag · latest.place · latest.ago · latest.source
     week.count · month.count · strongest7d · strongest30d
     daysSince · total · maxMag · since
   Programmatic API:
     EQEngine.onUpdate(cb) · EQEngine.ready(cb) · EQEngine.get() · EQEngine.refresh()
   ========================================================================== */
(function () {
  "use strict";
  var EQ = window.EQ || {};
  var BOX = EQ.NEPAL_BOX || { minLat: 26, maxLat: 31, minLon: 79, maxLon: 89 };
  var TTL = 120000, cache = null, lastFetch = 0, inflight = null, subs = [];

  function inBox(lon, lat) { return lat >= BOX.minLat && lat <= BOX.maxLat && lon >= BOX.minLon && lon <= BOX.maxLon; }
  function hav(aLat, aLon, bLat, bLon) {
    var R = 6371, r = function (d) { return d * Math.PI / 180; };
    var dLa = r(bLat - aLat), dLo = r(bLon - aLon);
    var x = Math.sin(dLa / 2) * Math.sin(dLa / 2) + Math.cos(r(aLat)) * Math.cos(r(bLat)) * Math.sin(dLo / 2) * Math.sin(dLo / 2);
    return 2 * R * Math.asin(Math.sqrt(x));
  }
  function fmtAgo(t) { return EQ.fmtAgo ? EQ.fmtAgo(t) : ""; }
  function dg(s) { return EQ.dg ? EQ.dg(s) : String(s); }
  function tr(k) { return EQ.t ? EQ.t(k) : k; }

  function fetchUSGS() {
    if (typeof window.EQ_FEED_URL !== "function") return Promise.resolve(null);
    return fetch(window.EQ_FEED_URL("2.5_month")).then(function (r) { return r.json(); }).then(function (d) {
      return (d.features || []).filter(function (f) { var c = f.geometry && f.geometry.coordinates; return c && inBox(c[0], c[1]); })
        .map(function (f) { var p = f.properties, c = f.geometry.coordinates; return { id: f.id, mag: p.mag, place: p.place, time: p.time, lat: c[1], lon: c[0], depth: c[2], url: p.url, mmi: p.mmi, source: "USGS" }; });
    }).catch(function () { return null; });
  }
  function fetchEMSC() {
    var start = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 19);
    var params = "format=json&orderby=time&limit=250&minmagnitude=2.5&starttime=" + start +
      "&minlatitude=" + BOX.minLat + "&maxlatitude=" + BOX.maxLat + "&minlongitude=" + BOX.minLon + "&maxlongitude=" + BOX.maxLon;
    var url = window.EQ_EMSC_URL ? window.EQ_EMSC_URL(params) : "https://www.seismicportal.eu/fdsnws/event/1/query?" + params;
    return fetch(url).then(function (r) { return r.json(); }).then(function (d) {
      return (d.features || []).map(function (f) {
        var c = (f.geometry && f.geometry.coordinates) || [], p = f.properties || {};
        return { id: f.id || p.unid, mag: (p.mag != null ? p.mag : p.magnitude), place: p.flynn_region || "—",
          time: (typeof p.time === "number" ? p.time : Date.parse(p.time)), lat: c[1], lon: c[0],
          depth: p.depth != null ? Math.abs(p.depth) : null,
          url: p.unid ? "https://www.seismicportal.eu/eventdetails.html?unid=" + p.unid : null, source: "EMSC" };
      }).filter(function (e) { return e.lat != null && !isNaN(e.time) && inBox(e.lon, e.lat); });
    }).catch(function () { return null; });
  }
  function merge(usgs, emsc) {
    var out = (usgs || []).slice();
    (emsc || []).forEach(function (e) {
      var m = null;
      for (var i = 0; i < out.length; i++) { if (Math.abs(out[i].time - e.time) < 90000 && hav(out[i].lat, out[i].lon, e.lat, e.lon) < 150) { m = out[i]; break; } }
      if (m) { if (m.source.indexOf("EMSC") < 0) m.source += " · EMSC"; }
      else out.push(e);
    });
    return out.sort(function (a, b) { return b.time - a.time; });
  }
  function strongest(list) { var s = null; list.forEach(function (e) { if (e.mag != null && (!s || e.mag > s.mag)) s = e; }); return s; }

  function build(events) {
    var now = Date.now();
    var d7 = events.filter(function (e) { return now - e.time <= 7 * 864e5; });
    var d30 = events.filter(function (e) { return now - e.time <= 30 * 864e5; });
    var m4 = events.filter(function (e) { return e.mag != null && e.mag >= 4; });
    var cat = (window.EQ_DATA && window.EQ_DATA.catalog && window.EQ_DATA.catalog.features) || [];
    var lastCatM4 = 0; cat.forEach(function (f) { var p = f.properties; if (p.mag >= 4 && p.time > lastCatM4) lastCatM4 = p.time; });
    var lastFelt = Math.max(m4.length ? m4[0].time : 0, lastCatM4);
    var sum = (window.EQ_DATA && window.EQ_DATA.summary) || {};
    return {
      events: events, recent: events.slice(0, 12), latest: events[0] || null,
      week: { count: d7.length, strongest: strongest(d7) },
      month: { count: d30.length, strongest: strongest(d30) },
      strongest7d: strongest(d7), strongest30d: strongest(d30),
      daysSinceFelt: lastFelt ? Math.max(0, Math.floor((now - lastFelt) / 864e5)) : null,
      lastFelt: lastFelt || null,
      total: (sum.count != null ? sum.count : (cat.length || null)),
      maxMag: (sum.maxMag != null ? sum.maxMag : null),
      since: (sum.since != null ? sum.since : null),
      live: !!events.length
    };
  }

  function load(force) {
    if (cache && !force && Date.now() - lastFetch < TTL) return Promise.resolve(cache);
    if (inflight) return inflight;
    inflight = Promise.all([fetchUSGS(), fetchEMSC()]).then(function (res) {
      var usgs = res[0], emsc = res[1];
      var events = (usgs || emsc) ? merge(usgs || [], emsc || []) : [];
      cache = build(events); lastFetch = Date.now(); inflight = null;
      return cache;
    });
    return inflight;
  }

  function field(model, f) {
    var L = model.latest;
    switch (f) {
      case "latest.mag": return L && L.mag != null ? dg("M" + L.mag.toFixed(1)) : "—";
      case "latest.place": return L ? (L.place || "—") : "—";
      case "latest.ago": return L ? fmtAgo(L.time) : "—";
      case "latest.source": return L ? L.source : "";
      case "week.count": return dg(model.week.count);
      case "month.count": return dg(model.month.count);
      case "strongest7d": return model.strongest7d ? dg("M" + model.strongest7d.mag.toFixed(1)) : "—";
      case "strongest30d": return model.strongest30d ? dg("M" + model.strongest30d.mag.toFixed(1)) : "—";
      case "daysSince": return model.daysSinceFelt != null ? dg(model.daysSinceFelt) : "—";
      case "total": return model.total != null ? dg(model.total.toLocaleString()) : "—";
      case "maxMag": return model.maxMag != null ? dg("M" + model.maxMag.toFixed(1)) : "—";
      case "since": return model.since != null ? dg(model.since) : "—";
      default: return "";
    }
  }
  function bindEls(model) {
    var els = document.querySelectorAll("[data-eq]");
    for (var i = 0; i < els.length; i++) {
      var v = field(model, els[i].getAttribute("data-eq"));
      if (v !== "") els[i].textContent = v;
    }
  }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function updateBanner(model) {
    var bar = document.getElementById("alertBar"); if (!bar) return;
    var L = model.latest;
    if (L && Date.now() - L.time <= 14 * 864e5) {
      bar.className = "alert-bar"; bar.style.background = ""; bar.style.borderBottom = "";
      bar.innerHTML = '<div class="container"><span class="dot"></span>' +
        '<span><strong>' + tr("banner.latest") + '</strong> ' + dg("M" + (L.mag != null ? L.mag.toFixed(1) : "?")) +
        ' — ' + esc(L.place || "") + ' · ' + fmtAgo(L.time) + ' · ' + L.source + '</span>' +
        '<a href="map.html" style="margin-left:auto">' + tr("banner.view") + ' →</a></div>';
    } else {
      bar.className = ""; bar.style.background = "rgba(255,255,255,.03)"; bar.style.borderBottom = "1px solid var(--line)";
      bar.innerHTML = '<div class="container" style="display:flex;align-items:center;gap:.6rem;padding:.55rem 24px;color:var(--ink-soft);font-size:.86rem">' +
        '<span class="live-dot" style="width:8px;height:8px;border-radius:50%;background:#34D399;display:inline-block"></span>' +
        '<span>' + tr("banner.none") + '</span></div>';
    }
  }
  function bind(model) {
    bindEls(model); updateBanner(model);
    for (var i = 0; i < subs.length; i++) { try { subs[i](model); } catch (e) {} }
  }

  window.EQEngine = {
    load: load,
    get: function () { return cache; },
    ready: function (cb) { return load().then(cb); },
    onUpdate: function (cb) { subs.push(cb); if (cache) { try { cb(cache); } catch (e) {} } return this; },
    refresh: function () { return load(true).then(bind); }
  };

  function start() {
    load().then(bind);
    setInterval(function () { load(true).then(bind); }, TTL);
    document.addEventListener("eq:langchange", function () { if (cache) bind(cache); });
    document.addEventListener("eq:dataready", function () { if (cache) { cache = build(cache.events); bind(cache); } });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
