/* EQ Sentry front-end config.
   EQ_API points the site at the backend (real push alerts + cached USGS/EMSC proxies).
   - On localhost it auto-targets the local dev server (http://localhost:8787), so
     running `npm start` in server/ is enough to test push end-to-end.
   - Anywhere else it stays empty → the site runs standalone (the map calls USGS
     directly; browser push shows "needs server"). So this is safe to deploy as-is.
   To use a deployed backend in production, hardcode your API URL instead, e.g.:
     window.EQ_API = "https://api.eqsentry.com";
   Include this file BEFORE assets/js/i18n.js on any page that should use it. */
window.EQ_API =
  (location.hostname === "localhost" || location.hostname === "127.0.0.1")
    ? "http://localhost:8787"
    : "";
