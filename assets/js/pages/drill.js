/* ==========================================================================
   EQ Sentry — guided 60-second Drop-Cover-Hold drill (preparedness.html).
   Sequence: ready(3s) → DROP(5s) → COVER(5s) → HOLD ON(47s) → done.
   Completed drills are logged locally; a badge reminds every 6 months.
   Respects reduced motion (no shake animation; timers still run).
   ========================================================================== */
(function () {
  "use strict";
  var card = document.getElementById("drillCard");
  if (!card) return;
  function T(k) { return window.EQ ? window.EQ.t(k) : k; }
  function dg(s) { return (window.EQ && window.EQ.dg) ? window.EQ.dg(s) : String(s); }

  var KEY = "eqsentry_drills";
  var STEPS = [
    { key: "dm.ready", dur: 3, cls: "" },
    { key: "dm.drop", dur: 5, cls: "drop", desc: "dm.drop.d" },
    { key: "dm.cover", dur: 5, cls: "cover", desc: "dm.cover.d" },
    { key: "dm.hold", dur: 47, cls: "hold", desc: "dm.hold.d" }
  ];
  var timer = null, si = 0, left = 0;

  function log() { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch (e) { return []; } }
  function saveLog(l) { try { localStorage.setItem(KEY, JSON.stringify(l.slice(-40))); } catch (e) {} }
  function motionOff() {
    return document.documentElement.classList.contains("reduce-motion") ||
      (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }
  function fmtDate(iso) {
    try { return new Intl.DateTimeFormat(window.EQ.getLang() === "ne" ? "ne-NP" : "en-GB", { dateStyle: "medium" }).format(new Date(iso)); }
    catch (e) { return iso.slice(0, 10); }
  }

  function renderIdle(justDone) {
    clearInterval(timer); timer = null;
    card.classList.remove("drill-shake");
    var l = log(), last = l[l.length - 1];
    var due = !last || (Date.now() - new Date(last).getTime()) > 180 * 864e5;
    card.innerHTML =
      (justDone ? '<div class="quiz-q" style="color:#34D399;text-align:center">' + T("dm.done") + '</div>' +
        '<p style="text-align:center;color:var(--ink-soft);max-width:46ch;margin:10px auto 18px">' + T("dm.done.d") + "</p>" : "") +
      '<div style="text-align:center">' +
      '<p class="muted" style="margin:0 0 6px">' +
        (last ? T("dm.last") + " <b>" + fmtDate(last) + "</b> · " + dg(l.length) + " " + T("dm.count") : T("dm.never")) + "</p>" +
      (due && !justDone ? '<p style="color:#FBBF24;font-weight:600;margin:0 0 14px">' + T("dm.due") + "</p>" : "") +
      '<button class="btn btn-primary" id="drillStart" style="margin-top:10px">' + T(justDone || last ? "dm.again" : "dm.start") + "</button></div>";
    var b = document.getElementById("drillStart");
    if (b) b.addEventListener("click", start);
  }

  function start() {
    si = 0;
    runStep();
  }
  function runStep() {
    var st = STEPS[si];
    left = st.dur;
    card.classList.toggle("drill-shake", st.cls === "hold" && !motionOff());
    paint(st);
    clearInterval(timer);
    timer = setInterval(function () {
      left--;
      if (left <= 0) {
        si++;
        if (si >= STEPS.length) { finish(); return; }
        runStep(); return;
      }
      var n = document.getElementById("drillNum"); if (n) n.textContent = dg(left);
      var bar = document.getElementById("drillBar"); if (bar) bar.style.width = ((st.dur - left) / st.dur * 100) + "%";
    }, 1000);
  }
  function paint(st) {
    var total = STEPS.reduce(function (a, s) { return a + s.dur; }, 0);
    var doneBefore = STEPS.slice(0, si).reduce(function (a, s) { return a + s.dur; }, 0);
    card.innerHTML =
      '<div class="quiz-progress"><i style="width:' + Math.round(doneBefore / total * 100) + '%"></i></div>' +
      '<div style="text-align:center;padding:14px 0 4px">' +
      '<div class="drill-step">' + T(st.key) + '</div>' +
      '<div class="drill-num" id="drillNum">' + dg(left) + "</div>" +
      (st.desc ? '<p style="color:var(--ink-soft);max-width:44ch;margin:8px auto 0">' + T(st.desc) + "</p>" : "") +
      '<div class="drill-barwrap"><i id="drillBar"></i></div></div>';
  }
  function finish() {
    clearInterval(timer); timer = null;
    var l = log(); l.push(new Date().toISOString()); saveLog(l);
    renderIdle(true);
  }

  renderIdle(false);
  document.addEventListener("eq:langchange", function () { if (!timer) renderIdle(false); });
})();
