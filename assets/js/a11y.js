/* ==========================================================================
   EQ Sentry — accessibility panel.
   Consolidated, self-serve controls: text size (A-/A+), reduce motion,
   high contrast, and a dyslexia-friendly font. Preferences persist in
   localStorage and are applied early by i18n.js (to avoid a flash of the
   default style); this script builds the panel UI, wires the controls, and
   exposes window.EQ_A11Y.motionOff() plus an "eq:motionchange" event so
   canvas/JS animations (e.g. the seismograph) can pause when motion is reduced.
   Bilingual: labels come from the i18n dictionary and refresh on language change.
   ========================================================================== */
(function () {
  "use strict";
  var root = document.documentElement;
  var KEY = { size: "eqsentry_textsize", motion: "eqsentry_motion", hc: "eqsentry_contrast", dys: "eqsentry_dys" };
  var SIZES = ["fs-sm", "", "fs-lg", "fs-xl", "fs-xxl"];   // index 0..4 (1 = normal)
  var PCT = [90, 100, 112, 125, 138];

  function ls(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function save(k, v) { try { localStorage.setItem(k, String(v)); } catch (e) {} }
  function T(k, f) { return (window.EQ && window.EQ.t) ? window.EQ.t(k) : (f || k); }
  function mqReduced() { return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches); }

  function sizeIdx() { var i = parseInt(ls(KEY.size) || "1", 10); return (i >= 0 && i < SIZES.length) ? i : 1; }
  function motionOn() { var s = ls(KEY.motion); return s === null ? mqReduced() : s === "1"; }
  function hcOn() { return ls(KEY.hc) === "1"; }
  function dysOn() { return ls(KEY.dys) === "1"; }

  window.EQ_A11Y = window.EQ_A11Y || {};
  window.EQ_A11Y.motionOff = function () { return motionOn(); };
  window.EQ_A11Y.reduceMotion = motionOn();

  function applySize(i) {
    for (var k = 0; k < SIZES.length; k++) if (SIZES[k]) root.classList.remove(SIZES[k]);
    if (SIZES[i]) root.classList.add(SIZES[i]);
    save(KEY.size, i);
  }
  function applyMotion(on) {
    root.classList.toggle("reduce-motion", on); save(KEY.motion, on ? 1 : 0);
    window.EQ_A11Y.reduceMotion = on;
    document.dispatchEvent(new CustomEvent("eq:motionchange", { detail: { reduced: on } }));
  }
  function applyHc(on) { root.classList.toggle("hc", on); save(KEY.hc, on ? 1 : 0); }
  function applyDys(on) { root.classList.toggle("dys", on); save(KEY.dys, on ? 1 : 0); }

  var panel, backdrop, trigger, els = {};

  function build() {
    backdrop = document.createElement("div");
    backdrop.className = "a11y-backdrop";

    panel = document.createElement("div");
    panel.className = "a11y-panel"; panel.id = "a11yPanel";
    panel.setAttribute("role", "dialog"); panel.setAttribute("aria-label", T("a11y.title", "Accessibility"));
    panel.innerHTML =
      '<button class="a11y-close" type="button" aria-label="Close">×</button>' +
      '<h2><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="4" r="1.7"/><path d="M4 8h16M12 8v6m0 0-3.2 6m3.2-6 3.2 6"/></svg><span data-l="title"></span></h2>' +
      '<div class="a11y-row"><span class="a11y-label"><span data-l="size"></span><small data-l="sizeHint"></small></span>' +
        '<span class="a11y-size"><button type="button" class="a11y-dec" aria-label="Decrease text size">A−</button><span class="pct" id="a11yPct">100%</span><button type="button" class="a11y-inc" aria-label="Increase text size">A+</button></span></div>' +
      '<div class="a11y-row"><span class="a11y-label"><span data-l="motion"></span><small data-l="motionHint"></small></span>' +
        '<button type="button" class="a11y-switch" id="a11yMotion" aria-pressed="false"><span class="sr-only" data-l="motion"></span></button></div>' +
      '<div class="a11y-row"><span class="a11y-label"><span data-l="hc"></span><small data-l="hcHint"></small></span>' +
        '<button type="button" class="a11y-switch" id="a11yHc" aria-pressed="false"><span class="sr-only" data-l="hc"></span></button></div>' +
      '<div class="a11y-row"><span class="a11y-label"><span data-l="dys"></span><small data-l="dysHint"></small></span>' +
        '<button type="button" class="a11y-switch" id="a11yDys" aria-pressed="false"><span class="sr-only" data-l="dys"></span></button></div>' +
      '<div class="a11y-actions"><button type="button" class="a11y-reset" data-l="reset"></button></div>';

    document.body.appendChild(backdrop);
    document.body.appendChild(panel);

    els.pct = panel.querySelector("#a11yPct");
    els.motion = panel.querySelector("#a11yMotion");
    els.hc = panel.querySelector("#a11yHc");
    els.dys = panel.querySelector("#a11yDys");

    panel.querySelector(".a11y-dec").addEventListener("click", function () { applySize(Math.max(0, sizeIdx() - 1)); refresh(); });
    panel.querySelector(".a11y-inc").addEventListener("click", function () { applySize(Math.min(SIZES.length - 1, sizeIdx() + 1)); refresh(); });
    els.motion.addEventListener("click", function () { applyMotion(!motionOn()); refresh(); });
    els.hc.addEventListener("click", function () { applyHc(!hcOn()); refresh(); });
    els.dys.addEventListener("click", function () { applyDys(!dysOn()); refresh(); });
    panel.querySelector(".a11y-reset").addEventListener("click", function () {
      applySize(1); applyMotion(false); applyHc(false); applyDys(false); refresh();
    });
    panel.querySelector(".a11y-close").addEventListener("click", close);
    backdrop.addEventListener("click", close);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && panel.classList.contains("open")) close(); });
    document.addEventListener("eq:langchange", relabel);
  }

  function relabel() {
    var L = {
      title: T("a11y.title", "Accessibility"),
      size: T("a11y.size", "Text size"), sizeHint: T("a11y.sizeHint", "Make text larger or smaller"),
      motion: T("a11y.motion", "Reduce motion"), motionHint: T("a11y.motionHint", "Pause animations"),
      hc: T("a11y.hc", "High contrast"), hcHint: T("a11y.hcHint", "Stronger colours"),
      dys: T("a11y.dys", "Readable font"), dysHint: T("a11y.dysHint", "Dyslexia-friendly typeface"),
      reset: T("a11y.reset", "Reset all")
    };
    panel.querySelectorAll("[data-l]").forEach(function (el) { var k = el.getAttribute("data-l"); if (L[k] != null) el.textContent = L[k]; });
    if (trigger) trigger.setAttribute("aria-label", T("a11y.open", "Accessibility options"));
  }

  function refresh() {
    els.pct.textContent = PCT[sizeIdx()] + "%";
    els.motion.setAttribute("aria-pressed", motionOn() ? "true" : "false");
    els.hc.setAttribute("aria-pressed", hcOn() ? "true" : "false");
    els.dys.setAttribute("aria-pressed", dysOn() ? "true" : "false");
  }

  function open() {
    panel.classList.add("open"); backdrop.classList.add("open");
    if (trigger) trigger.setAttribute("aria-expanded", "true");
    refresh(); relabel();
    var f = panel.querySelector(".a11y-close"); if (f) f.focus();
  }
  function close() {
    panel.classList.remove("open"); backdrop.classList.remove("open");
    if (trigger) { trigger.setAttribute("aria-expanded", "false"); trigger.focus(); }
  }
  function toggle() { panel.classList.contains("open") ? close() : open(); }

  function init() {
    build(); relabel(); refresh();
    trigger = document.getElementById("a11yToggle");
    if (!trigger) {
      trigger = document.createElement("button");
      trigger.id = "a11yToggle"; trigger.type = "button"; trigger.className = "a11y-fab";
      trigger.setAttribute("aria-haspopup", "true"); trigger.setAttribute("aria-expanded", "false");
      trigger.setAttribute("aria-label", T("a11y.open", "Accessibility options"));
      trigger.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="4" r="1.7"/><path d="M4 8h16M12 8v6m0 0-3.2 6m3.2-6 3.2 6"/></svg>';
      document.body.appendChild(trigger);
    }
    trigger.addEventListener("click", toggle);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
