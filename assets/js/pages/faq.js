/* EQ Sentry — FAQ accordion. Extracted from faq.html so the CSP can forbid
   inline scripts. Requires i18n.js (window.EQ). */
(function () {
  "use strict";
  var box = document.getElementById("faq");
  if (!box) return;
  var CHEV = '<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M6 9l6 6 6-6"/></svg>';
  function T(k) { return window.EQ ? window.EQ.t(k) : k; }
  function build() {
    var html = "";
    for (var i = 1; i <= 12; i++) {
      html += '<div class="faq-item"><button class="faq-q" type="button" aria-expanded="false"><span>' +
        T("faq.q" + i) + "</span>" + CHEV + '</button><div class="faq-a"><div>' + T("faq.a" + i) + "</div></div></div>";
    }
    box.innerHTML = html;
    box.querySelectorAll(".faq-q").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var item = btn.parentNode, a = item.querySelector(".faq-a");
        var open = item.classList.toggle("open");
        btn.setAttribute("aria-expanded", open ? "true" : "false");
        a.style.maxHeight = open ? a.firstElementChild.scrollHeight + 24 + "px" : "0";
      });
    });
  }
  build();
  document.addEventListener("eq:langchange", build);
})();
