/* EQ Sentry — preparedness readiness quiz. Extracted from preparedness.html
   so the CSP can forbid inline scripts. Requires i18n.js (window.EQ). */
(function () {
  "use strict";
  var card = document.getElementById("quizCard");
  if (!card) return;
  var QS = ["quiz.q1", "quiz.q2", "quiz.q3", "quiz.q4", "quiz.q5", "quiz.q6"];
  var OPTS = [{ t: "quiz.opt.yes", v: 2 }, { t: "quiz.opt.partly", v: 1 }, { t: "quiz.opt.no", v: 0 }];
  var answers = QS.map(function () { return null; });
  var idx = 0, done = false;
  function T(k) { return window.EQ.t(k); }
  function dg(s) { return (window.EQ && window.EQ.dg) ? window.EQ.dg(s) : String(s); }

  function render() {
    if (done) return renderResult();
    var pct = Math.round(idx / QS.length * 100), sel = answers[idx];
    var opts = OPTS.map(function (o, i) {
      return '<div class="quiz-opt' + (sel === i ? " selected" : "") + '" data-i="' + i + '"><span class="dot"></span><span>' + T(o.t) + "</span></div>";
    }).join("");
    card.innerHTML =
      '<div class="quiz-progress"><i style="width:' + pct + '%"></i></div>' +
      '<div class="quiz-step">' + T("quiz.step") + " " + dg(idx + 1) + " " + T("quiz.of") + " " + dg(QS.length) + "</div>" +
      '<div class="quiz-q">' + T(QS[idx]) + "</div>" +
      '<div class="quiz-opts">' + opts + "</div>" +
      '<div class="quiz-nav">' +
        '<button class="btn btn-outline" id="qBack"' + (idx === 0 ? ' style="visibility:hidden"' : "") + ">" + T("quiz.back") + "</button>" +
        '<button class="btn btn-primary" id="qNext"' + (sel === null ? ' style="opacity:.45;pointer-events:none"' : "") + ">" + (idx === QS.length - 1 ? T("quiz.see") : T("quiz.next")) + "</button>" +
      "</div>";
    card.querySelectorAll(".quiz-opt").forEach(function (el) {
      el.addEventListener("click", function () { answers[idx] = +el.getAttribute("data-i"); render(); });
    });
    var nx = document.getElementById("qNext");
    if (nx) nx.addEventListener("click", function () {
      if (answers[idx] === null) return;
      if (idx < QS.length - 1) { idx++; render(); } else { done = true; render(); }
    });
    var bk = document.getElementById("qBack");
    if (bk) bk.addEventListener("click", function () { if (idx > 0) { idx--; render(); } });
  }
  function renderResult() {
    var score = answers.reduce(function (a, i) { return a + (i != null ? OPTS[i].v : 0); }, 0);
    var max = QS.length * 2;
    var pct = Math.round(score / max * 100);
    var tier = pct >= 75 ? "high" : pct >= 45 ? "mid" : "low";
    var col = tier === "high" ? "#34D399" : tier === "mid" ? "#FBBF24" : "#EF4444";
    card.innerHTML =
      '<div class="quiz-result">' +
      '<div class="score-ring" style="border-radius:50%;background:conic-gradient(' + col + ' ' + pct + '%, var(--line) 0)"><div style="position:absolute;inset:11px;border-radius:50%;background:var(--surface)"></div><div class="num">' + dg(pct) + '%</div></div>' +
      '<div class="score-tier" style="color:' + col + '">' + T("quiz.tier." + tier) + '</div>' +
      '<div style="color:var(--ink-faint);font-size:.84rem;margin-top:4px">' + T("quiz.result") + '</div>' +
      '<ul class="score-tips">' + T("quiz.tips." + tier) + '</ul>' +
      '<div class="quiz-nav" style="justify-content:center;gap:.8rem"><button class="btn btn-outline" id="qRetake">' + T("quiz.retake") + '</button><a class="btn btn-primary" href="#kit">' + T("quiz.cta") + '</a></div>' +
      '</div>';
    var rt = document.getElementById("qRetake");
    if (rt) rt.addEventListener("click", function () { answers = QS.map(function () { return null; }); idx = 0; done = false; render(); });
  }
  render();
  document.addEventListener("eq:langchange", render);
})();
