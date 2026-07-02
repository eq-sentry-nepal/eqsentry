/* EQ Sentry — glossary renderer + filter (glossary.html). Terms live in the
   page dictionary as gl.t1..gl.t16 / gl.d1..gl.d16; the filter matches the
   current language AND the other one, so English queries work in नेपाली too. */
(function () {
  "use strict";
  var list = document.getElementById("glList");
  if (!list) return;
  function T(k) { return window.EQ ? window.EQ.t(k) : k; }
  var N = 16, q = "";

  function otherLangText(i) {
    // pull both languages' strings straight from the page dict for matching
    var el = document.getElementById("page-i18n");
    if (!el) return "";
    try {
      var d = JSON.parse(el.textContent);
      return (d.en["gl.t" + i] + " " + d.en["gl.d" + i] + " " + d.ne["gl.t" + i] + " " + d.ne["gl.d" + i]).toLowerCase();
    } catch (e) { return ""; }
  }
  var HAY = [];
  for (var i = 1; i <= N; i++) HAY[i] = otherLangText(i);

  function render() {
    var html = "", shown = 0;
    for (var i = 1; i <= N; i++) {
      if (q && HAY[i].indexOf(q) < 0) continue;
      shown++;
      html += '<div class="card" style="padding:18px 20px">' +
        '<h3 style="margin:0 0 6px">' + T("gl.t" + i) + '</h3>' +
        '<p class="mb-0" style="color:var(--ink-soft)">' + T("gl.d" + i) + "</p></div>";
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
