/* EQ Sentry — alert registration form. Extracted from alerts.html so the CSP
   can forbid inline scripts. Honest outcomes: with a backend (window.EQ_API)
   the user gets the double-opt-in "check your phone/email" message; without
   one, we say clearly that the sign-up is saved on this device only.
   Requires i18n.js (window.EQ) and config.js. */
(function () {
  "use strict";
  var form = document.getElementById("alertForm");
  if (!form) return;
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var T = window.EQ.t;
    var name = form.name.value.trim();
    var mobile = form.mobile.value.trim();
    var email = form.email.value.trim();
    var district = form.district.value.trim();
    var err = "";
    if (!name) err = T("al.err.name");
    else if (!mobile && !email) err = T("al.err.contact");
    else if (!district) err = T("al.err.district");
    else if (!form.consent.checked) err = T("al.err.consent");

    var errBox = document.getElementById("formError");
    var okBox = document.getElementById("formSuccess");
    if (err) {
      document.getElementById("formErrorMsg").textContent = err;
      errBox.style.display = "flex";
      okBox.classList.remove("show");
      return;
    }
    errBox.style.display = "none";
    var entry = {
      name: name, mobile: mobile, email: email, district: district,
      lang: form.lang.value, threshold: form.threshold.value, consent: true, at: new Date().toISOString()
    };
    function storeLocal() {
      try {
        var list = JSON.parse(localStorage.getItem("eqsentry_alert_signups") || "[]");
        list.push(entry);
        localStorage.setItem("eqsentry_alert_signups", JSON.stringify(list));
      } catch (e2) {}
    }
    function finish(key) {
      okBox.textContent = window.EQ.t(key);
      okBox.classList.add("show");
      form.reset();
      okBox.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    if (window.EQ_API) {
      fetch(String(window.EQ_API).replace(/\/+$/, "") + "/api/subscribe", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(entry)
      }).then(function (r) { if (!r.ok) throw new Error("api"); return r.json(); })
        .then(function () { finish("al.pending"); })
        .catch(function () { storeLocal(); finish("al.localonly"); });
    } else { storeLocal(); finish("al.localonly"); }
  });
})();
