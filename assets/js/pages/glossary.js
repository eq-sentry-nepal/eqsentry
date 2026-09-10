/* EQ Sentry — glossary renderer + filter (glossary.html). Terms live in the
   page dictionary as gl.t1..gl.t16 / gl.d1..gl.d16; each card gets a small
   inline SVG illustration. The filter matches the current language AND the
   other one, so English queries work in नेपाली too. */
(function () {
  "use strict";
  var list = document.getElementById("glList");
  if (!list) return;
  function T(k) { return window.EQ ? window.EQ.t(k) : k; }
  var N = 16, q = "";

  /* one small line-art icon per term (24×24 stroke paths) */
  var ICONS = [
    "", // 1-indexed
    '<path d="M2 13h4l2-7 3 12 3-9 2 4h6"/>',                                                          // magnitude — seismic trace
    '<circle cx="12" cy="12" r="2"/><circle cx="12" cy="12" r="6" opacity=".65"/><circle cx="12" cy="12" r="9.5" opacity=".35"/>', // intensity — rings
    '<path d="M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>', // epicentre — pin
    '<path d="M3 8h18M3 12h18" opacity=".4"/><circle cx="12" cy="17" r="2.4"/><path d="M12 14.6V8" opacity=".6"/>', // hypocentre — below layers
    '<path d="M4 5h16" opacity=".4"/><path d="M12 5v13M8.5 14.5 12 18l3.5-3.5"/>',                     // depth — arrow down
    '<path d="M3 9h7l2 5h9" opacity=".5"/><path d="M10 4v6.5M14 9.8V20"/>',                            // fault — offset blocks
    '<path d="M2 19l6-11 4 6 3-4 7 9z"/><path d="M4 17.5h16" opacity=".4"/>',                          // MHT — mountain over fault
    '<path d="M8 12H2M22 12h-6"/><path d="m8 12-2.5-2.5M8 12l-2.5 2.5M16 12l2.5-2.5M16 12l2.5 2.5"/><path d="M10.5 8.5 12 12l1.5-3.5" opacity=".6"/>', // plates — colliding arrows
    '<path d="M2 12h3l1.5-4 3 8 3-8 3 8 1.5-4H22"/>',                                                  // P-wave — sharp pulse
    '<path d="M2 12c2.5-6 5-6 7.5 0s5 6 7.5 0 3.5-4 5-2"/>',                                           // S-wave — smooth wave
    '<path d="M4 14l2.5-6 3 8 2-5" /><path d="M13.5 13l1.5-3 1.5 3M18.5 13l1-2 1 2" opacity=".55"/>',  // aftershock — fading pulses
    '<path d="M3 13l1-2 1 2M7 13l1.5-3 1.5 3" opacity=".55"/><path d="M12 14l2.5-7 3 9 2.5-5"/>',      // foreshock — building up
    '<path d="M9 12V8l3-2.5L15 8v4" /><path d="M2 15c2-2 4 2 6 0s4 2 6 0 4 2 6 0" opacity=".7"/><path d="M2 19c2-2 4 2 6 0s4 2 6 0 4 2 6 0" opacity=".4"/>', // liquefaction — house on waves
    '<path d="M3 21h18M5 21V9l7-5 7 5v12"/><path d="M8 21v-8h8v8M8 17h8" opacity=".7"/>',              // retrofit — braced house
    '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M6 12h2l1.5-3 2 6 1.5-3h5"/>',          // seismograph — drum
    '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/><path d="M20.5 4.5a9 9 0 0 1 1.8 3.6M3.5 4.5a9 9 0 0 0-1.8 3.6" opacity=".6"/>' // early warning — bell + waves
  ];
  function icon(i) {
    return '<span class="gl-ic" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + ICONS[i] + "</svg></span>";
  }

  function pageDict() {
    var el = document.getElementById("page-i18n");
    if (!el) return null;
    try { return JSON.parse(el.textContent); } catch (e) { return null; }
  }
  var DICT = pageDict(), HAY = [];
  for (var i = 1; i <= N; i++) {
    HAY[i] = DICT
      ? (DICT.en["gl.t" + i] + " " + DICT.en["gl.d" + i] + " " + DICT.ne["gl.t" + i] + " " + DICT.ne["gl.d" + i]).toLowerCase()
      : "";
  }

  function render() {
    var html = "", shown = 0;
    for (var i = 1; i <= N; i++) {
      if (q && HAY[i].indexOf(q) < 0) continue;
      shown++;
      html += '<div class="card gl-card" style="padding:18px 20px">' +
        '<div class="flex" style="gap:14px;align-items:flex-start">' + icon(i) +
        '<div><h3 style="margin:0 0 6px">' + T("gl.t" + i) + '</h3>' +
        '<p class="mb-0" style="color:var(--ink-soft)">' + T("gl.d" + i) + "</p></div></div></div>";
    }
    list.innerHTML = html;
    var none = document.getElementById("glNone");
    if (none) none.style.display = shown ? "none" : "block";
  }

  var s = document.getElementById("glSearch");
  if (s) s.addEventListener("input", function () { q = s.value.toLowerCase().trim(); render(); });
  render();
  document.addEventListener("eq:langchange", render);
})();
