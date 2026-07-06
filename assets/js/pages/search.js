/* ==========================================================================
   EQ Sentry — client-side site search (search.html).
   A small hand-built index of every page/tool/section with bilingual titles
   and keyword bags (English + Nepali + common romanised Nepali). Matches all
   query words against title+keywords; renders link cards. No network needed.
   ========================================================================== */
(function () {
  "use strict";
  var box = document.getElementById("seBox"), out = document.getElementById("seResults");
  if (!box || !out) return;
  function lang() { return window.EQ ? window.EQ.getLang() : "en"; }
  function T(k) { return window.EQ ? window.EQ.t(k) : k; }

  var IX = [
    { u: "index.html", en: "Home — live readout & latest quakes", ne: "गृहपृष्ठ — प्रत्यक्ष तथ्याङ्क र पछिल्ला भूकम्प", k: "home latest recent live seismograph readout गृह पछिल्लो" },
    { u: "map.html", en: "Live earthquake map", ne: "प्रत्यक्ष भूकम्प नक्सा", k: "map live usgs emsc catalogue notable heatmap plates filter share fullscreen नक्सा प्रत्यक्ष" },
    { u: "map.html#src=notable", en: "Notable historic quakes on the map", ne: "नक्सामा ऐतिहासिक भूकम्प", k: "notable historic 1934 2015 map इतिहास" },
    { u: "insights.html", en: "Insights — charts & records", ne: "तथ्याङ्क — चार्ट र कीर्तिमान", k: "insights charts statistics data energy gutenberg richter records deepest busiest तथ्याङ्क" },
    { u: "insights.html#asPick", en: "Aftershock explorer", ne: "पराकम्प अन्वेषक", k: "aftershock sequence decay gorkha पराकम्प आफ्टरसक" },
    { u: "insights.html#magSlider", en: "Magnitude explorer & TNT equivalent", ne: "म्याग्निच्युड अन्वेषक", k: "magnitude energy tnt explorer slider म्याग्निच्युड ऊर्जा" },
    { u: "insights.html#cmpA", en: "Compare two earthquakes", ne: "दुई भूकम्प तुलना", k: "compare versus energy ratio तुलना" },
    { u: "insights.html#fiMag", en: "Will I feel it? (intensity estimator)", ne: "के मैले महसुस गर्छु?", k: "feel intensity mercalli mmi distance महसुस तीव्रता" },
    { u: "preparedness.html", en: "Preparedness guide — before, during, after", ne: "पूर्वतयारी निर्देशिका", k: "prepare preparedness before during after safety guide तयारी पूर्वतयारी" },
    { u: "preparedness.html#kit", en: "Emergency kit checklist (go-bag)", ne: "आपत्कालीन झोला सूची", k: "kit bag go-bag checklist water food torch radio झोला सामग्री" },
    { u: "preparedness.html#drillCard", en: "60-second earthquake drill", ne: "६० सेकेन्डको ड्रिल", k: "drill practice drop cover hold ड्रिल अभ्यास घोप्टिनु" },
    { u: "preparedness.html#pgGen", en: "Personalized household plan generator", ne: "व्यक्तिगत घर योजना", k: "personalized plan generator household water litres व्यक्तिगत योजना" },
    { u: "plan.html", en: "Family plan builder (saves to device)", ne: "पारिवारिक योजना", k: "family plan meeting point ice contacts blood wallet card पारिवारिक योजना सम्पर्क" },
    { u: "building.html", en: "Building safety & retrofitting", ne: "भवन सुरक्षा र रेट्रोफिट", k: "building safety retrofit masonry rcc engineer भवन घर सुरक्षा" },
    { u: "building.html#hhRooms", en: "Room-by-room hazard hunt", ne: "कोठा-कोठाको जोखिम खोज", k: "hazard hunt checklist rooms kitchen bedroom जोखिम खोज" },
    { u: "district.html", en: "District risk — quakes near you", ne: "जिल्ला जोखिम", k: "district risk zone terai hill mountain valley जिल्ला जोखिम" },
    { u: "felt.html", en: "Did you feel it? — report shaking", ne: "महसुस गर्नुभयो? — रिपोर्ट", k: "felt report intensity community महसुस रिपोर्ट" },
    { u: "aftermath.html", en: "After a quake — first 72 hours", ne: "भूकम्पपछि — पहिलो ७२ घण्टा", k: "after aftermath 72 hours gas leak injuries पछि" },
    { u: "facts.html", en: "Facts vs rumors — myth busting", ne: "तथ्य बनाम अफवाह", k: "facts rumors myths prediction animals weather अफवाह तथ्य" },
    { u: "faq.html", en: "FAQ — common questions", ne: "प्रश्नोत्तर", k: "faq questions answers prediction why nepal प्रश्न" },
    { u: "glossary.html", en: "Glossary — earthquake terms", ne: "शब्दावली", k: "glossary terms magnitude intensity epicentre liquefaction शब्दावली अर्थ" },
    { u: "history.html", en: "1934 & 2015 — Nepal's great earthquakes", ne: "१९३४ र २०१५ — महाभूकम्प", k: "history 1934 bihar 2015 gorkha dharahara langtang timeline इतिहास गोरखा" },
    { u: "resources.html", en: "Emergency numbers & agencies", ne: "आपत्कालीन नम्बर र निकाय", k: "emergency numbers 100 102 1149 police ambulance neoc red cross नम्बर आपत्कालीन" },
    { u: "directory.html", en: "Hospitals & embassies directory", ne: "अस्पताल र दूतावास", k: "hospital embassy directory province phone अस्पताल दूतावास" },
    { u: "alerts.html", en: "Get alerts — browser & registration", ne: "सूचना दर्ता", k: "alerts notify push browser sms register सूचना दर्ता" },
    { u: "school-plan.html", en: "School & office plan template (printable)", ne: "विद्यालय/कार्यालय योजना टेम्प्लेट", k: "school office template print drill roles विद्यालय कार्यालय टेम्प्लेट" },
    { u: "insights.html#chartEnergy", en: "Download the earthquake data (CSV/GeoJSON)", ne: "भूकम्प तथ्याङ्क डाउनलोड", k: "download csv geojson data open डाउनलोड" },
    { u: "status.html", en: "Site status — health of data connections", ne: "साइट स्थिति — डेटा जडानको स्वास्थ्य", k: "status health uptime usgs emsc connection online offline स्थिति जडान" },
    { u: "about.html", en: "About EQ Sentry — mission & data sources", ne: "हाम्रोबारे — उद्देश्य र स्रोत", k: "about mission sources usgs contact disclaimer हाम्रोबारे" },
    { u: "privacy.html", en: "Privacy policy", ne: "गोपनीयता नीति", k: "privacy data policy गोपनीयता" }
  ];

  function card(e) {
    return '<a class="card" href="' + e.u + '" style="padding:14px 18px;display:flex;justify-content:space-between;gap:12px;align-items:center">' +
      '<span style="font-weight:600;color:var(--ink)">' + (lang() === "ne" ? e.ne : e.en) + "</span>" +
      '<span class="card-arrow">→</span></a>';
  }
  function render() {
    var q = box.value.toLowerCase().trim();
    var lbl = document.getElementById("seLabel");
    if (lbl) lbl.style.display = q ? "none" : "block";
    var hits = !q ? IX : IX.filter(function (e) {
      var hay = (e.en + " " + e.ne + " " + e.k).toLowerCase();
      return q.split(/\s+/).every(function (w) { return hay.indexOf(w) >= 0; });
    });
    out.innerHTML = hits.map(card).join("");
    var none = document.getElementById("seNone");
    if (none) none.style.display = hits.length ? "none" : "block";
  }

  box.addEventListener("input", render);
  render();
  document.addEventListener("eq:langchange", render);
})();
