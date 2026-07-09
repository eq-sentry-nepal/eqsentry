/* ==========================================================================
   EQ Sentry — shared script: i18n, header/footer injection, nav, live banner
   ========================================================================== */
(function () {
  "use strict";

  /* ---------- Theme: apply saved/system choice early (reduces flash) ---------- */
  (function () {
    var d = document.documentElement;
    function ls(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
    var th = ls("eqsentry_theme");
    if (!th) th = (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches) ? "light" : "dark";
    if (th === "light") d.classList.add("light");
    // Accessibility prefs — applied early to avoid a flash of default styling
    var SZ = ["fs-sm", "", "fs-lg", "fs-xl", "fs-xxl"], si = parseInt(ls("eqsentry_textsize") || "1", 10);
    if (si >= 0 && si < SZ.length && SZ[si]) d.classList.add(SZ[si]);
    if (ls("eqsentry_contrast") === "1") d.classList.add("hc");
    if (ls("eqsentry_dys") === "1") d.classList.add("dys");
    var mo = ls("eqsentry_motion");
    if (mo === "1" || (mo === null && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches)) d.classList.add("reduce-motion");
  })();

  /* ---------- Lazy earthquake-data loader (EQ_DATA) ---------- */
  // Pages that need the catalogue mark <body data-eqdata>. data-layers.js (~230 KB)
  // is injected AFTER first paint so it never blocks rendering; consumers await
  // window.EQData.whenReady() (resolves immediately if the data is already present).
  window.EQData = (function () {
    var resolveFn, done = false, p = new Promise(function (r) { resolveFn = r; });
    return {
      whenReady: function () { return p; },
      ready: function (cb) { p.then(cb); },
      _resolve: function () { if (!done) { done = true; resolveFn(window.EQ_DATA || null); document.dispatchEvent(new CustomEvent("eq:dataready")); } }
    };
  })();

  /* ---------- Backend / data source helper ---------- */
  if (typeof window.EQ_FEED_URL !== "function") {
    window.EQ_API = window.EQ_API || "";
    window.EQ_FEED_URL = function (feed) {
      return window.EQ_API
        ? String(window.EQ_API).replace(/\/+$/, "") + "/api/usgs/" + feed
        : "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/" + feed + ".geojson";
    };
  }
  // EMSC (seismicportal.eu) — via the backend proxy when EQ_API is set, else direct.
  if (typeof window.EQ_EMSC_URL !== "function") {
    window.EQ_EMSC_URL = function (params) {
      var p = params ? (params.charAt(0) === "?" ? params.slice(1) : params) : "";
      return window.EQ_API
        ? String(window.EQ_API).replace(/\/+$/, "") + "/api/emsc" + (p ? "?" + p : "")
        : "https://www.seismicportal.eu/fdsnws/event/1/query" + (p ? "?" + p : "");
    };
  }

  /* ---------- Core bilingual dictionary (nav / footer / shared) ---------- */
  var CORE = {
    en: {
      "brand.tag": "Earthquake Monitoring & Safety",
      "nav.home": "Home",
      "nav.map": "Live Map",
      "nav.insights": "Insights",
      "nav.prep": "Preparedness",
      "nav.plan": "Family Plan",
      "nav.felt": "Did You Feel It?",
      "nav.building": "Building Safety",
      "nav.faq": "FAQ",
      "nav.after": "After a Quake",
      "nav.facts": "Facts vs Rumors",
      "nav.safety": "Safety",
      "nav.district": "District Risk",
      "nav.resources": "Emergency Resources",
      "nav.directory": "Hospitals & Embassies",
      "nav.alerts": "Get Alerts",
      "nav.about": "About",
      "nav.cta": "Live Map",
      "nav.glossary": "Glossary",
      "nav.history": "1934 & 2015",
      "nav.search": "Search",
      "nav.status": "Site Status",
      "rel.t": "Keep going",
      "nd.prep": "Make a plan and a go-bag",
      "nd.plan": "Build & save your family plan",
      "nd.felt": "Report shaking near you",
      "nd.building": "Is your home quake-safe?",
      "nd.district": "Recorded quakes near you",
      "nd.after": "What to do in the first 72 hours",
      "nd.facts": "Myth-busting the science",
      "nd.faq": "Common questions answered",
      "nd.resources": "Hotlines & emergency numbers",
      "nd.directory": "Find hospitals & embassies",
      "nd.glossary": "Earthquake terms, plainly",
      "nd.history": "Nepal's great earthquakes",
      "lang.switch": "नेपाली",
      "a11y.skip": "Skip to content", "a11y.title": "Accessibility", "a11y.size": "Text size",
      "a11y.sizeHint": "Make text larger or smaller", "a11y.motion": "Reduce motion", "a11y.motionHint": "Pause animations",
      "a11y.hc": "High contrast", "a11y.hcHint": "Stronger colours", "a11y.dys": "Readable font",
      "a11y.dysHint": "Dyslexia-friendly typeface", "a11y.reset": "Reset all", "a11y.open": "Accessibility options",
      "ui.theme.t": "Day / night", "ui.theme.aria": "Toggle day or night theme", "ui.lang.aria": "Switch language",
      "ui.menu.aria": "Menu", "ui.nav.aria": "Primary", "ui.ver.t": "EQ Sentry version",
      "ui.prev": "Scroll left", "ui.next": "Scroll right", "ui.close": "Close",
      "ui.dec": "Decrease text size", "ui.inc": "Increase text size", "ui.remove": "Remove",
      "es.label": "In an emergency",
      "es.police": "Police", "es.fire": "Fire", "es.amb": "Ambulance", "es.traffic": "Traffic",
      "es.childsearch": "Child Search", "es.childline": "Child Helpline", "es.policehq": "Police HQ",
      "es.apf": "Armed Police", "es.health": "Health", "es.redcross": "Red Cross", "es.disaster": "Disaster",

      "foot.tagline": "Real-time earthquake awareness and preparedness for Nepal. Built so every household can act faster when the ground shakes.",
      "foot.explore": "Explore",
      "foot.safety": "Safety",
      "foot.prep": "Preparedness Guide",
      "foot.kit": "Emergency Kit",
      "foot.resources": "Emergency Numbers",
      "foot.about": "About EQ Sentry",
      "foot.data": "Data & Sources",
      "foot.datasrc": "Quake data: USGS",
      "foot.emsc": "EMSC (Euro-Med)",
      "foot.seismo": "Nat'l Seismological Centre",
      "foot.emergency": "In an emergency",
      "foot.bignum": "100 · 102 · 1149",
      "foot.police": "Police 100 · Ambulance 102 · Disaster 1149",
      "foot.disclaimer": "EQ Sentry is an informational service, not an official warning authority. Earthquakes cannot be predicted. Always follow instructions from Nepal's official agencies.",
      "foot.rights": "A public-safety initiative by Prashant Acharya",
      "foot.privacy": "Privacy",

      "banner.latest": "Latest near Nepal:",
      "banner.view": "View map",
      "banner.none": "No significant quakes recorded near Nepal in the past 7 days — stay prepared.",
      "time.ago": "ago",
      "time.justnow": "just now",
      "time.min": "min",
      "time.hr": "hr",
      "time.day": "day",
      "time.days": "days"
    },
    ne: {
      "brand.tag": "भूकम्प निगरानी र सुरक्षा",
      "nav.home": "गृहपृष्ठ",
      "nav.map": "प्रत्यक्ष नक्सा",
      "nav.insights": "तथ्याङ्क",
      "nav.prep": "पूर्वतयारी",
      "nav.plan": "पारिवारिक योजना",
      "nav.felt": "महसुस गर्नुभयो?",
      "nav.building": "भवन सुरक्षा",
      "nav.faq": "प्रश्नोत्तर",
      "nav.after": "भूकम्पपछि",
      "nav.facts": "तथ्य बनाम अफवाह",
      "nav.safety": "सुरक्षा",
      "nav.district": "जिल्ला जोखिम",
      "nav.resources": "आपत्कालीन स्रोत",
      "nav.directory": "अस्पताल र दूतावास",
      "nav.alerts": "सूचना दर्ता",
      "nav.about": "हाम्रोबारे",
      "nav.cta": "प्रत्यक्ष नक्सा",
      "nav.glossary": "शब्दावली",
      "nav.history": "१९३४ र २०१५",
      "nav.search": "खोज",
      "nav.status": "साइट स्थिति",
      "rel.t": "अगाडि बढ्नुहोस्",
      "nd.prep": "योजना र आपत्कालीन झोला बनाउनुहोस्",
      "nd.plan": "योजना बनाई यन्त्रमा सेभ गर्नुहोस्",
      "nd.felt": "नजिकको हल्लाइ रिपोर्ट गर्नुहोस्",
      "nd.building": "तपाईंको घर भूकम्प-सुरक्षित छ?",
      "nd.district": "तपाईं नजिकका दर्ता भूकम्प",
      "nd.after": "पहिलो ७२ घण्टामा के गर्ने",
      "nd.facts": "विज्ञानले अफवाह चिर्दै",
      "nd.faq": "सामान्य प्रश्नका उत्तर",
      "nd.resources": "हटलाइन र आपत्कालीन नम्बर",
      "nd.directory": "अस्पताल र दूतावास खोज्नुहोस्",
      "nd.glossary": "भूकम्पका शब्द, सरल भाषामा",
      "nd.history": "नेपालका महाभूकम्प",
      "lang.switch": "English",
      "a11y.skip": "सामग्रीमा जानुहोस्", "a11y.title": "पहुँचयोग्यता", "a11y.size": "अक्षर आकार",
      "a11y.sizeHint": "अक्षर ठूलो वा सानो बनाउनुहोस्", "a11y.motion": "चाल घटाउनुहोस्", "a11y.motionHint": "एनिमेसन रोक्नुहोस्",
      "a11y.hc": "उच्च कन्ट्रास्ट", "a11y.hcHint": "गाढा रङ", "a11y.dys": "सजिलो फन्ट",
      "a11y.dysHint": "डिस्लेक्सिया-मैत्री अक्षर", "a11y.reset": "सबै रिसेट", "a11y.open": "पहुँचयोग्यता विकल्प",
      "ui.theme.t": "दिन / रात", "ui.theme.aria": "दिन वा रात थिम बदल्नुहोस्", "ui.lang.aria": "भाषा बदल्नुहोस्",
      "ui.menu.aria": "मेनु", "ui.nav.aria": "मुख्य नेभिगेसन", "ui.ver.t": "EQ Sentry संस्करण",
      "ui.prev": "बायाँ सार्नुहोस्", "ui.next": "दायाँ सार्नुहोस्", "ui.close": "बन्द गर्नुहोस्",
      "ui.dec": "अक्षर सानो बनाउनुहोस्", "ui.inc": "अक्षर ठूलो बनाउनुहोस्", "ui.remove": "हटाउनुहोस्",
      "es.label": "आपत्कालमा",
      "es.police": "प्रहरी", "es.fire": "दमकल", "es.amb": "एम्बुलेन्स", "es.traffic": "ट्राफिक",
      "es.childsearch": "बालबालिका खोजी", "es.childline": "बाल हेल्पलाइन", "es.policehq": "प्रहरी प्र.का.",
      "es.apf": "सशस्त्र प्रहरी", "es.health": "स्वास्थ्य", "es.redcross": "रेडक्रस", "es.disaster": "विपद्",

      "foot.tagline": "नेपालका लागि वास्तविक-समयको भूकम्प जानकारी र पूर्वतयारी। जमिन हल्लिँदा हरेक घरपरिवारले छिटो प्रतिक्रिया दिन सकून् भनेर बनाइएको।",
      "foot.explore": "हेर्नुहोस्",
      "foot.safety": "सुरक्षा",
      "foot.prep": "पूर्वतयारी निर्देशिका",
      "foot.kit": "आपत्कालीन सामग्री",
      "foot.resources": "आपत्कालीन नम्बर",
      "foot.about": "EQ Sentry बारे",
      "foot.data": "तथ्याङ्क र स्रोत",
      "foot.datasrc": "भूकम्प तथ्याङ्क: USGS",
      "foot.emsc": "EMSC (युरो-मेड)",
      "foot.seismo": "राष्ट्रिय भूकम्प केन्द्र",
      "foot.emergency": "आपत्कालमा",
      "foot.bignum": "१०० · १०२ · ११४९",
      "foot.police": "प्रहरी १०० · एम्बुलेन्स १०२ · विपद् ११४९",
      "foot.disclaimer": "EQ Sentry जानकारीमूलक सेवा हो, आधिकारिक चेतावनी निकाय होइन। भूकम्पको पूर्वानुमान गर्न सकिँदैन। सधैं नेपालका आधिकारिक निकायका निर्देशन पालना गर्नुहोस्।",
      "foot.rights": "प्रशान्त आचार्यद्वारा सञ्चालित सार्वजनिक-सुरक्षा अभियान",
      "foot.privacy": "गोपनीयता",

      "banner.latest": "नेपाल नजिकको पछिल्लो:",
      "banner.view": "नक्सा हेर्नुहोस्",
      "banner.none": "विगत ७ दिनमा नेपाल नजिक उल्लेखनीय भूकम्प दर्ता भएको छैन — सतर्क रहनुहोस्।",
      "time.ago": "अघि",
      "time.justnow": "भर्खरै",
      "time.min": "मिनेट",
      "time.hr": "घण्टा",
      "time.day": "दिन",
      "time.days": "दिन"
    }
  };

  /* Page-specific dictionary: either window.PAGE_I18N (legacy) or a
     non-executable <script type="application/json" id="page-i18n"> block
     (preferred — lets the CSP forbid inline executable scripts). */
  var PAGE = window.PAGE_I18N || (function () {
    try {
      var el = document.getElementById("page-i18n");
      return el ? JSON.parse(el.textContent) : null;
    } catch (e) { return null; }
  })() || { en: {}, ne: {} };
  var DICT = {
    en: Object.assign({}, CORE.en, PAGE.en || {}),
    ne: Object.assign({}, CORE.ne, PAGE.ne || {})
  };

  /* ---------- Language state ---------- */
  var LANG_KEY = "eqsentry_lang";
  function getLang() {
    try {
      var s = localStorage.getItem(LANG_KEY);
      if (s) return s;
      // first visit: default to Nepali on Nepali-language devices
      var nl = (navigator.languages && navigator.languages[0]) || navigator.language || "";
      return String(nl).toLowerCase().indexOf("ne") === 0 ? "ne" : "en";
    } catch (e) { return "en"; }
  }
  function setLang(l) {
    try { localStorage.setItem(LANG_KEY, l); } catch (e) {}
    apply(l);
  }
  /* ---------- Data-driven stats inside translated strings ----------
     Strings may embed tokens like {count|811}: the live value from the bundled
     catalogue (EQ_DATA.summary) is used when available, else the fallback after
     the pipe. Digits render in Devanagari for Nepali. Placeholders WITHOUT a
     pipe ({n}, {place}, …) are untouched — pages substitute those themselves. */
  var NE_DIGITS = "०१२३४५६७८९";
  function neDigits(s) { return String(s).replace(/[0-9]/g, function (d) { return NE_DIGITS[+d]; }); }
  // Localize digits in any display string: Devanagari for Nepali, unchanged otherwise.
  function dgS(s) { return getLang() === "ne" ? neDigits(s) : String(s); }
  function statVal(key) {
    var sum = window.EQ_DATA && window.EQ_DATA.summary;
    if (!sum) return null;
    if (key === "count") return sum.count != null ? Number(sum.count).toLocaleString("en-US") : null;
    if (key === "since") return sum.since != null ? String(sum.since) : null;
    if (key === "maxMag") return sum.maxMag != null ? Number(sum.maxMag).toFixed(1) : null;
    if (key === "to") {
      try { // year of the newest catalogue event (order-independent, cached)
        if (statVal._to) return statVal._to;
        var mx = 0, fs = window.EQ_DATA.catalog.features;
        for (var i = 0; i < fs.length; i++) if (fs[i].properties.time > mx) mx = fs[i].properties.time;
        statVal._to = mx ? String(new Date(mx).getUTCFullYear()) : null;
        return statVal._to;
      } catch (e) { return null; }
    }
    return null;
  }
  function subTokens(str, lang) {
    if (typeof str !== "string" || str.indexOf("{") < 0) return str;
    return str.replace(/\{(\w+)\|([^{}]*)\}/g, function (_, k, fb) {
      var v = statVal(k); if (v == null) v = fb;
      return lang === "ne" ? neDigits(v) : v;
    });
  }

  function t(key) {
    var l = getLang();
    var v = (DICT[l] && DICT[l][key]) || (DICT.en && DICT.en[key]) || key;
    return subTokens(v, l);
  }

  /* ---------- Apply translations ---------- */
  function apply(lang) {
    lang = lang || getLang();
    document.documentElement.setAttribute("lang", lang);

    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var v = DICT[lang][el.getAttribute("data-i18n")];
      if (v != null) el.textContent = subTokens(v, lang);
    });
    document.querySelectorAll("[data-i18n-html]").forEach(function (el) {
      var v = DICT[lang][el.getAttribute("data-i18n-html")];
      if (v != null) el.innerHTML = subTokens(v, lang);
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach(function (el) {
      var v = DICT[lang][el.getAttribute("data-i18n-placeholder")];
      if (v != null) el.setAttribute("placeholder", subTokens(v, lang));
    });
    document.querySelectorAll("[data-i18n-aria]").forEach(function (el) {
      var v = DICT[lang][el.getAttribute("data-i18n-aria")];
      if (v != null) el.setAttribute("aria-label", subTokens(v, lang));
    });
    document.querySelectorAll("[data-i18n-title]").forEach(function (el) {
      var v = DICT[lang][el.getAttribute("data-i18n-title")];
      if (v != null) el.setAttribute("title", subTokens(v, lang));
    });
    // static digit spans: localize numerals per language (e.g. 100 -> \u0967\u0966\u0966)
    document.querySelectorAll("[data-dg]").forEach(function (el) {
      el.textContent = lang === "ne" ? neDigits(el.getAttribute("data-dg")) : el.getAttribute("data-dg");
    });

    // toggle button shows the OTHER language
    var tg = document.getElementById("langToggle");
    if (tg) tg.querySelector("span").textContent = DICT[lang]["lang.switch"];

    // let pages react (e.g. re-render map list)
    document.dispatchEvent(new CustomEvent("eq:langchange", { detail: { lang: lang } }));
  }

  /* ---------- Header / Footer markup ---------- */
  var VERSION = "2.1.2";   // shown in the footer — keep in sync with package.json (smoke test enforces)
  var LOGO = '<svg class="logo" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    '<circle cx="20" cy="20" r="18" stroke="#FF4D2E" stroke-width="2.5"/>' +
    '<path d="M5 21h6l3-9 5 16 4-12 2.5 5H35" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>' +
    '</svg>';

  function headerHTML(active) {
    function link(href, key, id) {
      var on = (active === id) ? " active" : "";
      var ac = (active === id) ? ' aria-current="page"' : "";
      return '<a href="' + href + '" class="navlink' + on + '"' + ac + ' data-i18n="' + key + '"></a>';
    }
    function dropdown() {
      var ICONS = {
        prep: '<path d="M9 5H7a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-2"/><rect x="9" y="3.5" width="6" height="3" rx="1"/><path d="m8.5 13 2 2 4-4"/>',
        plan: '<circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0"/><path d="M16 5.5a3 3 0 0 1 0 5.5M21 20a6 6 0 0 0-5-5.9"/>',
        felt: '<circle cx="12" cy="12" r="1.6"/><path d="M8.5 8.5a5 5 0 0 0 0 7M15.5 8.5a5 5 0 0 1 0 7M5.6 5.6a9 9 0 0 0 0 12.8M18.4 5.6a9 9 0 0 1 0 12.8"/>',
        building: '<path d="M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6"/>',
        district: '<path d="M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
        after: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.2"/><path d="m5.5 5.5 4 4M14.5 14.5l4 4M18.5 5.5l-4 4M9.5 14.5l-4 4"/>',
        facts: '<path d="M12 3l7 3v5.5c0 4.3-3 7-7 8.5-4-1.5-7-4.2-7-8.5V6z"/><path d="m9 12 2 2 4-4"/>',
        faq: '<circle cx="12" cy="12" r="9"/><path d="M9.4 9.3a2.7 2.7 0 0 1 5.2 1c0 1.8-2.6 2.2-2.6 4"/><path d="M12 17h.01"/>',
        resources: '<path d="M6.6 3.5 9 4l1 4-2 1.2a11 11 0 0 0 5 5L14 12l4 1 .5 2.4a1.5 1.5 0 0 1-1.5 1.6A13.5 13.5 0 0 1 5 5 1.5 1.5 0 0 1 6.6 3.5z"/>',
        directory: '<path d="M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11z"/><path d="M12 6.5v5M9.5 9h5"/>',
        history: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
        glossary: '<path d="M4 19V5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zm0 0a2 2 0 0 0 2 2h13"/><path d="M9 7h6"/>'
      };
      var kids = [
        ["preparedness.html", "nav.prep", "prep", "nd.prep"],
        ["plan.html", "nav.plan", "plan", "nd.plan"],
        ["building.html", "nav.building", "building", "nd.building"],
        ["district.html", "nav.district", "district", "nd.district"],
        ["felt.html", "nav.felt", "felt", "nd.felt"],
        ["aftermath.html", "nav.after", "after", "nd.after"],
        ["facts.html", "nav.facts", "facts", "nd.facts"],
        ["faq.html", "nav.faq", "faq", "nd.faq"],
        ["resources.html", "nav.resources", "resources", "nd.resources"]
      ];
      // history + glossary now live under Insights; the hospitals directory
      // is reached from Emergency Resources — keeps this menu to one screen.
      var on = kids.some(function (k) { return k[2] === active; }) ? " active" : "";
      var items = kids.map(function (k) {
        return '<a class="dd-item' + (k[2] === active ? " active" : "") + '" href="' + k[0] + '"' + (k[2] === active ? ' aria-current="page"' : "") + '>' +
          '<span class="dd-ic" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + ICONS[k[2]] + '</svg></span>' +
          '<span class="dd-tx"><span class="dd-t" data-i18n="' + k[1] + '"></span><span class="dd-d" data-i18n="' + k[3] + '"></span></span></a>';
      }).join("");
      return '<div class="nav-item has-dropdown' + on + '">' +
        '<button class="dropdown-toggle" type="button" aria-haspopup="true" aria-expanded="false">' +
        '<span data-i18n="nav.safety"></span>' +
        '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.6" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button>' +
        '<div class="dropdown-menu">' + items + '</div></div>';
    }
    var ENUMS = [["100","es.police"],["101","es.fire"],["102","es.amb"],["103","es.traffic"],["104","es.childsearch"],["1098","es.childline"],["1113","es.policehq"],["1114","es.apf"],["1115","es.health"],["1130","es.redcross"],["1149","es.disaster"]];
    var seq = ENUMS.map(function (e) {
      return '<a href="tel:' + e[0] + '"><b data-dg="' + e[0] + '">' + e[0] + '</b> <span data-i18n="' + e[1] + '"></span></a>';
    }).join("");
    return '' +
      '<div class="emergency-strip">' +
        '<span class="es-label" data-i18n="es.label"></span>' +
        '<div class="es-marquee"><div class="es-track">' + seq + seq + '</div></div>' +
      '</div>' +
      '<div class="container nav">' +
        '<a class="brand" href="index.html">' + LOGO +
          '<span>EQ&nbsp;Sentry<small data-i18n="brand.tag"></small></span>' +
        '</a>' +
        '<nav class="nav-links" id="navLinks" aria-label="Primary" data-i18n-aria="ui.nav.aria">' +
          link("index.html", "nav.home", "home") +
          link("map.html", "nav.map", "map") +
          link("insights.html", "nav.insights", "insights") +
          dropdown() +
          link("alerts.html", "nav.alerts", "alerts") +
          link("about.html", "nav.about", "about") +
        '</nav>' +
        '<div class="nav-tools">' +
          '<button class="lang-toggle" id="themeToggle" type="button" aria-label="Toggle day or night theme" data-i18n-aria="ui.theme.aria" title="Day / night" data-i18n-title="ui.theme.t">' +
            '<svg class="ic-sun" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.4 1.4M17.6 17.6L19 19M19 5l-1.4 1.4M6.4 17.6L5 19"/></svg>' +
            '<svg class="ic-moon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.5 6.5 0 0 0 9.8 9.8z"/></svg>' +
          '</button>' +
          '<button class="lang-toggle" id="a11yToggle" type="button" aria-haspopup="true" aria-expanded="false" aria-label="Accessibility options" data-i18n-aria="a11y.open" title="Accessibility" data-i18n-title="a11y.title">' +
            '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="4" r="1.6"/><path d="M4 8h16M12 8v6m0 0-3 6m3-6 3 6"/></svg>' +
          '</button>' +
          '<button class="lang-toggle" id="langToggle" type="button" aria-label="Switch language" data-i18n-aria="ui.lang.aria">' +
            '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 2.5 15.3 0 18M12 3c-2.5 2.7-2.5 15.3 0 18"/></svg>' +
            '<span></span>' +
          '</button>' +
          '<button class="nav-toggle" id="navToggle" type="button" aria-label="Menu" data-i18n-aria="ui.menu.aria" aria-expanded="false">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M3 6h18M3 12h18M3 18h18"/></svg>' +
          '</button>' +
        '</div>' +
      '</div>';
  }

  function footerHTML() {
    return '' +
      '<div class="container">' +
        '<div class="foot-grid">' +
          '<div>' +
            '<div class="brand">' + LOGO + '<span>EQ&nbsp;Sentry</span></div>' +
            '<p data-i18n="foot.tagline" style="color:#94a3b8;max-width:34ch"></p>' +
          '</div>' +
          '<div>' +
            '<h4 data-i18n="foot.explore"></h4>' +
            '<a href="map.html" data-i18n="nav.map"></a>' +
            '<a href="insights.html" data-i18n="nav.insights"></a>' +
            '<a href="history.html" data-i18n="nav.history"></a>' +
            '<a href="glossary.html" data-i18n="nav.glossary"></a>' +
            '<a href="alerts.html" data-i18n="nav.alerts"></a>' +
            '<a href="search.html" data-i18n="nav.search"></a>' +
          '</div>' +
          '<div>' +
            '<h4 data-i18n="foot.safety"></h4>' +
            '<a href="preparedness.html" data-i18n="foot.prep"></a>' +
            '<a href="plan.html" data-i18n="nav.plan"></a>' +
            '<a href="building.html" data-i18n="nav.building"></a>' +
            '<a href="district.html" data-i18n="nav.district"></a>' +
            '<a href="aftermath.html" data-i18n="nav.after"></a>' +
            '<a href="resources.html" data-i18n="foot.resources"></a>' +
          '</div>' +
          '<div>' +
            '<h4 data-i18n="foot.data"></h4>' +
            '<a href="https://earthquake.usgs.gov/earthquakes/feed/" target="_blank" rel="noopener" data-i18n="foot.datasrc"></a>' +
            '<a href="https://www.seismicportal.eu/" target="_blank" rel="noopener" data-i18n="foot.emsc"></a>' +
            '<a href="https://www.seismonepal.gov.np/" target="_blank" rel="noopener" data-i18n="foot.seismo"></a>' +
            '<a href="status.html" data-i18n="nav.status"></a>' +
            '<a href="about.html" data-i18n="foot.about"></a>' +
          '</div>' +
          '<div>' +
            '<h4 data-i18n="foot.emergency"></h4>' +
            '<div class="foot-emergency">' +
              '<div class="big" data-i18n="foot.bignum"></div>' +
              '<div data-i18n="foot.police" style="font-size:.82rem"></div>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<p class="muted" style="font-size:.82rem;margin-top:22px" data-i18n="foot.disclaimer"></p>' +
        '<div class="foot-bottom">' +
          '<span>© <span id="year"></span> EQ Sentry · eqsentry.com — <a href="https://prashantacharya.com" target="_blank" rel="noopener" data-i18n="foot.rights"></a>' +
            '<br><span class="foot-ver" title="EQ Sentry version" data-i18n-title="ui.ver.t" data-dg="v' + VERSION + '">v' + VERSION + '</span></span>' +
          '<span><a href="privacy.html" data-i18n="foot.privacy"></a> · Data: USGS Earthquake Hazards Program</span>' +
        '</div>' +
      '</div>';
  }

  /* ---------- Live banner (latest quake near Nepal) ---------- */
  var NEPAL_BOX = { minLat: 26.0, maxLat: 31.0, minLon: 79.0, maxLon: 89.0 };
  function inNepalRegion(lon, lat) {
    return lat >= NEPAL_BOX.minLat && lat <= NEPAL_BOX.maxLat &&
           lon >= NEPAL_BOX.minLon && lon <= NEPAL_BOX.maxLon;
  }
  function fmtAgo(ms) {
    var s = Math.max(0, Date.now() - ms);
    var min = Math.floor(s / 60000);
    if (min < 1) return t("time.justnow");
    if (min < 60) return dgS(min) + " " + t("time.min") + " " + t("time.ago");
    var hr = Math.floor(min / 60);
    if (hr < 24) return dgS(hr) + " " + t("time.hr") + " " + t("time.ago");
    var d = Math.floor(hr / 24);
    return dgS(d) + " " + (d === 1 ? t("time.day") : t("time.days")) + " " + t("time.ago");
  }

  /* The live banner (#alertBar) is rendered by the shared engine (engine.js). */

  /* ---------- Motion: scroll reveal + number count-up ---------- */
  function motionOff() {
    return document.documentElement.classList.contains("reduce-motion") ||
      (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }
  function countUp(el) {
    if (el.dataset.done) return; el.dataset.done = "1";
    var target = parseFloat(el.getAttribute("data-countup"));
    if (isNaN(target)) return;
    var dec = parseInt(el.getAttribute("data-decimals") || "0", 10);
    var pre = el.getAttribute("data-prefix") || "";
    var suf = el.getAttribute("data-suffix") || "";
    function fmt(v) { return dgS(dec ? v.toFixed(dec) : Math.round(v).toLocaleString("en-US")); }
    if (motionOff()) { el.textContent = pre + fmt(target) + suf; return; }
    var dur = 1100, start = performance.now();
    function step(now) {
      var p = Math.min(1, (now - start) / dur);
      var e = 1 - Math.pow(1 - p, 3); // easeOutCubic
      el.textContent = pre + fmt(target * e) + suf;
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = pre + fmt(target) + suf;
    }
    requestAnimationFrame(step);
  }

  function initMotion() {
    var revs = [].slice.call(document.querySelectorAll(".reveal"));
    var nums = [].slice.call(document.querySelectorAll("[data-countup]"));
    if (motionOff() || !("IntersectionObserver" in window)) {
      revs.forEach(function (el) { el.classList.add("in"); });
      nums.forEach(countUp);
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add("in");
          if (en.target.hasAttribute("data-countup")) countUp(en.target);
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    revs.forEach(function (el) { io.observe(el); });
    nums.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Init ---------- */
  function init() {
    var header = document.getElementById("site-header");
    if (header) header.innerHTML = headerHTML(document.body.getAttribute("data-page"));
    var footer = document.getElementById("site-footer");
    if (footer) footer.innerHTML = footerHTML();

    var yr = document.getElementById("year");
    if (yr) { var yv = String(new Date().getFullYear()); yr.setAttribute("data-dg", yv); yr.textContent = dgS(yv); }

    var tg = document.getElementById("langToggle");
    if (tg) tg.addEventListener("click", function () {
      setLang(getLang() === "en" ? "ne" : "en");
    });

    var nt = document.getElementById("navToggle");
    if (nt) nt.addEventListener("click", function () {
      var links = document.getElementById("navLinks");
      var open = links.classList.toggle("open");
      nt.setAttribute("aria-expanded", open ? "true" : "false");
    });

    // Nav dropdown (Safety) — click/touch/keyboard toggle; hover handled by CSS
    document.querySelectorAll(".dropdown-toggle").forEach(function (b) {
      b.addEventListener("click", function () {
        var item = b.parentNode, open = item.classList.toggle("open");
        b.setAttribute("aria-expanded", open ? "true" : "false");
      });
    });
    document.addEventListener("click", function (e) {
      if (!e.target.closest(".has-dropdown")) {
        document.querySelectorAll(".nav-item.open").forEach(function (i) { i.classList.remove("open"); });
      }
    });

    // Accessibility: skip link, main landmark, text-size control
    if (!document.querySelector(".skip-link")) {
      var sk = document.createElement("a");
      sk.className = "skip-link"; sk.href = "#main"; sk.setAttribute("data-i18n", "a11y.skip"); sk.textContent = "Skip to content";
      document.body.insertBefore(sk, document.body.firstChild);
    }
    var mainEl = document.querySelector("section");
    if (mainEl && !mainEl.id) { mainEl.id = "main"; mainEl.setAttribute("tabindex", "-1"); }
    // Text size now lives in the accessibility panel (assets/js/a11y.js).

    // Day / night theme toggle
    var tt = document.getElementById("themeToggle");
    if (tt) tt.addEventListener("click", function () {
      var light = document.documentElement.classList.toggle("light");
      try { localStorage.setItem("eqsentry_theme", light ? "light" : "dark"); } catch (e) {}
      document.dispatchEvent(new CustomEvent("eq:themechange", { detail: { light: light } }));
    });

    // Back-to-top button (appears on scroll)
    if (!document.querySelector(".to-top")) {
      var bt = document.createElement("button");
      bt.className = "to-top"; bt.type = "button"; bt.setAttribute("aria-label", "Back to top");
      bt.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
      document.body.appendChild(bt);
      bt.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: "smooth" }); });
      window.addEventListener("scroll", function () { bt.classList.toggle("show", window.scrollY > 600); }, { passive: true });
    }

    apply(getLang());
    initMotion();
    // Shared live-data engine (live banner + [data-eq] elements on every page).
    // The home page loads it explicitly; elsewhere, inject it once.
    if (!window.EQEngine && !document.querySelector('script[data-eqengine]')) {
      var eng = document.createElement("script"); eng.src = "assets/js/engine.js"; eng.setAttribute("data-eqengine", "1");
      document.body.appendChild(eng);
    }

    // Accessibility panel (text size, reduce motion, high contrast, dyslexia font) — every page.
    if (!document.querySelector('script[data-eqa11y]')) {
      var a11 = document.createElement("script"); a11.src = "assets/js/a11y.js"; a11.setAttribute("data-eqa11y", "1");
      document.body.appendChild(a11);
    }

    // Client-side error monitor (ring buffer + optional backend report) — every page.
    if (!document.querySelector('script[data-eqmon]')) {
      var mon = document.createElement("script"); mon.src = "assets/js/monitor.js"; mon.setAttribute("data-eqmon", "1");
      document.body.appendChild(mon);
    }

    // "Keep going" related-content cards (no-ops on pages without a mapping).
    if (!document.querySelector('script[data-eqrel]')) {
      var rel = document.createElement("script"); rel.src = "assets/js/pages/related.js"; rel.setAttribute("data-eqrel", "1");
      document.body.appendChild(rel);
    }

    // Once the catalogue arrives, re-apply translations so {count|…}-style
    // stat tokens switch from their fallbacks to live values.
    document.addEventListener("eq:dataready", function () { apply(getLang()); });

    // Lazy-load the earthquake catalogue (~230 KB) AFTER first paint on pages that need it.
    if (document.body.hasAttribute("data-eqdata")) {
      if (window.EQ_DATA) {
        window.EQData._resolve();
      } else if (!document.querySelector('script[data-eqdatasrc]')) {
        var injectData = function () {
          var s = document.createElement("script");
          s.src = "assets/js/data-layers.js"; s.setAttribute("data-eqdatasrc", "1");
          s.onload = function () { window.EQData._resolve(); };
          s.onerror = function () { window.EQData._resolve(); };   // resolve anyway → consumers fall back to fetching geojson
          document.body.appendChild(s);
        };
        if ("requestIdleCallback" in window) requestIdleCallback(injectData, { timeout: 1500 });
        else setTimeout(injectData, 300);
      }
    }

    // PWA: inject manifest + register service worker (every page, no HTML edits)
    if (!document.querySelector('link[rel="manifest"]')) {
      var ml = document.createElement("link"); ml.rel = "manifest"; ml.href = "manifest.webmanifest"; document.head.appendChild(ml);
      var tc = document.createElement("meta"); tc.name = "theme-color"; tc.content = "#0A0C10"; document.head.appendChild(tc);
      var ai = document.createElement("link"); ai.rel = "apple-touch-icon"; ai.href = "assets/icons/icon-192.png"; document.head.appendChild(ai);
    }
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", function () { navigator.serviceWorker.register("service-worker.js").catch(function () {}); });
    }
  }

  // expose helpers for other scripts
  window.EQ = {
    getLang: getLang, setLang: setLang, t: t, dg: dgS,
    NEPAL_BOX: NEPAL_BOX, inNepalRegion: inNepalRegion, fmtAgo: fmtAgo,
    addDict: function (obj) {
      DICT.en = Object.assign(DICT.en, obj.en || {});
      DICT.ne = Object.assign(DICT.ne, obj.ne || {});
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else { init(); }
})();
/* EQ Sentry — i18n, header/footer, stats tokens, shared bootstrap */
