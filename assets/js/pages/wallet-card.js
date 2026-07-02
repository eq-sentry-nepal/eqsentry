/* ==========================================================================
   EQ Sentry — printable wallet emergency card (plan.html).
   Builds a bank-card-size card from the locally saved family plan (blood
   group, ICE contacts, out-of-area contact, meeting point, national numbers)
   and prints ONLY the card via the body.print-card CSS in style.css.
   ========================================================================== */
(function () {
  "use strict";
  var btn = document.getElementById("cardPrint"), box = document.getElementById("walletCard");
  if (!btn || !box) return;
  function T(k) { return window.EQ ? window.EQ.t(k) : k; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  function plan() {
    try { return JSON.parse(localStorage.getItem("eqsentry_plan")) || {}; } catch (e) { return {}; }
  }

  function build() {
    var p = plan();
    var ice = (p.ice || []).filter(function (r) { return (r.who || r.phone); }).slice(0, 2);
    var rows = "";
    if (p.blood) rows += line(T("pp.card.blood"), esc(p.blood));
    ice.forEach(function (r) { rows += line(T("pp.card.ice"), esc(r.who) + (r.phone ? " · " + esc(r.phone) : "")); });
    if (p.oacName || p.oacPhone) rows += line(T("pp.card.oac"), esc(p.oacName) + (p.oacPhone ? " · " + esc(p.oacPhone) : ""));
    if (p.meet1) rows += line(T("pp.card.meet"), esc(p.meet1));
    box.innerHTML =
      '<div class="wcard">' +
        '<div class="wcard-head"><b>' + T("pp.card.t") + "</b><span>EQ Sentry · eqsentry.com</span></div>" +
        rows +
        '<div class="wcard-num">' + T("pp.card.num") + "</div>" +
      "</div>" +
      '<p class="wcard-hint">' + T("pp.card.hint") + "</p>";
  }
  function line(k, v) {
    return '<div class="wcard-row"><span>' + k + "</span><b>" + v + "</b></div>";
  }

  btn.addEventListener("click", function () {
    build();
    document.body.classList.add("print-card");
    var done = function () { document.body.classList.remove("print-card"); window.removeEventListener("afterprint", done); };
    window.addEventListener("afterprint", done);
    window.print();
    setTimeout(done, 1500);
  });
})();
