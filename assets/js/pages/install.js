/* EQ Sentry — install page: one-tap PWA install when the browser offers it,
   platform-aware instructions otherwise. Page: install.html. */
(function () {
  "use strict";
  function ready(fn) { document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", fn) : fn(); }
  ready(function () {
    var card = document.getElementById("inPromptCard"), btn = document.getElementById("installBtn");
    var ios = /iphone|ipad|ipod/i.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    var standalone = window.matchMedia && window.matchMedia("(display-mode: standalone)").matches;
    if (ios) { var a = document.getElementById("inAnd"); if (a) a.style.order = "9"; }
    else { var i = document.getElementById("inIos"); if (i) i.style.order = "9"; }
    function offer() {
      if (card && window.EQ_BIP && !standalone) card.hidden = false;
    }
    offer();
    window.addEventListener("beforeinstallprompt", function () { setTimeout(offer, 50); });
    if (btn) btn.addEventListener("click", function () {
      var e = window.EQ_BIP; if (!e) return;
      e.prompt();
      e.userChoice.then(function () { window.EQ_BIP = null; card.hidden = true; });
    });
  });
})();
