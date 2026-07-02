/* ==========================================================================
   EQ Sentry — family earthquake plan builder.
   Everything is stored locally (localStorage) — nothing is uploaded. Supports
   dynamic contact/role rows, a kit checklist with a 6-month refresh reminder,
   print, and clear. Requires i18n.js (window.EQ). Page: plan.html.
   ========================================================================== */
(function () {
  "use strict";
  function ready(fn) { document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", fn) : fn(); }
  ready(init);

  function T(k) { return window.EQ ? window.EQ.t(k) : k; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function $(id) { return document.getElementById(id); }

  var KEY = "eqsentry_plan";
  var KIT = ["water", "food", "light", "batt", "radio", "firstaid", "meds", "docs", "cash", "whistle", "shoes", "warm"];
  var state = { meet1: "", meet2: "", oacName: "", oacPhone: "", blood: "", ice: [], roles: [], kit: {}, kitDate: "" };

  function loadState() {
    try { var s = JSON.parse(localStorage.getItem(KEY)); if (s && typeof s === "object") state = Object.assign(state, s); } catch (e) {}
    if (!state.ice || !state.ice.length) state.ice = [{ who: "", phone: "", rel: "" }];
    if (!state.roles || !state.roles.length) state.roles = [{ who: "", task: "" }];
    if (!state.kit) state.kit = {};
  }
  var flashT;
  function flash(msg) { var el = $("planStatus"); if (!el) return; el.textContent = msg; clearTimeout(flashT); flashT = setTimeout(function () { el.textContent = ""; }, 2500); }
  function saveState() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} flash(T("pp.saved")); }

  function iceRow(r, i) {
    return '<div class="plan-row">' +
      '<div class="field"><input class="ice-who" value="' + esc(r.who) + '" placeholder="' + esc(T("pp.role.who.ph")) + '" /></div>' +
      '<div class="field"><input class="ice-phone" type="tel" value="' + esc(r.phone) + '" placeholder="' + esc(T("pp.phone.ph")) + '" /></div>' +
      '<div class="field"><input class="ice-rel" value="' + esc(r.rel) + '" placeholder="' + esc(T("pp.rel.ph")) + '" /></div>' +
      '<button type="button" class="plan-rm" data-rm="ice" data-i="' + i + '" aria-label="remove">×</button></div>';
  }
  function roleRow(r, i) {
    return '<div class="plan-row" style="grid-template-columns:1fr 1fr auto">' +
      '<div class="field"><input class="role-who" value="' + esc(r.who) + '" placeholder="' + esc(T("pp.role.who.ph")) + '" /></div>' +
      '<div class="field"><input class="role-task" value="' + esc(r.task) + '" placeholder="' + esc(T("pp.role.task.ph")) + '" /></div>' +
      '<button type="button" class="plan-rm" data-rm="role" data-i="' + i + '" aria-label="remove">×</button></div>';
  }
  function renderIce() { $("iceList").innerHTML = state.ice.map(iceRow).join(""); }
  function renderRoles() { $("roleList").innerHTML = state.roles.map(roleRow).join(""); }
  function renderKit() {
    $("kitList").innerHTML = KIT.map(function (k) {
      var on = !!state.kit[k];
      return '<label class="kit-item' + (on ? " on" : "") + '"><input type="checkbox" data-k="' + k + '"' + (on ? " checked" : "") + ' /> <span>' + esc(T("pp.k." + k)) + "</span></label>";
    }).join("");
  }
  function fillStatic() {
    $("meet1").value = state.meet1 || ""; $("meet2").value = state.meet2 || "";
    $("oacName").value = state.oacName || ""; $("oacPhone").value = state.oacPhone || "";
    if ($("bloodGrp")) $("bloodGrp").value = state.blood || "";
    $("kitDate").value = state.kitDate || "";
  }

  function gather() {
    state.meet1 = $("meet1").value; state.meet2 = $("meet2").value;
    state.oacName = $("oacName").value; state.oacPhone = $("oacPhone").value; state.kitDate = $("kitDate").value;
    if ($("bloodGrp")) state.blood = $("bloodGrp").value.trim();
    state.ice = [].map.call($("iceList").querySelectorAll(".plan-row"), function (row) {
      return { who: row.querySelector(".ice-who").value, phone: row.querySelector(".ice-phone").value, rel: row.querySelector(".ice-rel").value };
    });
    state.roles = [].map.call($("roleList").querySelectorAll(".plan-row"), function (row) {
      return { who: row.querySelector(".role-who").value, task: row.querySelector(".role-task").value };
    });
    var kit = {};
    [].forEach.call($("kitList").querySelectorAll("input[data-k]"), function (c) { kit[c.getAttribute("data-k")] = c.checked; });
    state.kit = kit;
  }
  function refreshDue() {
    var el = $("refreshDue"); if (!el) return;
    var due = false;
    if (state.kitDate) { var d = new Date(state.kitDate); if (!isNaN(d.getTime())) due = (Date.now() - d.getTime()) > 180 * 864e5; }
    el.classList.toggle("show", due);
  }

  function onChange() { gather(); saveState(); refreshDue(); }
  var debT; function onChangeDebounced() { clearTimeout(debT); debT = setTimeout(onChange, 400); }

  function init() {
    if (!$("planForm")) return;
    loadState(); fillStatic(); renderIce(); renderRoles(); renderKit(); refreshDue();

    ["meet1", "meet2", "oacName", "oacPhone", "bloodGrp"].forEach(function (id) { if ($(id)) $(id).addEventListener("input", onChangeDebounced); });
    $("kitDate").addEventListener("change", onChange);
    $("iceList").addEventListener("input", onChangeDebounced);
    $("roleList").addEventListener("input", onChangeDebounced);
    $("kitList").addEventListener("change", function (e) {
      var l = e.target.closest(".kit-item"); if (l) l.classList.toggle("on", e.target.checked); onChange();
    });

    function rm(e) {
      var b = e.target.closest(".plan-rm"); if (!b) return;
      gather();
      var t = b.getAttribute("data-rm"), i = +b.getAttribute("data-i");
      if (t === "ice") { state.ice.splice(i, 1); if (!state.ice.length) state.ice = [{ who: "", phone: "", rel: "" }]; renderIce(); }
      else { state.roles.splice(i, 1); if (!state.roles.length) state.roles = [{ who: "", task: "" }]; renderRoles(); }
      saveState();
    }
    $("iceList").addEventListener("click", rm);
    $("roleList").addEventListener("click", rm);
    $("iceAdd").addEventListener("click", function () { gather(); state.ice.push({ who: "", phone: "", rel: "" }); renderIce(); saveState(); });
    $("roleAdd").addEventListener("click", function () { gather(); state.roles.push({ who: "", task: "" }); renderRoles(); saveState(); });

    $("planSave").addEventListener("click", function () { gather(); saveState(); refreshDue(); });
    $("planPrint").addEventListener("click", function () { gather(); saveState(); window.print(); });
    $("planClear").addEventListener("click", function () {
      if (!confirm(T("pp.clear.confirm"))) return;
      try { localStorage.removeItem(KEY); } catch (e) {}
      state = { meet1: "", meet2: "", oacName: "", oacPhone: "", blood: "", ice: [{ who: "", phone: "", rel: "" }], roles: [{ who: "", task: "" }], kit: {}, kitDate: "" };
      fillStatic(); renderIce(); renderRoles(); renderKit(); refreshDue(); flash(T("pp.cleared"));
    });

    document.addEventListener("eq:langchange", function () { gather(); renderIce(); renderRoles(); renderKit(); });
  }
})();
