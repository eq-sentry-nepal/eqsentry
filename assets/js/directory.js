/* ==========================================================================
   EQ Sentry — combined hospitals + embassies directory.
   One list, filtered by category (All / Hospitals / Embassies), plus search,
   and (for hospitals) province + type filters. Requires i18n.js (window.EQ) and
   directory-data.js (EQ_HOSPITALS, EQ_EMBASSIES).
   ========================================================================== */
(function () {
  "use strict";
  function ready(fn) { document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", fn) : fn(); }
  ready(init);

  function T(k) { return window.EQ ? window.EQ.t(k) : k; }
  function lang() { return window.EQ ? window.EQ.getLang() : "en"; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function telOf(s) { var d = String(s).replace(/\D/g, ""); if (d.charAt(0) === "0") return "+977" + d.slice(1); if (d.slice(0, 3) === "977") return "+" + d; return "+977" + d; }
  function phoneLinks(ph) { return (ph || []).map(function (p) { return '<a href="tel:' + telOf(p) + '" class="dir-tel">' + esc(p) + "</a>"; }).join(" "); }

  var PROV = {
    koshi: ["Koshi", "कोशी"], madhesh: ["Madhesh", "मधेश"], bagmati: ["Bagmati", "बागमती"],
    gandaki: ["Gandaki", "गण्डकी"], lumbini: ["Lumbini", "लुम्बिनी"], karnali: ["Karnali", "कर्णाली"],
    sudurpashchim: ["Sudurpashchim", "सुदूरपश्चिम"]
  };
  var PIN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>';

  var state = { q: "", kind: "all", type: "all", prov: "all" };

  function init() {
    if (!document.getElementById("dirList")) return;
    var s = document.getElementById("dirSearch");
    if (s) s.addEventListener("input", function () { state.q = s.value.toLowerCase().trim(); render(); });

    var kindBox = document.getElementById("dirKind");
    if (kindBox) kindBox.querySelectorAll("button").forEach(function (b) {
      b.addEventListener("click", function () {
        kindBox.querySelectorAll("button").forEach(function (x) { x.classList.remove("active"); });
        b.classList.add("active"); state.kind = b.getAttribute("data-kind");
        var hf = document.getElementById("dirHospFilters");
        if (state.kind === "hospital") { if (hf) hf.hidden = false; }
        else {
          if (hf) hf.hidden = true;
          state.type = "all"; state.prov = "all";
          var tb = document.getElementById("dirChips");
          if (tb) tb.querySelectorAll("button").forEach(function (x) { x.classList.toggle("active", x.getAttribute("data-type") === "all"); });
          var pv = document.getElementById("dirProvince"); if (pv) pv.value = "all";
        }
        render();
      });
    });

    var box = document.getElementById("dirChips");
    if (box) box.querySelectorAll("button").forEach(function (b) {
      b.addEventListener("click", function () {
        box.querySelectorAll("button").forEach(function (x) { x.classList.remove("active"); });
        b.classList.add("active"); state.type = b.getAttribute("data-type"); render();
      });
    });
    var prov = document.getElementById("dirProvince");
    if (prov) prov.addEventListener("change", function () { state.prov = prov.value; render(); });

    render();
    document.addEventListener("eq:langchange", render);
  }

  function matchH(h) {
    if (state.kind === "embassy") return false;
    if (state.type !== "all" && h.type !== state.type) return false;
    if (state.prov !== "all" && h.province !== state.prov) return false;
    if (!state.q) return true;
    var hay = (h.name + " " + (h.ne || "") + " " + (h.addr || "") + " " + (h.district || "") + " " +
      h.type + " " + (PROV[h.province] ? PROV[h.province].join(" ") : "")).toLowerCase();
    return hay.indexOf(state.q) >= 0;
  }
  function matchE(e) {
    if (state.kind === "hospital") return false;
    return !state.q || (e.country + " " + e.ne + " " + (e.addr || e.area || "")).toLowerCase().indexOf(state.q) >= 0;
  }

  function hospitalCard(h, L) {
    var nm = (L === "ne" && h.ne) ? h.ne : h.name;
    var sub = (L === "ne") ? h.name : (h.ne || "");
    var hoursBadge = h.hours ? '<span class="dir-hours' + (h.hours === "24/7" ? " on" : "") + '">' +
      (h.hours === "24/7" ? T("dir.h.247") : T("dir.h.opd")) + "</span>" : "";
    var phones = (h.phones && h.phones.length) ? phoneLinks(h.phones)
      : '<span class="muted" style="font-size:.82rem">' + T("dir.nophone") + "</span>";
    return '<div class="dir-card"><div class="dir-head"><div><div class="dir-name">' + esc(nm) +
      '</div>' + (sub ? '<div class="dir-sub">' + esc(sub) + "</div>" : "") + '</div><span class="badge dir-type">' + T("dir.t." + h.type) + "</span></div>" +
      '<div class="dir-addr">' + PIN + "<span>" + esc(h.addr || "") + "</span></div>" +
      (hoursBadge ? '<div class="dir-meta">' + hoursBadge + "</div>" : "") +
      '<div class="dir-phones">' + phones + "</div></div>";
  }
  function embassyCard(e, L) {
    var nm = L === "ne" ? e.ne : e.country, sub = L === "ne" ? e.country : e.ne;
    var flag = e.cc ? '<img class="dir-flag" src="https://flagcdn.com/40x30/' + e.cc + '.png" srcset="https://flagcdn.com/80x60/' + e.cc + '.png 2x" width="20" height="15" alt="" loading="lazy">' : "";
    return '<div class="dir-card"><div class="dir-head"><div><div class="dir-name">' + flag + esc(nm) +
      '</div><div class="dir-sub">' + esc(sub) + "</div></div><span class=\"badge dir-type\">" + T("dir.embassy") + "</span></div>" +
      (e.addr ? '<div class="dir-addr">' + PIN + "<span>" + esc(e.addr) + "</span></div>" : "") +
      '<div class="dir-phones">' + phoneLinks(e.phones) + "</div></div>";
  }

  function render() {
    var L = lang();
    var list = document.getElementById("dirList"); if (!list) return;
    var H = (window.EQ_HOSPITALS || []).filter(matchH);
    var E = (window.EQ_EMBASSIES || []).filter(matchE);
    var count = H.length + E.length;

    var cnt = document.getElementById("dirCount"); if (cnt) cnt.textContent = count;
    var ttl = document.getElementById("dirListTitle");
    if (ttl) ttl.textContent = T(state.kind === "hospital" ? "dir.hosp.t" : (state.kind === "embassy" ? "dir.emb.t" : "dir.list.t"));

    var html = H.map(function (h) { return hospitalCard(h, L); }).join("") +
      E.map(function (e) { return embassyCard(e, L); }).join("");
    list.innerHTML = count ? html : '<p class="muted" style="grid-column:1/-1">' + T("dir.none") + "</p>";
    // hide flag images that fail to load (attached here — no inline handlers, CSP-safe)
    list.querySelectorAll("img.dir-flag").forEach(function (im) {
      im.addEventListener("error", function () { im.style.display = "none"; });
    });
  }
})();
