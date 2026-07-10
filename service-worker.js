/* EQ Sentry service worker — offline app shell.
   Preparedness guidance and emergency numbers stay available even with no
   network (critical right after a quake). Live USGS data is never cached. */
const VERSION = "eqsentry-v19";
const SHELL = [
  "./", "index.html", "map.html", "insights.html", "preparedness.html",
  "resources.html", "alerts.html", "plan.html", "felt.html", "about.html", "privacy.html", "offline.html", "assets/js/config.js",
  "building.html", "district.html", "directory.html", "faq.html", "facts.html", "aftermath.html",
  "glossary.html", "history.html", "school-plan.html", "search.html", "404.html", "status.html",
  "assets/css/style.css",
  "assets/js/i18n.js", "assets/js/config.js", "assets/js/engine.js", "assets/js/a11y.js", "assets/js/map.js",
  "assets/js/insights.js", "assets/js/data-layers.js", "assets/js/push.js", "assets/js/plan.js", "assets/js/felt.js",
  "assets/js/carousel.js", "assets/js/seismograph.js", "assets/js/plan-generator.js", "assets/js/monitor.js",
  "assets/js/mydistrict.js",
  "assets/js/district.js", "assets/js/districts-data.js", "assets/js/directory.js", "assets/js/directory-data.js",
  "assets/js/pages/home.js", "assets/js/pages/prep-quiz.js", "assets/js/pages/alerts-form.js",
  "assets/js/pages/resources-form.js", "assets/js/pages/about-sim.js", "assets/js/pages/faq.js",
  "assets/js/pages/insights-plus.js", "assets/js/pages/drill.js", "assets/js/pages/hazard-hunt.js",
  "assets/js/pages/wallet-card.js", "assets/js/pages/glossary.js", "assets/js/pages/search.js",
  "assets/js/pages/print-btn.js", "assets/js/pages/related.js", "assets/js/pages/status.js",
  "assets/downloads/eq-emergency-kit-checklist.pdf", "assets/downloads/eq-family-plan.pdf",
  "assets/downloads/eq-school-college-plan.pdf",
  "manifest.webmanifest", "assets/icons/icon.svg", "assets/icons/icon-192.png"
];

self.addEventListener("install", (e) => {
  // Cache each entry individually so one missing file doesn't void the whole shell.
  e.waitUntil(
    caches.open(VERSION)
      .then((c) => Promise.all(SHELL.map((u) => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Never cache live data / map tiles / API — always go to network, fail soft.
  const isLive = /earthquake\.usgs\.gov|seismicportal\.eu|basemaps\.cartocdn\.com|\/api\//.test(url.href);
  if (isLive) { e.respondWith(fetch(req).catch(() => caches.match(req))); return; }

  // App shell + assets: cache-first, then network (and cache a copy).
  e.respondWith(
    caches.match(req).then((hit) =>
      hit || fetch(req).then((res) => {
        const copy = res.clone();
        if (res.ok && (url.origin === location.origin)) caches.open(VERSION).then((c) => c.put(req, copy));
        return res;
      }).catch(() =>
        req.mode === "navigate" ? caches.match("offline.html").then((o) => o || caches.match("index.html")) : undefined
      )
    )
  );
});

/* ── Web Push: show earthquake alerts even when the site isn't open ── */
self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { body: e.data ? e.data.text() : "" }; }
  const title = d.title || "Earthquake alert — EQ Sentry";
  e.waitUntil(self.registration.showNotification(title, {
    body: d.body || "",
    icon: "assets/icons/icon-192.png",
    badge: "assets/icons/icon-192.png",
    lang: d.lang || "en",
    tag: d.tag || "eq-alert",
    renotify: true,
    vibrate: [200, 100, 200, 100, 200],
    requireInteraction: true,
    data: { url: d.url || "map.html" }
  }));
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const target = (e.notification.data && e.notification.data.url) || "./";
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
    for (const w of wins) {
      if ("focus" in w) { try { w.navigate(target); } catch (_) {} return w.focus(); }
    }
    return self.clients.openWindow(target);
  }));
});
