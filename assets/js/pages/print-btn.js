/* EQ Sentry — generic print button: any element with a data-print attribute
   triggers window.print(). Kept external so pages stay CSP-clean. */
(function () {
  "use strict";
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-print]");
    if (b) window.print();
  });
})();
