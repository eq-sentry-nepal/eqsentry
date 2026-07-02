/* ==========================================================================
   EQ Sentry — "my district" personalization.
   Remembers the user's home district (chosen on district.html) and pre-fills
   it wherever a district is asked for: the district-risk selector, the
   "Did you feel it?" report form and the alerts form. Stored locally only.
   API: EQMyDistrict.get() / .set(index, name) / .clear() / .applyToSelect()
   ========================================================================== */
(function () {
  "use strict";
  var KEY = "eqsentry_mydistrict";
  function T(k) { return window.EQ ? window.EQ.t(k) : k; }

  function get() {
    try { var v = JSON.parse(localStorage.getItem(KEY)); return v && v.en ? v : null; }
    catch (e) { return null; }
  }
  function set(i, en) { try { localStorage.setItem(KEY, JSON.stringify({ i: i, en: en })); } catch (e) {} }
  function clear() { try { localStorage.removeItem(KEY); } catch (e) {} }

  window.EQMyDistrict = {
    get: get, set: set, clear: clear,
    /* district.html: select the saved district once options exist (called by district.js after populate) */
    applyToSelect: function () {
      var sel = document.getElementById("distSelect"), saved = get();
      if (!sel || !saved) { syncBtn(); return; }
      if (sel.value === "" && window.EQ_DISTRICTS && window.EQ_DISTRICTS[saved.i] && window.EQ_DISTRICTS[saved.i].en === saved.en) {
        sel.value = String(saved.i);
        sel.dispatchEvent(new Event("change"));
      }
      syncBtn();
    }
  };

  /* ---- "make this my district" button (district.html) ---- */
  function syncBtn() {
    var b = document.getElementById("mdBtn"), sel = document.getElementById("distSelect");
    if (!b || !sel) return;
    var saved = get(), idx = sel.value;
    if (idx === "") { b.style.display = "none"; return; }
    b.style.display = "";
    var isMine = saved && String(saved.i) === idx;
    b.textContent = T(isMine ? "md.saved" : "md.set");
    b.classList.toggle("active", !!isMine);
  }
  function wireDistrictPage() {
    var b = document.getElementById("mdBtn"), sel = document.getElementById("distSelect");
    if (!b || !sel) return;
    b.addEventListener("click", function () {
      var idx = sel.value; if (idx === "") return;
      var saved = get();
      if (saved && String(saved.i) === idx) clear();
      else if (window.EQ_DISTRICTS && window.EQ_DISTRICTS[+idx]) set(+idx, window.EQ_DISTRICTS[+idx].en);
      syncBtn();
    });
    sel.addEventListener("change", syncBtn);
    document.addEventListener("eq:langchange", syncBtn);
  }

  /* ---- prefills on other pages ---- */
  function prefill() {
    var saved = get(); if (!saved) return;
    // felt.html: <select> whose option values are English district names
    var felt = document.getElementById("feltDistrict");
    if (felt && !felt.value) {
      var has = [].some.call(felt.options, function (o) { return o.value === saved.en; });
      if (has) felt.value = saved.en;
    }
    // alerts.html: free-text district input
    var al = document.getElementById("f-district");
    if (al && !al.value) al.value = saved.en;
  }

  function init() { wireDistrictPage(); prefill(); window.EQMyDistrict.applyToSelect(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
