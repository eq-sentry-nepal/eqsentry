/* ==========================================================================
   EQ Sentry — personalized household plan generator (preparedness.html).
   Reads the small form (household size, home type, members, district), then
   renders a tailored, printable plan into #pgResult using the pg.* i18n keys
   already defined on the page. Selections persist locally (nothing uploaded)
   and the plan re-renders on language change. Requires i18n.js (window.EQ).
   ========================================================================== */
(function () {
  "use strict";
  function ready(fn) { document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", fn) : fn(); }
  ready(init);

  function T(k) { return window.EQ ? window.EQ.t(k) : k; }
  function dg(s) { return (window.EQ && window.EQ.dg) ? window.EQ.dg(s) : String(s); }

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function $(id) { return document.getElementById(id); }

  var KEY = "eqsentry_pg";
  var MEMBERS = [["pgChildren", "children"], ["pgElderly", "elderly"], ["pgDisability", "disability"], ["pgPets", "pets"]];
  var generated = false;

  function readForm() {
    var n = parseInt($("pgSize").value, 10);
    if (isNaN(n) || n < 1) n = 1; if (n > 20) n = 20;
    var members = [];
    MEMBERS.forEach(function (m) { if ($(m[0]) && $(m[0]).checked) members.push(m[1]); });
    return { n: n, home: $("pgHome").value || "rcc", members: members, district: $("pgDistrict").value.trim() };
  }
  function saveForm(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }
  function restoreForm() {
    var s = null;
    try { s = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
    if (!s || typeof s !== "object") return;
    if (s.n) $("pgSize").value = s.n;
    if (s.home) $("pgHome").value = s.home;
    MEMBERS.forEach(function (m) { if ($(m[0])) $(m[0]).checked = (s.members || []).indexOf(m[1]) >= 0; });
    if (s.district) $("pgDistrict").value = s.district;
  }

  function render() {
    var box = $("pgResult"); if (!box) return;
    var s = readForm();
    saveForm(s);

    var litres = s.n * 4 * 3;                          // 4 L / person / day × 3 days
    var cans = Math.max(1, Math.ceil(litres / 20));    // 20-litre jerry cans

    var html = '<div class="card pg-plan" style="padding:26px">' +
      '<h3 style="margin:0 0 4px">' + T("pg.r.title") + (s.district ? ' — ' + esc(s.district) : '') + '</h3>';

    // Water + food targets
    html += '<div class="stat-row" style="margin:16px 0 18px">' +
      '<div class="stat"><div class="num accent">' + dg(litres) + '</div><div class="lbl">' + T("pg.r.water") + ' · ' +
        T("pg.r.waterv").replace("{cans}", dg(cans)) + '</div></div>' +
      '<div class="stat"><div class="num">' + dg(s.n) + '</div><div class="lbl">' + T("pg.r.food") + ' · ' +
        T("pg.r.foodv").replace("{n}", dg(s.n)) + '</div></div></div>';

    // Home-type advice
    html += '<h4 style="margin:0 0 6px">' + T("pg.r.home") + '</h4>' +
      '<p style="color:var(--ink-soft);margin:0 0 16px">' + T("pg.home.adv." + s.home) + '</p>';

    // Member-specific advice
    if (s.members.length) {
      html += '<h4 style="margin:0 0 6px">' + T("pg.r.members") + '</h4>' +
        '<ul class="checklist" style="margin:0 0 16px;padding-left:1.05em">' +
        s.members.map(function (m) { return '<li>' + T("pg.m.adv." + m) + '</li>'; }).join("") + '</ul>';
    }

    // First actions
    html += '<h4 style="margin:0 0 6px">' + T("pg.r.actions") + '</h4>' +
      '<ol style="color:var(--ink-soft);margin:0 0 18px;padding-left:1.2em;line-height:1.7">' +
      [1, 2, 3, 4, 5].map(function (i) { return '<li>' + T("pg.actions." + i) + '</li>'; }).join("") + '</ol>';

    // District risk link (when a district was given) + print
    html += '<div class="flex wrap" style="gap:10px">' +
      '<button type="button" class="btn btn-outline" id="pgPrint">' + T("pg.print") + '</button>' +
      (s.district ? '<a class="btn btn-ghost" href="district.html">' + T("nav.district") + ' →</a>' : '') +
      '</div></div>';

    box.innerHTML = html;
    box.style.display = "block";
    generated = true;

    var pr = $("pgPrint");
    if (pr) pr.addEventListener("click", function () {
      document.body.classList.add("print-pg");           // print only the plan (see style.css)
      var done = function () { document.body.classList.remove("print-pg"); window.removeEventListener("afterprint", done); };
      window.addEventListener("afterprint", done);
      window.print();
      setTimeout(done, 1500);                            // safety for browsers without afterprint
    });

    if (box.scrollIntoView && !document.documentElement.classList.contains("reduce-motion")) {
      box.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  function init() {
    var btn = $("pgGen");
    if (!btn || !$("pgResult")) return;
    restoreForm();
    btn.addEventListener("click", render);
    document.addEventListener("eq:langchange", function () { if (generated) render(); });
  }
})();
