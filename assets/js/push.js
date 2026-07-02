/* ==========================================================================
   EQ Sentry — browser push alerts (Web Push).
   One-tap subscribe to real-time notifications for significant quakes near you,
   with no phone number. Requires the EQ Sentry backend (window.EQ_API) configured
   with VAPID keys. Degrades gracefully: if push is unsupported or no backend is
   set, the toggle explains why. Wires a #pushToggle button + #pushStatus text.
   ========================================================================== */
(function () {
  "use strict";

  function api() { return window.EQ_API ? String(window.EQ_API).replace(/\/+$/, "") : ""; }
  function supported() {
    return "serviceWorker" in navigator && "PushManager" in window &&
      "Notification" in window && window.isSecureContext;
  }
  function T(k, f) { return (window.EQ && window.EQ.t) ? window.EQ.t(k) : (f || k); }
  function b64ToU8(b64) {
    var pad = "=".repeat((4 - (b64.length % 4)) % 4);
    var s = (b64 + pad).replace(/-/g, "+").replace(/_/g, "/");
    var raw = atob(s), arr = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
    return arr;
  }

  var btn, statusEl;
  function status(msg, on) {
    if (statusEl) statusEl.textContent = msg || "";
    if (btn) btn.setAttribute("aria-pressed", on ? "true" : "false");
  }
  function label(text, disabled) { if (btn) { btn.textContent = text; btn.disabled = !!disabled; } }

  function currentSub() {
    if (!supported()) return Promise.resolve(null);
    return navigator.serviceWorker.ready.then(function (reg) { return reg.pushManager.getSubscription(); }).catch(function () { return null; });
  }

  function prefs() {
    var d = document.getElementById("f-district"), t = document.getElementById("f-thresh");
    return {
      district: d ? d.value.trim() : "",
      threshold: t ? t.value : "4.5",
      lang: (window.EQ && window.EQ.getLang) ? window.EQ.getLang() : "en"
    };
  }

  function enable() {
    if (!supported()) { status(T("push.unsupported", "Push isn't supported in this browser."), false); return; }
    if (!api()) { status(T("push.nobackend", "Browser alerts need the EQ Sentry server (set EQ_API in config.js)."), false); return; }
    label(T("push.working", "Enabling…"), true);
    Notification.requestPermission().then(function (perm) {
      if (perm !== "granted") {
        status(T("push.denied", "Notifications are blocked — allow them in your browser settings."), false);
        label(T("push.enable", "Enable browser alerts")); return;
      }
      return fetch(api() + "/api/push/key").then(function (r) { return r.json(); }).then(function (k) {
        if (!k || !k.key) throw new Error("no-vapid-key");
        return navigator.serviceWorker.ready.then(function (reg) {
          return reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToU8(k.key) });
        });
      }).then(function (sub) {
        var p = prefs();
        return fetch(api() + "/api/push/subscribe", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subscription: sub, district: p.district, threshold: p.threshold, lang: p.lang })
        });
      }).then(function () {
        status(T("push.on", "✓ Browser alerts are on for this device."), true);
        label(T("push.disable", "Turn off browser alerts"));
      });
    }).catch(function () {
      status(T("push.err", "Couldn't enable browser alerts — please try again."), false);
      label(T("push.enable", "Enable browser alerts"));
    });
  }

  function disable() {
    label(T("push.working", "…"), true);
    currentSub().then(function (sub) {
      if (!sub) return;
      if (api()) {
        try { fetch(api() + "/api/push/unsubscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) }); } catch (e) {}
      }
      return sub.unsubscribe();
    }).then(function () {
      status(T("push.off", "Browser alerts are off."), false);
      label(T("push.enable", "Enable browser alerts"));
    }).catch(function () {
      label(T("push.disable", "Turn off browser alerts"));
    });
  }

  function relabel() {
    currentSub().then(function (sub) {
      if (sub) { status(T("push.on", "✓ Browser alerts are on for this device."), true); label(T("push.disable", "Turn off browser alerts")); }
      else {
        label(T("push.enable", "Enable browser alerts"), !supported());
        status(!supported() ? T("push.unsupported", "Push isn't supported in this browser.")
          : (api() ? "" : T("push.nobackend", "Browser alerts need the EQ Sentry server (set EQ_API in config.js).")), false);
      }
    });
  }

  function init() {
    btn = document.getElementById("pushToggle");
    statusEl = document.getElementById("pushStatus");
    if (!btn) return;
    relabel();
    btn.addEventListener("click", function () {
      currentSub().then(function (s) { s ? disable() : enable(); });
    });
    document.addEventListener("eq:langchange", relabel);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
