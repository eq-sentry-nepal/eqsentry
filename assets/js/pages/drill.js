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
        '<p style="text-align:center;color:var(--ink-soft);max-width:46ch;margin:10px auto 18px">' + T("dm.done.d") + "</p>" +
        '<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin:0 0 18px">' +
          '<input id="dcName" style="max-width:230px" placeholder="' + String(T("dm.cname.ph")).replace(/"/g, "&quot;") + '" />' +
          '<button type="button" class="btn btn-ghost" id="dcertBtn">' + T("dm.cert") + "</button></div>" : "") +
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

  /* ---------- Printable participation certificate ---------- */
  function printCert() {
    var name = (document.getElementById("dcName") || {}).value || "";
    name = String(name).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }) || "______________________";
    var count = log().length;
    var dt = new Date().toISOString().slice(0, 10);
    var bs = (window.EQ && window.EQ.bsYear) ? " · BS " + window.EQ.bsYear(Date.now()) : "";
    var box = document.getElementById("dcertBox");
    if (!box) { box = document.createElement("div"); box.id = "dcertBox"; box.className = "dcert-wrap"; document.body.appendChild(box); }
    box.innerHTML = '<div class="dcert">' +
      '<svg viewBox="0 0 40 40" width="46" height="46" aria-hidden="true"><circle cx="20" cy="20" r="18" fill="#111"/><path d="M5 21h6l3-9 5 16 4-12 2.5 5H35" stroke="#FF4D2E" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
      '<h2>CERTIFICATE OF PARTICIPATION</h2>' +
      '<div class="np">भूकम्प ड्रिल सहभागिता प्रमाणपत्र</div>' +
      '<p>This certifies that</p><p>यो प्रमाणित गरिन्छ कि</p>' +
      '<div class="nm">' + name + '</div>' +
      '<p>completed the 60-second earthquake drill — Drop, Cover, Hold On.</p>' +
      '<p>६० सेकेन्डको भूकम्प ड्रिल — घोप्टिने, ओत लिने, समाउने — पूरा गर्नुभयो।</p>' +
      '<div class="meta"><span>' + dt + bs + '</span><span>Drills completed: ' + count + '</span><span class="sig">EQ Sentry · eqsentry.com</span></div>' +
      '</div>';
    document.body.classList.add("print-cert");
    var done = function () { document.body.classList.remove("print-cert"); window.removeEventListener("afterprint", done); };
    window.addEventListener("afterprint", done);
    window.print();
    setTimeout(done, 1500);
  }
  card.addEventListener("click", function (e) {
    if (e.target && e.target.id === "dcertBtn") printCert();
  });
})();
