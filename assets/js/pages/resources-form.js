/* EQ Sentry — resources page situation-report form. Extracted from
   resources.html so the CSP can forbid inline scripts. */
(function () {
  "use strict";
  var f = document.getElementById("reportForm");
  if (!f) return;
  f.addEventListener("submit", function (e) {
    e.preventDefault();
    var rec = {
      name: document.getElementById("r-name").value.trim(),
      district: document.getElementById("r-district").value.trim(),
      severity: document.getElementById("r-sev").value,
      message: document.getElementById("r-msg").value.trim(),
      at: new Date().toISOString()
    };
    var ok = document.getElementById("repSuccess");
    function store() { try { var l = JSON.parse(localStorage.getItem("eqsentry_reports") || "[]"); l.push(rec); localStorage.setItem("eqsentry_reports", JSON.stringify(l)); } catch (e2) {} }
    function done() { ok.classList.add("show"); f.reset(); ok.scrollIntoView({ behavior: "smooth", block: "center" }); }
    if (window.EQ_API) {
      fetch(String(window.EQ_API).replace(/\/+$/, "") + "/api/report", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(rec)
      }).then(function () { done(); }).catch(function () { store(); done(); });
    } else { store(); done(); }
  });
})();
