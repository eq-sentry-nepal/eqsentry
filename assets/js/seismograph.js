/* ==========================================================================
   EQ Sentry — drum-style seismograph (canvas).
   A recording pen on the LEFT traces ground motion; the paper scrolls slowly to
   the right at a real helicorder-like creep (~14 px/s, ~1 min across the drum).
   Events are driven by REAL Nepal earthquakes (window.EQ_DATA), played back in
   chronological order. Each event's amplitude scales to its actual magnitude and
   the waveform is physically shaped: a small, fast P-wave onset, the S–P gap,
   then a strong S-wave and an exponentially decaying coda (bigger quakes shake
   longer). Notable events are labelled (e.g. M7.8 · 2015). Respects reduced-motion.
   ========================================================================== */
(function () {
  "use strict";
  var SPS = 14;                       // samples (px columns) per second — the drum speed
  function ready(fn) { document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", fn) : fn(); }
  ready(init);

  // faint background microseism (always present on a real instrument)
  function ambient(t) {
    return 0.050 * Math.sin(t * 0.060) + 0.030 * Math.sin(t * 0.150 + 1) +
           0.020 * Math.sin(t * 0.310 + 2) + (Math.random() - 0.5) * 0.018;
  }
  // amplitude faithful to magnitude — small quakes modest, great ones near/over full-scale (pen clips, like a real drum)
  function magToAmp(m) { return Math.max(0.10, Math.min(1.18, (m - 3.4) / 4.2)); }
  // coda decay scale + total visible duration (seconds) grow with magnitude
  function codaScale(m) { return 1.4 + m * 1.3; }
  function eventDur(m) { return (1.1 + m * 0.55) + 3.2 * codaScale(m); }
  // ground motion at te seconds after the P onset
  function eventVal(te, amp, m) {
    var tS = 1.1 + m * 0.55;          // S–P time (s) — grows with size/distance
    var coda = codaScale(m), v = 0;
    if (te >= 0 && te < tS + 0.8) {   // P-wave: brief, weaker, higher frequency
      var pe = 0.20 * amp * Math.exp(-Math.pow((te - 0.5) / 0.7, 2));
      v += pe * Math.sin(2 * Math.PI * 2.7 * te);
    }
    if (te >= tS) {                   // S-wave + coda: strong, lower frequency, exponential decay
      var s = te - tS;
      var se = amp * (1 - Math.exp(-s / 0.35)) * Math.exp(-s / coda);
      v += se * (Math.sin(2 * Math.PI * 1.2 * s) + 0.32 * Math.sin(2 * Math.PI * 3.0 * s + 0.6));
    }
    return v + (Math.random() - 0.5) * 0.010;
  }

  function buildQueue() {
    var q = [];
    if (window.EQ_DATA) {
      if (window.EQ_DATA.catalog) window.EQ_DATA.catalog.features.forEach(function (f) {
        var p = f.properties; if (p.mag >= 4.8) q.push({ mag: p.mag, year: new Date(p.time).getUTCFullYear(), place: p.place, t: p.time });
      });
      if (window.EQ_DATA.notable) window.EQ_DATA.notable.features.forEach(function (f) {
        var p = f.properties; q.push({ mag: p.mag, year: p.year, place: p.name_en, t: Date.parse(p.date) });
      });
    }
    if (q.length) q.sort(function (a, b) { return (a.t || 0) - (b.t || 0); });   // chronological playback
    else q = [{ mag: 5.2, year: 2020 }, { mag: 4.6 }, { mag: 6.1, year: 2011 }, { mag: 7.8, year: 2015, place: "Gorkha" }, { mag: 4.9 }, { mag: 5.5, year: 2023 }];
    return q;
  }

  function init() {
    var c = document.getElementById("seismoCanvas");
    if (!c) return;
    if (window.EQData && window.EQData.ready) window.EQData.ready(function () { go(c); });
    else go(c);
  }
  function go(c) {
    var ctx = c.getContext("2d");
    var dpr = Math.min(window.devicePixelRatio || 1, 2), W = 0, H = 0;
    function resize() { W = c.clientWidth || 1000; H = c.clientHeight || 150; c.width = W * dpr; c.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
    resize(); window.addEventListener("resize", resize);

    var queue = buildQueue(), qi = 0;
    var data = [], t = 0, evt = null, nextEvent = Math.round(2.5 * SPS), active = [];
    function clamp(v) { return v < -1.22 ? -1.22 : v > 1.22 ? 1.22 : v; }
    function trigger() {
      var e = queue[qi % queue.length]; qi++;
      evt = { start: t, amp: magToAmp(e.mag), mag: e.mag, dur: eventDur(e.mag) };
      active.push({ start: t, mag: e.mag, year: e.year, place: e.place });
      nextEvent = t + Math.round((evt.dur + 3 + Math.random() * 7) * SPS);   // quiet gap after the event ends
    }
    function nextSample() {
      t++;
      if (!evt && t >= nextEvent) trigger();
      var v = ambient(t);
      if (evt) { var te = (t - evt.start) / SPS; v += eventVal(te, evt.amp, evt.mag); if (te > evt.dur) evt = null; }
      return v;
    }

    function draw() {
      var mid = H / 2, amp = H * 0.34, penX = 5;
      ctx.clearRect(0, 0, W, H);
      ctx.strokeStyle = "rgba(255,255,255,0.05)"; ctx.lineWidth = 1;
      for (var gy = mid % (H / 4); gy <= H; gy += H / 4) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke(); }
      ctx.strokeStyle = "rgba(255,255,255,0.07)"; ctx.beginPath(); ctx.moveTo(0, mid); ctx.lineTo(W, mid); ctx.stroke();
      // trace — data[0] newest (at pen, left) → older to the right
      ctx.beginPath();
      for (var x = 0; x < data.length; x++) { var y = mid - clamp(data[x]) * amp; if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
      ctx.strokeStyle = "#FF4D2E"; ctx.lineWidth = 1.6; ctx.lineJoin = "round"; ctx.lineCap = "round";
      ctx.shadowColor = "rgba(255,77,46,0.5)"; ctx.shadowBlur = 6; ctx.stroke(); ctx.shadowBlur = 0;
      // labels for notable events as they scroll right
      active = active.filter(function (ev) { return (t - ev.start) <= W + 40; });
      ctx.font = "600 11px 'JetBrains Mono', monospace"; ctx.textAlign = "left";
      var laneY = H - 6;                                   // label lane along the BOTTOM (visible below the hero text)
      active.forEach(function (ev) {
        if (ev.mag < 5.3) return;
        var x = t - ev.start; if (x < 26 || x > W - 8) return;
        var a = Math.min(1, (W - x) / 130) * Math.min(1, (x - 26) / 50);
        ctx.globalAlpha = a; ctx.strokeStyle = "rgba(255,138,61,0.30)";
        ctx.beginPath(); ctx.moveTo(x, mid); ctx.lineTo(x, laneY - 11); ctx.stroke();
        ctx.fillStyle = "#FF8A3D"; ctx.fillText("M" + ev.mag.toFixed(1) + (ev.year ? " · " + ev.year : ""), x + 4, laneY);
        ctx.globalAlpha = 1;
      });
      // recording pen on the LEFT
      var penY = mid - clamp(data[0] || 0) * amp;
      ctx.strokeStyle = "rgba(255,255,255,0.06)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(penX, 0); ctx.lineTo(penX, H); ctx.stroke();
      ctx.strokeStyle = "#FF4D2E"; ctx.lineWidth = 4.5; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(penX, penY); ctx.lineTo(penX + 26, penY - 38); ctx.stroke();         // pen shaft
      ctx.fillStyle = "#171c27"; ctx.strokeStyle = "#FF8A3D"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(penX + 26, penY - 38, 4.5, 0, 7); ctx.fill(); ctx.stroke();              // pen cap
      ctx.fillStyle = "#FF4D2E"; ctx.shadowColor = "rgba(255,77,46,0.85)"; ctx.shadowBlur = 9;
      ctx.beginPath(); ctx.arc(penX, penY, 4, 0, 7); ctx.fill(); ctx.shadowBlur = 0;                    // pen nib
    }

    function reduced() {
      return document.documentElement.classList.contains("reduce-motion") ||
        (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    }
    function staticFrame() {   // a single representative trace, no scrolling
      data = []; var m0 = 7.4, amp0 = magToAmp(m0), te0 = eventDur(m0);
      for (var i = 0; i < W; i++) { var te = te0 - i / SPS; var v = ambient(i); if (te >= 0) v += eventVal(te, amp0, m0); data.push(v); }
      draw();
    }

    // time-based scrolling so the drum speed is constant regardless of frame rate
    var running = false, lastTs = 0, acc = 0;
    function frame(now) {
      if (!running) return;
      if (!lastTs) lastTs = now;
      acc += (now - lastTs) / 1000 * SPS; lastTs = now;
      var n = Math.floor(acc); acc -= n; if (n > 6) n = 6;       // cap catch-up after the tab was hidden
      for (var s = 0; s < n; s++) { data.unshift(nextSample()); if (data.length > W) data.pop(); }
      draw();
      requestAnimationFrame(frame);
    }
    function applyMotion() {                       // honor reduce-motion (OS pref + accessibility panel)
      if (reduced()) { running = false; staticFrame(); }
      else if (!running) { running = true; lastTs = 0; requestAnimationFrame(frame); }
    }
    applyMotion();
    document.addEventListener("eq:motionchange", applyMotion);
  }
})();
