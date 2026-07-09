/* ==========================================================================
   EQ Sentry — front-end runtime config. Safe to edit; no build step needed.

   EQ_API points the site at the optional backend (server/): real push alerts,
   felt reports, cached USGS/EMSC proxies, server status history.
   - On localhost it auto-targets the local dev server (http://localhost:8787),
     so running `npm start` in server/ is enough to test end-to-end.
   - Anywhere else it stays "" → the site runs standalone (safe to deploy as-is).
   For a deployed backend, hardcode it: window.EQ_API = "https://api.eqsentry.com";
   Pages with backend features include this file BEFORE assets/js/i18n.js;
   everywhere else i18n.js injects it automatically.
   ========================================================================== */
window.EQ_API =
  (location.hostname === "localhost" || location.hostname === "127.0.0.1")
    ? "http://localhost:8787"
    : "";

window.EQ_CONFIG = window.EQ_CONFIG || {
  api: window.EQ_API,

  /* Privacy-friendly analytics — loads nothing until configured.
     provider: "plausible"   → site: your domain, e.g. "eqsentry.com"
     provider: "goatcounter" → site: your code,   e.g. "eqsentry" (eqsentry.goatcounter.com) */
  analytics: { provider: "", site: "" }
};
