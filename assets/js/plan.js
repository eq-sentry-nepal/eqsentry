/* ==========================================================================
   EQ Sentry — family earthquake plan builder (v2).
   A complete family plan: household members (blood group, medicines),
   three meeting points, communication plan, ICE contacts, roles, utility
   shut-offs, nearby safety points, special needs & pets, documents, and a
   kit checklist with a 6-month refresh reminder — plus a completeness
   meter. Everything is stored locally (localStorage); nothing is uploaded.
   Requires i18n.js (window.EQ). Page: plan.html.
   ========================================================================== */
(function () {
  "use strict";
  function ready(fn) { document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", fn) : fn(); }
  ready(init);

  function T(k) { return window.EQ ? window.EQ.t(k) : k; }
  function dg(s) { return (window.EQ && window.EQ.dg) ? window.EQ.dg(s) : String(s); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function $(id) { return document.getElementById(id); }

  var KEY = "eqsentry_plan";
  var KIT = ["water", "food", "light", "batt", "radio", "firstaid", "meds", "docs", "cash", "whistle", "shoes", "warm"];
  var FIELDS = ["meet1", "meet2", "meet3", "oacName", "oacPhone", "famChat", "homeAddr", "gasLoc", "powerLoc", "waterLoc", "nearOpen", "nearHosp", "nearHelp", "specialNotes", "docsLoc"];

  function blank() {
    return {
      members: [], meet1: "", meet2: "", meet3: "", oacName: "", oacPhone: "", chat: "",
      ice: [], roles: [], home: { addr: "", gas: "", power: "", water: "" },
      near: { open: "", hosp: "", help: "" }, special: "", docs: "", blood: "", kit: {}, kitDate: ""
    };
  }
  var state = blank();

  function loadState() {
    try { var s = JSON.parse(localStorage.getItem(KEY)); if (s && typeof s === "object") state = Object.assign(blank(), s); } catch (e) {}
    // Backward-compatible defaults for plans saved by the previous version.
    if (!state.home || typeof state.home !== "object") state.home = { addr: "", gas: "", power: "", water: "" };
    if (!state.near || typeof state.near !== "object") state.near = { open: "", hosp: "", help: "" };
    if (!state.members || !state.members.length) {
      state.members = [{ name: "", age: "", blood: state.blood || "", meds: "" }];
    }
    if (!state.ice || !state.ice.length) state.ice = [{ who: "", phone: "", rel: "" }];
    if (!state.roles || !state.roles.length) state.roles = [{ who: "", task: "" }];
    if (!state.kit) state.kit = {};
  }
  var flashT;
  function flash(msg) { var el = $("planStatus"); if (!el) return; el.textContent = msg; clearTimeout(flashT); flashT = setTimeout(function () { el.textContent = ""; }, 2500); }
  function saveState() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} flash(T("pp.saved")); }

  function memRow(r, i) {
    return '<div class="plan-row" style="grid-template-columns:1.1fr .5fr .55fr 1.5fr auto">' +
      '<div class="field"><input class="mem-name" value="' + esc(r.name) + '" placeholder="' + esc(T("pp.mem.name.ph")) + '" /></div>' +
      '<div class="field"><input class="mem-age" inputmode="numeric" value="' + esc(r.age) + '" placeholder="' + esc(T("pp.mem.age.ph")) + '" /></div>' +
      '<div class="field"><input class="mem-blood" value="' + esc(r.blood) + '" placeholder="' + esc(T("pp.mem.blood.ph")) + '" maxlength="6" /></div>' +
      '<div class="field"><input class="mem-meds" value="' + esc(r.meds) + '" placeholder="' + esc(T("pp.mem.meds.ph")) + '" /></div>' +
      '<button type="button" class="plan-rm" data-rm="mem" data-i="' + i + '" aria-label="remove">×</button></div>';
  }
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
  function renderMem() { $("memList").innerHTML = state.members.map(memRow).join(""); }
  function renderIce() { $("iceList").innerHTML = state.ice.map(iceRow).join(""); }
  function renderRoles() { $("roleList").innerHTML = state.roles.map(roleRow).join(""); }
  function renderKit() {
    $("kitList").innerHTML = KIT.map(function (k) {
      var on = !!state.kit[k];
      return '<label class="kit-item' + (on ? " on" : "") + '"><input type="checkbox" data-k="' + k + '"' + (on ? " checked" : "") + ' /> <span>' + esc(T("pp.k." + k)) + "</span></label>";
    }).join("");
  }
  function fillStatic() {
    $("meet1").value = state.meet1 || ""; $("meet2").value = state.meet2 || ""; $("meet3").value = state.meet3 || "";
    $("oacName").value = state.oacName || ""; $("oacPhone").value = state.oacPhone || "";
    $("famChat").value = state.chat || "";
    $("homeAddr").value = state.home.addr || ""; $("gasLoc").value = state.home.gas || "";
    $("powerLoc").value = state.home.power || ""; $("waterLoc").value = state.home.water || "";
    $("nearOpen").value = state.near.open || ""; $("nearHosp").value = state.near.hosp || ""; $("nearHelp").value = state.near.help || "";
    $("specialNotes").value = state.special || ""; $("docsLoc").value = state.docs || "";
    $("kitDate").value = state.kitDate || "";
  }

  function gather() {
    state.meet1 = $("meet1").value; state.meet2 = $("meet2").value; state.meet3 = $("meet3").value;
    state.oacName = $("oacName").value; state.oacPhone = $("oacPhone").value; state.chat = $("famChat").value;
    state.home = { addr: $("homeAddr").value, gas: $("gasLoc").value, power: $("powerLoc").value, water: $("waterLoc").value };
    state.near = { open: $("nearOpen").value, hosp: $("nearHosp").value, help: $("nearHelp").value };
    state.special = $("specialNotes").value; state.docs = $("docsLoc").value;
    state.kitDate = $("kitDate").value;
    state.members = [].map.call($("memList").querySelectorAll(".plan-row"), function (row) {
      return { name: row.querySelector(".mem-name").value, age: row.querySelector(".mem-age").value, blood: row.querySelector(".mem-blood").value.trim(), meds: row.querySelector(".mem-meds").value };
    });
    // Keep the legacy single blood field in sync for old wallet cards.
    var b = state.members.filter(function (m) { return m.blood; })[0];
    state.blood = b ? b.blood : "";
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

  function has(v) { return !!(v && String(v).trim()); }
  function progress() {
    var kitCount = KIT.filter(function (k) { return state.kit[k]; }).length;
    var checks = [
      state.members.some(function (m) { return has(m.name); }),
      has(state.meet1) && has(state.meet2),
      has(state.meet3),
      has(state.oacName) && has(state.oacPhone),
      state.ice.some(function (r) { return has(r.phone); }),
      state.roles.some(function (r) { return has(r.who) && has(r.task); }),
      has(state.home.gas) || has(state.home.power) || has(state.home.water),
      has(state.near.open) || has(state.near.hosp),
      has(state.docs),
      kitCount >= 6 && has(state.kitDate)
    ];
    var n = checks.filter(Boolean).length, m = checks.length;
    var pct = Math.round(n / m * 100);
    if ($("progBar")) $("progBar").style.width = pct + "%";
    if ($("progPct")) $("progPct").textContent = dg(pct) + "%";
    if ($("progHint")) $("progHint").textContent = (n === m) ? T("pp.prog.done") : T("pp.prog.hint").replace("{n}", dg(n)).replace("{m}", dg(m));
  }

  function refreshDue() {
    var el = $("refreshDue"); if (!el) return;
    var due = false;
    if (state.kitDate) { var d = new Date(state.kitDate); if (!isNaN(d.getTime())) due = (Date.now() - d.getTime()) > 180 * 864e5; }
    el.classList.toggle("show", due);
  }

  function onChange() { gather(); saveState(); refreshDue(); progress(); }
  var debT; function onChangeDebounced() { clearTimeout(debT); debT = setTimeout(onChange, 400); }

  function init() {
    if (!$("planForm")) return;
    loadState(); fillStatic(); renderMem(); renderIce(); renderRoles(); renderKit(); refreshDue(); progress();

    FIELDS.forEach(function (id) { if ($(id)) $(id).addEventListener("input", onChangeDebounced); });
    $("kitDate").addEventListener("change", onChange);
    ["memList", "iceList", "roleList"].forEach(function (id) { $(id).addEventListener("input", onChangeDebounced); });
    $("kitList").addEventListener("change", function (e) {
      var l = e.target.closest(".kit-item"); if (l) l.classList.toggle("on", e.target.checked); onChange();
    });

    function rm(e) {
      var b = e.target.closest(".plan-rm"); if (!b) return;
      gather();
      var t = b.getAttribute("data-rm"), i = +b.getAttribute("data-i");
      if (t === "mem") { state.members.splice(i, 1); if (!state.members.length) state.members = [{ name: "", age: "", blood: "", meds: "" }]; renderMem(); }
      else if (t === "ice") { state.ice.splice(i, 1); if (!state.ice.length) state.ice = [{ who: "", phone: "", rel: "" }]; renderIce(); }
      else { state.roles.splice(i, 1); if (!state.roles.length) state.roles = [{ who: "", task: "" }]; renderRoles(); }
      saveState(); progress();
    }
    $("memList").addEventListener("click", rm);
    $("iceList").addEventListener("click", rm);
    $("roleList").addEventListener("click", rm);
    $("memAdd").addEventListener("click", function () { gather(); state.members.push({ name: "", age: "", blood: "", meds: "" }); renderMem(); saveState(); });
    $("iceAdd").addEventListener("click", function () { gather(); state.ice.push({ who: "", phone: "", rel: "" }); renderIce(); saveState(); });
    $("roleAdd").addEventListener("click", function () { gather(); state.roles.push({ who: "", task: "" }); renderRoles(); saveState(); });

    $("planSave").addEventListener("click", function () { gather(); saveState(); refreshDue(); progress(); });
    $("planPrint").addEventListener("click", function () { gather(); saveState(); window.print(); });
    $("planClear").addEventListener("click", function () {
      if (!confirm(T("pp.clear.confirm"))) return;
      try { localStorage.removeItem(KEY); } catch (e) {}
      state = blank();
      state.members = [{ name: "", age: "", blood: "", meds: "" }];
      state.ice = [{ who: "", phone: "", rel: "" }]; state.roles = [{ who: "", task: "" }];
      fillStatic(); renderMem(); renderIce(); renderRoles(); renderKit(); refreshDue(); progress(); flash(T("pp.cleared"));
    });

    document.addEventListener("eq:langchange", function () { gather(); renderMem(); renderIce(); renderRoles(); renderKit(); progress(); });
  }
})();
