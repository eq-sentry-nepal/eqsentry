/* ==========================================================================
   EQ Sentry — client-side error monitor.
   Captures uncaught JS errors, unhandled promise rejections and failed
   resource loads. Keeps a small ring buffer in localStorage (inspect with
   EQ_MONITOR.dump() in the console) and, when a backend is configured
   (window.EQ_API), reports up to 10 events per page view to /api/client-log.
   No personal data is collected. Injected on every page by i18n.js.
   ========================================================================== */
(function () {
  "use strict";
  var KEY = "eqsentry_errlog", MAX = 30, LIMIT = 10, sent = 0;

  function api() { return window.EQ_API ? String(window.EQ_API).replace(/\/+$/, "") : ""; }

  function record(type, msg, src, line) {
    var entry = {
      t: Date.now(), type: String(type || "error"),
      msg: String(msg == null ? "" : msg).slice(0, 300),
      src: String(src == null ? "" : src).slice(0, 200),
      line: Number(line) || 0,
      page: location.pathname + location.hash
    };
    try {
      var log = JSON.parse(localStorage.getItem(KEY) || "[]");
      log.push(entry);
      if (log.length > MAX) log = log.slice(-MAX);
      localStorage.setItem(KEY, JSON.stringify(log));
    } catch (e) { /* storage full/blocked — skip */ }
    if (api() && sent < LIMIT) {
      sent++;
      try {
        fetch(api() + "/api/client-log", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(entry), keepalive: true
        }).catch(function () {});
      } catch (e) {}
    }
  }

  // Uncaught errors + failed resource loads (capture phase sees <script>/<img>/<link> errors)
  window.addEventListener("error", function (e) {
    var t = e && e.target;
    if (t && t !== window && (t.tagName === "SCRIPT" || t.tagName === "LINK" || t.tagName === "IMG")) {
      record("resource", t.src || t.href || "", t.tagName.toLowerCase());
      return;
    }
    record("error", e.message, e.filename, e.lineno);
  }, true);

  window.addEventListener("unhandledrejection", function (e) {
    var r = e && e.reason;
    record("promise", r && r.message ? r.message : r,
      r && r.stack ? String(r.stack).split("\n").slice(0, 2).join(" | ") : "");
  });

  window.EQ_MONITOR = {
    log: record,
    dump: function () { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch (e) { return []; } },
    clear: function () { try { localStorage.removeItem(KEY); } catch (e) {} }
  };
})();
