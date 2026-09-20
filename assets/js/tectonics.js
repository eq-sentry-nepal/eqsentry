/* Shared Gorkha earthquake story. The views are schematic, not a physical solver.
   Animate only while visible; stage buttons remain usable without motion. */
(function () {
  "use strict";
  var stories = document.querySelectorAll(".quake-story");
  if (!stories.length) return;
  var copy = {
  "en": {
    "unbrokenGround": "Unbroken ground surface",
    "event": "25 APR 2015 · GORKHA, NEPAL",
    "title": "An earthquake beneath the Himalaya",
    "magnitude": "Mw 7.8",
    "play": "Play sequence",
    "pause": "Pause",
    "resume": "Continue",
    "replay": "Replay",
    "next": "Next stage",
    "controls": "Explore the earthquake stages",
    "stage1": "Convergence",
    "stage2": "Fault locking",
    "stage3": "Elastic strain",
    "stage4": "Sudden slip",
    "phase1": "India moves beneath the Himalaya",
    "phase2": "Friction holds the contact together",
    "phase3": "The rock slowly changes shape",
    "phase4": "A buried patch suddenly slips",
    "body1": "The Indian plate moves north beneath the Himalayan crust. Across Nepal, this slow convergence is roughly 2 cm per year.",
    "body2": "A locked patch does not slip: rock directly above and below that contact stays joined. Deeper plate motion continues, loading the surrounding crust.",
    "body3": "Continued convergence bends and compresses rock around the locked fault. This elastic deformation stores energy while the contact still does not slip.",
    "body4": "On 25 April 2015, part of the locked Main Himalayan Thrust began to slip. Across that patch, the upper Himalayan rock moved southward and up the fault relative to the Indian plate.",
    "note": "Schematic views. Geometry, movement and time are simplified; the sequence is slowed for clarity.",
    "source": "Science: USGS",
    "motion": "Reduced motion: select a stage to explore.",
    "legendFault": "Fault slip",
    "legendWave": "Seismic waves",
    "legendLocked": "Locked fault",
    "stageLabel": "Stage",
    "sectionTitle": "Beneath the Himalaya",
    "sectionDesc": "South-to-north section: the Indian plate moves beneath the Himalayan crust along the gently dipping Main Himalayan Thrust. The 2015 slip was buried below an unbroken surface.",
    "sectionView": "SOUTH–NORTH · CROSS-SECTION",
    "south": "SOUTH · INDIA",
    "north": "NORTH · TIBET",
    "himalaya": "Himalaya",
    "upperPlate": "Himalayan crust",
    "lowerPlate": "Indian plate",
    "convergence": "~2 cm/yr convergence",
    "fault": "Main Himalayan Thrust",
    "buried": "Buried slip zone",
    "locked": "Shallow fault stayed locked",
    "mapTitle": "The rupture spread east",
    "mapDesc": "Simplified map of central Nepal, north up. A buried rupture spread mainly east from near Gorkha toward and north of Kathmandu. Pale rings represent seismic waves, distinct from orange fault slip.",
    "mapView": "RUPTURE FOOTPRINT · MAP VIEW",
    "mapNorth": "N",
    "gorkha": "Gorkha",
    "kathmandu": "Kathmandu",
    "eastward": "Rupture spread east →",
    "nepal": "CENTRAL NEPAL",
    "extent": "About 150 km long",
    "detail1": "The Main Himalayan Thrust is the gently north-dipping fault between the two rock masses. The rate describes horizontal convergence across the Himalaya, not how fast mountain peaks rise.",
    "watch1": "Follow the northward motion of the deeper Indian plate in the south–north section.",
    "scale1": "Ongoing plate motion, measured over years.",
    "detail2": "Locked does not mean that the entire plate has stopped moving. Friction prevents relative sliding at the locked contact while the rock around it deforms.",
    "watch2": "Watch the paired points at the locked contact stay together even as motion continues farther away.",
    "scale2": "Long intervals between major slips; the duration varies.",
    "detail3": "Strain is a change in shape; stress describes the forces acting per unit area within the rock. The exaggerated distortion shows gradual loading, not a measured strain value or a countdown to an earthquake. Real faults do not fail on a predictable schedule.",
    "watch3": "Compare the moving rock markers with their hollow starting positions; the surrounding rock deforms without sliding across the lock.",
    "scale3": "Years to centuries of loading are compressed into this stage.",
    "detail4": "Elastic rebound relieved part of the stored deformation and left a permanent offset across the fault. It did not remove all stress or lift the whole mountain range uniformly. The 2015 rupture stayed underground and did not reach the surface.",
    "watch4": "In the close-up, the upper marker shifts south and up relative to the lower one; the two sides remain in contact.",
    "scale4": "Rapid slip at one point lasts seconds and is slowed here.",
    "stage5": "Rupture & shaking",
    "phase5": "The rupture spreads; waves race ahead",
    "body5": "The 2015 rupture spread mainly east from near Gorkha toward and north of Kathmandu. Seismic waves were already travelling outward while more of the fault was still slipping.",
    "detail5": "The rupture front marks where rapid fault slip is beginning; wave fronts carry the disturbance through the rock and can travel ahead of it. The map shows eastward rupture growth, while the south–north section shows local thrust motion. Shaking extends beyond the fault area that slipped.",
    "watch5": "Follow the advancing orange rupture on the map and the faster outward wave rings; they represent different motions.",
    "scale5": "Rupture spreads over tens of seconds; shaking duration varies by location.",
    "stage6": "Aftermath",
    "phase6": "The mainshock ends; risk remains",
    "body6": "The 2015 earthquake released only part of the stored strain, and the shallow fault farther south did not rupture. Damaging aftershocks followed as the surrounding fault system adjusted.",
    "detail6": "Some rock stays permanently displaced, while slower deformation can continue after the mainshock. Unruptured fault areas and ongoing plate convergence preserve the long-term hazard. This sequence cannot predict when or where another earthquake will occur.",
    "watch6": "The slipped patch keeps its offset; the shallow locked section remains highlighted after the main waves fade.",
    "scale6": "Aftershocks and adjustment continue beyond the mainshock; tectonic loading continues for years.",
    "zoomTitle": "At the fault: watch the rock move",
    "zoomNote": "Movement is exaggerated in a fixed frame; hollow markers show initial positions.",
    "mechanicalUpper": "Himalayan crust",
    "mechanicalLower": "Indian plate",
    "mechanicalLock": "Locked contact",
    "mechanicalSlip": "Relative fault slip",
    "reference": "Initial position",
    "moving": "Moving rock",
    "detailHeading": "What is happening",
    "watchHeading": "What to watch",
    "timeHeading": "Time scale",
    "scrub": "Explore the sequence",
    "speed": "Playback speed",
    "previous": "Previous stage",
    "forward": "Next stage",
    "overview": "From slow collision to sudden slip",
    "timelineNote": "Years of loading and seconds of rupture use different playback time scales.",
    "mechanicalTitle": "Magnified view of a buried thrust fault",
    "mechanicalDesc": "The material grid and embedded rocks move within a fixed view. Paired points stay aligned while locked, then offset along the fault during slip. Hollow circles mark the starting positions. Deformation is exaggerated and is not a quantitative model."
  },
  "ne": {
    "unbrokenGround": "नफुटेको जमिनको सतह",
    "event": "२५ अप्रिल २०१५ · गोरखा, नेपाल",
    "title": "हिमालयमुनिको भूकम्प",
    "magnitude": "Mw ७.८",
    "play": "क्रम हेर्नुहोस्",
    "pause": "रोक्नुहोस्",
    "resume": "जारी राख्नुहोस्",
    "replay": "फेरि हेर्नुहोस्",
    "next": "अर्को चरण",
    "controls": "भूकम्पका चरणहरू हेर्नुहोस्",
    "stage1": "अभिसरण",
    "stage2": "भ्रंश अड्किन्छ",
    "stage3": "प्रत्यास्थ विकृति",
    "stage4": "अचानक चिप्लाइ",
    "phase1": "भारतीय प्लेट हिमालयमुनि सर्छ",
    "phase2": "घर्षणले सम्पर्क सतहलाई अड्काउँछ",
    "phase3": "चट्टानको आकार बिस्तारै बदलिन्छ",
    "phase4": "जमिनमुनिको भाग अचानक चिप्लिन्छ",
    "body1": "भारतीय प्लेट उत्तरतिर हिमालयको भू-पर्पटीमुनि सर्छ। नेपालमा हिमालय वारपार हुने यो सुस्त अभिसरणको दर वर्षमा करिब २ से.मी. छ।",
    "body2": "अड्किएको भाग चिप्लिँदैन: सम्पर्क सतहको ठीक माथि र तलका चट्टान सँगै अड्किएका हुन्छन्। गहिराइमा प्लेटको चाल जारी रहँदा वरपरको भू-पर्पटीमा तनाव बढ्छ।",
    "body3": "अभिसरण जारी रहँदा अड्किएको भ्रंश वरपरका चट्टान बाङ्गिन्छन् र खुम्चिन्छन्। सम्पर्क सतह नचिप्लिए पनि यस प्रत्यास्थ विकृतिले ऊर्जा सञ्चित गर्छ।",
    "body4": "२५ अप्रिल २०१५ मा अड्किएको मुख्य हिमालयन थ्रस्टको केही भाग चिप्लिन थाल्यो। त्यस भागमा माथिल्लो हिमालयी चट्टान भारतीय प्लेटको तुलनामा भ्रंशको ढलान हुँदै दक्षिणतिर र माथितिर सर्‍यो।",
    "note": "सरलीकृत दृश्य। आकार, चाल र समय वास्तविक मापनमा छैनन्; बुझ्न सजिलो बनाउन क्रम सुस्त पारिएको छ।",
    "source": "वैज्ञानिक स्रोत: USGS",
    "motion": "कम चाल: हेर्नका लागि चरण छान्नुहोस्।",
    "legendFault": "भ्रंशको चिप्लाइ",
    "legendWave": "भूकम्पीय तरङ्ग",
    "legendLocked": "अड्किएको भ्रंश",
    "stageLabel": "चरण",
    "sectionTitle": "हिमालयमुनि",
    "sectionDesc": "दक्षिणबाट उत्तरतिरको काटिएको दृश्य: भारतीय प्लेट कम ढलान भएको मुख्य हिमालयन थ्रस्ट हुँदै हिमालयमुनि सर्छ। २०१५ मा चिप्लिएको क्षेत्र नफुटेको सतहमुनि थियो।",
    "sectionView": "दक्षिण–उत्तर · काटिएको दृश्य",
    "south": "दक्षिण · भारत",
    "north": "उत्तर · तिब्बत",
    "himalaya": "हिमालय",
    "upperPlate": "हिमालयको भू-पर्पटी",
    "lowerPlate": "भारतीय प्लेट",
    "convergence": "~२ से.मी./वर्ष अभिसरण",
    "fault": "मुख्य हिमालयन थ्रस्ट",
    "buried": "जमिनमुनि चिप्लिएको क्षेत्र",
    "locked": "उथलो भ्रंश अड्किएकै रह्यो",
    "mapTitle": "भ्रंशको चिप्लाइ पूर्वतिर फैलियो",
    "mapDesc": "मध्य नेपालको सरलीकृत नक्सा, उत्तर माथि। गोरखानजिकबाट जमिनमुनि सुरु भएको चिप्लाइ मुख्यतः पूर्वतिर, काठमाडौँतर्फ र त्यसको उत्तरमा फैलियो। हल्का घेराले भूकम्पीय तरङ्ग र सुन्तला रङले चिप्लिएको क्षेत्र देखाउँछन्।",
    "mapView": "चिप्लिएको क्षेत्र · नक्सा",
    "mapNorth": "उ",
    "gorkha": "गोरखा",
    "kathmandu": "काठमाडौँ",
    "eastward": "चिप्लाइ पूर्वतिर फैलियो →",
    "nepal": "मध्य नेपाल",
    "extent": "करिब १५० कि.मी. लामो",
    "detail1": "मुख्य हिमालयन थ्रस्ट दुई चट्टानी खण्डबीच रहेको, उत्तरतिर कम ढल्किएको भ्रंश हो। यो दरले हिमालय वारपारको तेर्सो अभिसरण जनाउँछ, हिमालका चुचुरा अग्लिने गति होइन।",
    "watch1": "दक्षिण–उत्तर काटिएको दृश्यमा गहिराइमा रहेको भारतीय प्लेटको उत्तरतिरको चाल हेर्नुहोस्।",
    "scale1": "प्लेटको चाल निरन्तर हुन्छ र वर्षौँको मापनबाट बुझिन्छ।",
    "detail2": "अड्किनुको अर्थ पूरै प्लेटको चाल रोकिनु होइन। घर्षणले अड्किएको सम्पर्क सतहमा सापेक्ष चिप्लाइ रोक्छ, तर वरपरका चट्टानको आकार बदलिन्छ।",
    "watch2": "टाढाको भाग चलिरहँदा पनि अड्किएको सम्पर्क सतहका दुई बिन्दु एकअर्काबाट नचिप्लिएको हेर्नुहोस्।",
    "scale2": "ठूला चिप्लाइबीच लामो अन्तराल हुन्छ; यसको अवधि निश्चित हुँदैन।",
    "detail3": "विकृति भनेको आकारमा परिवर्तन हो; तनावले चट्टानभित्र प्रति एकाइ क्षेत्रफलमा लाग्ने बल जनाउँछ। बढाएर देखाइएको विकृतिले बिस्तारै बढ्दो भार बुझाउँछ, मापन गरिएको विकृति वा भूकम्प आउन बाँकी समय होइन। वास्तविक भ्रंश कहिले चिप्लिन्छ भन्ने निश्चित तालिका हुँदैन।",
    "watch3": "चलिरहेका चट्टानका चिह्नलाई सुरुको स्थान जनाउने खाली चिह्नसँग तुलना गर्नुहोस्; अड्किएको सतह नचिप्लिई वरपरको चट्टान विकृत हुन्छ।",
    "scale3": "वर्षौँदेखि शताब्दीसम्मको भार सञ्चय यहाँ छोटो समयमा देखाइएको छ।",
    "detail4": "प्रत्यास्थ प्रत्यागमनले सञ्चित विकृतिको केही भाग घटायो र भ्रंशका दुई पाटाबीच स्थायी सापेक्ष विस्थापन छोड्यो। यसले सबै तनाव हटाएन वा पूरै हिमशृङ्खला समान रूपमा उचालेन। २०१५ को भ्रंश चिप्लाइ जमिनमुनि नै सीमित रह्यो र सतहसम्म पुगेन।",
    "watch4": "नजिकको दृश्यमा माथिल्लो चिह्न तल्लो चिह्नको तुलनामा दक्षिण र माथितिर सर्छ; दुई पाटा सम्पर्कमै रहन्छन्।",
    "scale4": "एउटा बिन्दुको तीव्र चिप्लाइ सेकेन्डमा हुन्छ; यहाँ सुस्त पारिएको छ।",
    "stage5": "चिप्लाइ र कम्पन",
    "phase5": "चिप्लाइ फैलिन्छ; तरङ्ग अगाडि पुग्छन्",
    "body5": "२०१५ को चिप्लाइ गोरखानजिकबाट मुख्यतः पूर्वतिर, काठमाडौँतर्फ र त्यसको उत्तरमा फैलियो। भ्रंशका थप भाग चिप्लिँदै गर्दा नै भूकम्पीय तरङ्गहरू बाहिरतिर फैलिरहेका थिए।",
    "detail5": "चिप्लाइको अग्रभागले भ्रंशमा तीव्र चिप्लाइ सुरु भइरहेको स्थान देखाउँछ; तरङ्गका अग्रभागले चट्टानमा कम्पन पुर्‍याउँछन् र त्यसभन्दा अगाडि पुग्न सक्छन्। नक्साले पूर्वतिर फैलिएको चिप्लाइ देखाउँछ, जबकि दक्षिण–उत्तर काटिएको दृश्यले स्थानीय थ्रस्ट चाल देखाउँछ। जमिन चिप्लिएको भ्रंशको क्षेत्रभन्दा धेरै टाढासम्म हल्लिन्छ।",
    "watch5": "नक्सामा अघि बढ्ने सुन्तला चिप्लाइ र त्यसभन्दा छिटो बाहिर फैलिने तरङ्गका घेरा हेर्नुहोस्; यी फरक चाल हुन्।",
    "scale5": "चिप्लाइ फैलिन दशौँ सेकेन्ड लाग्छ; जमिन हल्लिने अवधि ठाउँअनुसार फरक हुन्छ।",
    "stage6": "मुख्य धक्कापछि",
    "phase6": "मुख्य धक्का सकिए पनि जोखिम बाँकी रहन्छ",
    "body6": "२०१५ को भूकम्पले सञ्चित विकृतिको केही भाग मात्र मुक्त गर्‍यो र दक्षिणतिरको उथलो भ्रंश चिप्लिएन। वरपरको भ्रंश प्रणाली समायोजन हुँदै गर्दा विनाशकारी परकम्पहरू आए।",
    "detail6": "केही चट्टान स्थायी रूपमा सरेकै अवस्थामा रहन्छन्, र मुख्य धक्कापछि पनि सुस्त विकृति जारी रहन सक्छ। नचिप्लिएका भ्रंशका भाग र निरन्तर प्लेट अभिसरणले दीर्घकालीन जोखिम कायम राख्छन्। यस क्रमले अर्को भूकम्प कहिले वा कहाँ आउँछ भन्ने भविष्यवाणी गर्न सक्दैन।",
    "watch6": "चिप्लिएको भागको विस्थापन कायम रहन्छ; मुख्य तरङ्ग हराएपछि पनि उथलो अड्किएको भाग स्पष्ट देखिन्छ।",
    "scale6": "मुख्य धक्कापछि परकम्प र समायोजन जारी रहन्छन्; प्लेटको चालले वर्षौँसम्म भार थपिरहन्छ।",
    "zoomTitle": "भ्रंशनजिक: चट्टानको चाल हेर्नुहोस्",
    "zoomNote": "स्थिर दृश्यमा चाल बढाएर देखाइएको छ; खाली चिह्नले सुरुको स्थान जनाउँछन्।",
    "mechanicalUpper": "हिमालयको भू-पर्पटी",
    "mechanicalLower": "भारतीय प्लेट",
    "mechanicalLock": "अड्किएको सम्पर्क सतह",
    "mechanicalSlip": "भ्रंशको सापेक्ष चिप्लाइ",
    "reference": "सुरुको स्थान",
    "moving": "चलिरहेको चट्टान",
    "detailHeading": "के भइरहेको छ",
    "watchHeading": "के हेर्ने",
    "timeHeading": "समय मापन",
    "scrub": "क्रमका चरणहरू हेर्नुहोस्",
    "speed": "देखाउने गति",
    "previous": "अघिल्लो चरण",
    "forward": "अर्को चरण",
    "overview": "सुस्त टक्करदेखि अचानक चिप्लाइसम्म",
    "timelineNote": "वर्षौँको भार सञ्चय र सेकेन्डको चिप्लाइ फरक समयगत गतिमा देखाइएको छ।",
    "mechanicalTitle": "जमिनमुनिको थ्रस्ट भ्रंशको नजिकको दृश्य",
    "mechanicalDesc": "स्थिर दृश्यभित्र चट्टानका जाली र चिन्हहरू सर्छन्। अड्किएको अवस्थामा जोडी बिन्दुहरू सँगै रहन्छन्; चिप्लिँदा भ्रंशको दिशामा छुट्टिन्छन्। खाली घेराले सुरुका स्थान देखाउँछन्। विकृति बढाइचढाइ देखाइएको छ; यो परिमाणात्मक मोडेल होइन।"
  }
};
  var model = window.EQTectonicModel, durations = model.durations, total = model.total;
  var motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  function reduced() {
    if (window.EQ_A11Y && window.EQ_A11Y.motionOff) return window.EQ_A11Y.motionOff();
    return motionQuery.matches || document.documentElement.classList.contains("reduce-motion");
  }
  function set(el, key, value) { if (el) el.setAttribute(key, String(value)); }
  function move(el, x, y) { set(el, "transform", "translate(" + x.toFixed(2) + " " + y.toFixed(2) + ")"); }
  stories.forEach(function (root) {
    var elapsed = 0, requested = false, seen = false, visible = false, raf = 0, last = 0, stage = -1, speed = 1;
    var buttons = Array.from(root.querySelectorAll(".qs-play")), steps = Array.from(root.querySelectorAll(".qs-step"));
    var phase = root.querySelector(".qs-phase"), body = root.querySelector(".qs-body"), progress = root.querySelector(".qs-progress-fill");
    var detail = root.querySelector(".qs-detail-body"), watch = root.querySelector(".qs-watch"), scale = root.querySelector(".qs-time-scale");
    var scrub = root.querySelector(".qs-scrub"), speedSelect = root.querySelector(".qs-speed"), counter = root.querySelector(".qs-counter");
    var status = root.querySelector(".qs-status"), warning = root.querySelector(".qs-motion-note");
    var shear = root.querySelector(".qs-shear"), strain = root.querySelector(".qs-strain-lines"), slip = root.querySelector(".qs-slip"), mapSlip = root.querySelector(".qs-map-slip");
    var source = root.querySelector(".qs-source"), front = root.querySelector(".qs-front"), mapPatch = root.querySelector(".qs-map-patch");
    var stress = root.querySelector(".qs-stress"), arrows = root.querySelector(".qs-convergence");
    var waves = Array.from(root.querySelectorAll(".qs-wave")), mapWaves = Array.from(root.querySelectorAll(".qs-map-wave"));
    var mesh = Array.from(root.querySelectorAll(".qs-mech-line")), rocks = Array.from(root.querySelectorAll(".qs-rock-marker"));
    var rows = Array.from(root.querySelectorAll(".qs-mech-row"));
    var mainRocks = Array.from(root.querySelectorAll(".qs-main-marker"));
    var trackUpper = root.querySelector(".qs-track-upper"), trackLower = root.querySelector(".qs-track-lower");
    var locked = root.querySelector(".qs-lock-teeth"), mechanicalSlip = root.querySelector(".qs-mech-slip");
    var pathLength = mapSlip.getTotalLength(), text;
    function dg(value) { return window.EQ ? window.EQ.dg(value) : String(value); }
    function language() {
      text = copy[window.EQ && window.EQ.getLang() === "ne" ? "ne" : "en"];
      root.querySelectorAll("[data-qs-text]").forEach(function (el) {
        var key = el.getAttribute("data-qs-text");
        if (text[key]) el.textContent = text[key];
      });
      set(root.querySelector(".qs-steps"), "aria-label", text.controls);
      set(scrub, "aria-label", text.scrub); set(speedSelect, "aria-label", text.speed);
      steps.forEach(function (el, i) { set(el, "aria-label", text.stageLabel + " " + dg(i + 1) + ": " + text["stage" + (i + 1)]); });
      stage = -1; draw(); controls();
    }
    function controls() {
      buttons.forEach(function (b) { b.textContent = text[reduced() ? "next" : requested ? "pause" : elapsed >= total ? "replay" : elapsed > 0 ? "resume" : "play"]; });
      warning.hidden = !reduced();
      root.dataset.playing = String(requested && visible && !document.hidden && !reduced());
      root.querySelector(".qs-prev").disabled = stage === 0;
      root.querySelector(".qs-next").disabled = stage === 5;
    }
    function mechanics(state) {
      mesh.forEach(function (line) {
        var x = Number(line.dataset.x), side = line.dataset.side, points = [];
        // Material grid deforms continuously inside each block. The jump at
        // the contact appears only when the buried patch actually slips.
        for (var y = -90; y <= 460; y += 20) {
          var d = model.offset(side, x, y, state);
          points.push((points.length ? "L" : "M") + (x + d.x).toFixed(2) + " " + (y + d.y).toFixed(2));
        }
        set(line, "d", points.join(" "));
      });
      rocks.forEach(function (rock) {
        var x = Number(rock.dataset.x), y = Number(rock.dataset.y), d = model.offset(rock.dataset.side, x, y, state);
        move(rock, x + d.x, y + d.y);
      });
      rows.forEach(function (row) {
        var y = Number(row.dataset.y), side = row.dataset.side, points = [];
        for (var x = -100; x <= 1000; x += 30) {
          var d = model.offset(side, x, y, state);
          points.push((points.length ? "L" : "M") + (x + d.x).toFixed(2) + " " + (y + d.y).toFixed(2));
        }
        set(row, "d", points.join(" "));
      });
      [trackUpper, trackLower].forEach(function (el, i) {
        var x = 440, contact = 135 + .13 * x, d = model.offset(i ? "lower" : "upper", x, contact, state);
        move(el, x + d.x, contact + (i ? 14 : -14) + d.y);
      });
      set(locked, "opacity", 1 - state.slip);
      set(mechanicalSlip, "opacity", state.slip);
      set(root.querySelector(".qs-mech-lock-label"), "opacity", 1 - state.slip);
      set(root.querySelector(".qs-mech-slip-label"), "opacity", state.slip);
      mainRocks.forEach(function (el) {
        var x = Number(el.dataset.x), y = Number(el.dataset.y);
        var dx = el.dataset.side === "lower" ? 32 * state.loading : 9 * state.loading - 19 * state.slip;
        move(el, x + dx, y + .13 * dx);
      });
      root.querySelector(".qs-contact-state").textContent = text[state.slip > .05 ? "mechanicalSlip" : "mechanicalLock"];
    }
    function draw() {
      var state = model.sample(elapsed), moved = state.slip;
      if (stage !== state.stage) {
        stage = state.stage; root.dataset.stage = String(stage);
        steps.forEach(function (el, i) { set(el, "aria-pressed", i === stage); });
        phase.textContent = text["phase" + (stage + 1)]; body.textContent = text["body" + (stage + 1)];
        detail.textContent = text["detail" + (stage + 1)]; watch.textContent = text["watch" + (stage + 1)]; scale.textContent = text["scale" + (stage + 1)];
        counter.textContent = dg(stage + 1) + " / " + dg(6);
        controls();
      }
      var ratio = elapsed / total;
      progress.style.width = (ratio * 100).toFixed(2) + "%";
      scrub.value = Math.round(ratio * 1000);
      set(scrub, "aria-valuetext", text.stageLabel + " " + dg(stage + 1) + ": " + text["stage" + (stage + 1)]);
      mechanics(state);
      set(shear, "opacity", moved); move(shear, -7 * moved, -2 * moved);
      set(strain, "stroke-opacity", .16 + .45 * state.strain);
      set(slip, "stroke-dashoffset", 0); set(slip, "opacity", moved);
      var spreading = Math.max(0, Math.min(1, (elapsed - 26000) / 15000));
      set(mapSlip, "stroke-dashoffset", 1 - spreading); set(mapSlip, "opacity", spreading > 0 ? 1 : 0);
      set(stress, "opacity", .15 + .85 * state.strain);
      move(arrows, 18 * state.loading, 0);
      // The complete footprint is context only. Only the advancing orange
      // stroke denotes slipped fault, so no area lights up ahead of rupture.
      set(source, "opacity", moved > 0 ? 1 : 0); set(mapPatch, "opacity", .25);
      var point = mapSlip.getPointAtLength(pathLength * spreading);
      set(front, "cx", point.x); set(front, "cy", point.y); set(front, "opacity", (stage === 3 || stage === 4) && spreading < 1 ? 1 : 0);
      var waveTime = elapsed - 26000;
      [waves, mapWaves].forEach(function (list, view) {
        list.forEach(function (wave, i) {
          var t = waveTime - i * 1200, cycle = t < 0 ? -1 : (t % 6000) / 6000;
          var active = (stage === 3 || stage === 4) && cycle >= 0;
          set(wave, "r", active ? 8 + cycle * (view ? 600 : 680) : 0);
          set(wave, "opacity", active ? (1 - cycle) * .65 : 0);
        });
      });
    }
    function stopFrame() { cancelAnimationFrame(raf); raf = 0; last = 0; }
    function sync() {
      stopFrame(); controls();
      if (requested && visible && !document.hidden && !reduced()) raf = requestAnimationFrame(tick);
    }
    function tick(now) {
      if (last) elapsed = Math.min(total, elapsed + Math.min(now - last, 100) * speed);
      last = now; draw();
      if (elapsed >= total) { requested = false; sync(); }
      else raf = requestAnimationFrame(tick);
    }
    function seek(time, announce) {
      requested = false; seen = true; elapsed = Math.max(0, Math.min(total, time));
      draw(); sync();
      if (announce) status.textContent = text["phase" + (stage + 1)] + ". " + text["body" + (stage + 1)];
    }
    function select(index) {
      index = Math.max(0, Math.min(5, index));
      seek(durations.slice(0, index).reduce(function (sum, n) { return sum + n; }, 0) + durations[index] * .52, true);
    }
    steps.forEach(function (el, index) { el.addEventListener("click", function () { select(index); }); });
    buttons.forEach(function (button) { button.addEventListener("click", function () {
      seen = true;
      if (reduced()) { select((stage + 1) % 6); return; }
      if (elapsed >= total) elapsed = 0;
      requested = !requested; draw(); sync();
    }); });
    root.querySelector(".qs-prev").addEventListener("click", function () { select(stage - 1); });
    root.querySelector(".qs-next").addEventListener("click", function () { select(stage + 1); });
    scrub.addEventListener("input", function () { seek(Number(scrub.value) / 1000 * total, false); });
    scrub.addEventListener("change", function () { status.textContent = text["phase" + (stage + 1)]; });
    speedSelect.addEventListener("change", function () { speed = Number(speedSelect.value); });
    document.addEventListener("eq:langchange", language);
    document.addEventListener("visibilitychange", sync);
    function motionChanged() { if (reduced()) requested = false; sync(); }
    motionQuery.addEventListener("change", motionChanged);
    document.addEventListener("eq:motionchange", motionChanged);
    new MutationObserver(motionChanged).observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    language();
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (visible && !seen) { seen = true; requested = !reduced(); }
        sync();
      }, { threshold: 0 }).observe(root);
    } else { visible = true; sync(); }
  });
})();
