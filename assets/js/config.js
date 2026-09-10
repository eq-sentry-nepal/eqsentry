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
/* NOTE: the site ships a Content-Security-Policy. If you point EQ_API at a custom
   domain other than api.eqsentry.com / *.onrender.com, add that origin to the
   connect-src list in every page's CSP meta tag. */
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

/* ── CARTO basemap tiles ───────────────────────────────────────────────────
   The two literals below are the build-time injection point: `npm run build`
   rewrites them inside dist/ from the CARTO_BASEMAP_DARK / CARTO_BASEMAP_LIGHT
   environment variables (Vercel → Settings → Environment Variables). Leaving
   the vars unset keeps these defaults, so the site still works with no build
   step at all — GitHub Pages serves this file verbatim from the repo root.

   Keep any override on *.basemaps.cartocdn.com. Every page's CSP pins img-src
   to that host, and service-worker.js excludes it from caching by the same
   name — pointing elsewhere needs both updated or tiles silently break.     */
window.EQ_BASEMAPS = {
  /* CARTO began enforcing API keys on basemap tiles in Aug 2026. Without one the
     tiles still load but carry an "API KEY REQUIRED" watermark. Keys are free
     (5M tiles/month) from https://carto.com/basemaps/apikey/ — set CARTO_API_KEY
     and the build injects it here; the helper below appends it to the templates. */
  key: "",
  dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
  light: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
};

/* Single source of truth for every Leaflet map on the site (map, district,
   felt, insights). Returns the tile template for the active theme, with the
   CARTO key appended when one is configured. Templates that already carry
   their own key= are left alone, so either approach works. */
window.EQ_BASEMAP = function () {
  var b = window.EQ_BASEMAPS || {};
  var url = document.documentElement.classList.contains("light")
    ? (b.light || b.dark)
    : (b.dark || b.light);
  if (!url) return "";
  if (b.key && url.indexOf("key=") === -1) {
    url += (url.indexOf("?") === -1 ? "?" : "&") + "key=" + encodeURIComponent(b.key);
  }
  return url;
};
