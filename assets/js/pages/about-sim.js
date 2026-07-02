/* EQ Sentry — about page "simulate earthquake" cross-section animation.
   Extracted from about.html so the CSP can forbid inline scripts. */
(function () {
  "use strict";
  var btn = document.getElementById("xsBtn");
  if (!btn) return;
  var glow = document.getElementById("xsGlow"), peaks = document.getElementById("xsPeaks");
  var waves = [0, 1, 2].map(function (i) { return document.getElementById("xsWave" + i); });
  function set(el, a, v) { if (el) el.setAttribute(a, v); }
  function simulate() {
    btn.disabled = true; btn.style.opacity = .6;
    var t0 = performance.now();
    (function charge(t) {
      var p = Math.min(1, (t - t0) / 1100);
      set(glow, "r", 6 + p * 14); set(glow, "opacity", (0.25 + p * 0.65).toFixed(2));
      if (p < 1) requestAnimationFrame(charge); else rupture();
    })(t0);
  }
  function rupture() {
    set(glow, "r", 30); set(glow, "opacity", 1);
    if (peaks) { peaks.classList.add("xshaking"); setTimeout(function () { peaks.classList.remove("xshaking"); }, 1000); }
    var s = performance.now();
    (function anim(t) {
      var p = (t - s) / 1700;
      set(glow, "opacity", Math.max(0, 1 - p * 2).toFixed(2));
      waves.forEach(function (w, i) {
        var pp = p - i * 0.16;
        if (pp < 0 || pp > 1) { set(w, "opacity", 0); return; }
        set(w, "r", (10 + pp * 260).toFixed(0)); set(w, "opacity", ((1 - pp) * 0.8).toFixed(2));
      });
      if (p < 1.3) requestAnimationFrame(anim);
      else { waves.forEach(function (w) { set(w, "opacity", 0); }); set(glow, "opacity", 0); btn.disabled = false; btn.style.opacity = 1; }
    })(s);
  }
  btn.addEventListener("click", simulate);
})();
