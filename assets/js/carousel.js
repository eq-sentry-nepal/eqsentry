/* ==========================================================================
   EQ Sentry — reusable image carousel component.
   Turns a hidden source list into a horizontal row of numbered image-cards
   with prev/next controls. Used by the before/during/after rows and any other
   "slide through steps with pictures" section across the site.

   MARKUP (per carousel):
     <div class="phase-row before">                         <!-- before|during|after = heading accent color (optional) -->
       <div class="phase-head">
         <span class="tag" data-i18n="...">Before</span>     <!-- prominent pill -->
         <h3 data-i18n="...">Heading</h3>                    <!-- prominent title -->
       </div>

       <!-- SOURCE: hidden list of cards. Each <li> = one card.
            Put the title in <b>…</b>, the rest is the description.
            Content can be static or come from i18n (data-i18n-html). -->
       <ul class="phase-src" data-phase="before" data-i18n-html="prep.before.list" hidden></ul>

       <!-- TRACK -->
       <div class="phase-carousel-wrap">
         <button type="button" class="pc-arrow pc-prev" data-target="before" aria-label="Scroll left">‹</button>
         <div class="phase-carousel" id="pc-before"></div>
         <button type="button" class="pc-arrow pc-next" data-target="before" aria-label="Scroll right">›</button>
       </div>
     </div>

   REAL IMAGES: add data-imgs to the .phase-src with one URL per card, in order,
   separated by "|".  Missing/blank entries fall back to the labelled placeholder.
     <ul class="phase-src" data-phase="before"
         data-imgs="assets/img/before-1.jpg | assets/img/before-2.jpg | …" …></ul>

   The track id MUST be "pc-" + the source's data-phase, and arrows point at it
   via data-target. The component rebuilds on the eq:langchange event so cards
   stay in sync when the user switches language.
   ========================================================================== */
(function () {
  "use strict";

  /* Neutral "image goes here" placeholder (swapped out once real images are supplied). */
  function placeholder(n) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">' +
      '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.7"/><path d="M21 15l-5-5-8 8"/></svg>' +
      '<span class="phase-card-num">' + n + '</span>';
  }

  function media(url, n, art) {
    if (url) {
      return '<img src="' + url + '" alt="" loading="lazy" decoding="async">' +
        '<span class="phase-card-num">' + n + '</span>';
    }
    if (art) return artCard(art, n);
    return placeholder(n);
  }


  /* ---------- Illustrated pictograms (flat style, site palette) ---------- */
  var GND = '<line x1="16" y1="142" x2="204" y2="142" stroke="var(--line-2)" stroke-width="4" stroke-linecap="round"/>';
  function fig(x, y) {   // small accent person: head + torso
    return '<circle cx="' + x + '" cy="' + (y - 26) + '" r="10" fill="var(--accent)"/>' +
      '<path d="M' + x + ' ' + (y - 14) + 'V' + (y + 14) + '" stroke="var(--accent)" stroke-width="12" stroke-linecap="round"/>';
  }
  var ART = {
    anchor: '<line x1="152" y1="30" x2="152" y2="142" stroke="var(--ink-faint)" stroke-width="6"/><rect x="72" y="50" width="56" height="92" rx="5" fill="var(--ink-faint)"/><line x1="80" y1="96" x2="120" y2="96" stroke="var(--surface,#111)" stroke-width="3"/><path d="M128 62L152 48M128 78L152 64" stroke="var(--accent)" stroke-width="7" stroke-linecap="round"/>',
    safespot: '<rect x="52" y="66" width="116" height="10" rx="5" fill="var(--ink-faint)"/><line x1="64" y1="76" x2="64" y2="140" stroke="var(--ink-faint)" stroke-width="9" stroke-linecap="round"/><line x1="156" y1="76" x2="156" y2="140" stroke="var(--ink-faint)" stroke-width="9" stroke-linecap="round"/><circle cx="110" cy="112" r="17" stroke="var(--accent)" stroke-width="5"/><path d="M101 112l7 7 12-14" stroke="var(--accent)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>',
    gobag: '<path d="M84 62q26-20 52 0v14H84z" fill="var(--accent)" opacity=".55"/><rect x="72" y="72" width="76" height="68" rx="14" fill="var(--accent)"/><rect x="94" y="96" width="32" height="22" rx="5" fill="var(--surface,#111)" opacity=".85"/><path d="M84 72v-8m52 8v-8" stroke="var(--accent)" stroke-width="7" stroke-linecap="round"/>',
    familyplan: '<rect x="62" y="38" width="96" height="104" rx="6" fill="var(--ink-faint)"/><line x1="76" y1="60" x2="144" y2="60" stroke="var(--surface,#111)" stroke-width="5" stroke-linecap="round"/><line x1="76" y1="76" x2="130" y2="76" stroke="var(--surface,#111)" stroke-width="5" stroke-linecap="round"/><circle cx="88" cy="106" r="8" fill="var(--accent)"/><circle cx="110" cy="106" r="8" fill="var(--accent)"/><circle cx="132" cy="106" r="8" fill="var(--accent)"/><path d="M76 126h68" stroke="var(--accent)" stroke-width="5" stroke-linecap="round"/>',
    drill: '<circle cx="110" cy="84" r="44" stroke="var(--ink-faint)" stroke-width="8"/><path d="M110 58v26l18 12" stroke="var(--accent)" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/><path d="M164 44a70 70 0 0 1 12 22" stroke="var(--accent)" stroke-width="5" stroke-linecap="round"/><path d="M182 60l-8 8-2-12z" fill="var(--accent)"/>',
    docs: '<path d="M72 40h50l26 26v56H72z" fill="var(--ink-faint)"/><path d="M122 40v26h26" fill="none" stroke="var(--surface,#111)" stroke-width="4"/><path d="M148 96l10 6v14c0 12-10 18-10 18s-10-6-10-18v-14z" fill="var(--accent)"/>',
    dropcover: '<rect x="44" y="58" width="132" height="10" rx="5" fill="var(--ink-faint)"/><line x1="58" y1="68" x2="58" y2="140" stroke="var(--ink-faint)" stroke-width="9" stroke-linecap="round"/><line x1="162" y1="68" x2="162" y2="140" stroke="var(--ink-faint)" stroke-width="9" stroke-linecap="round"/><circle cx="102" cy="104" r="13" fill="var(--accent)"/><path d="M94 116q10 22 34 20" stroke="var(--accent)" stroke-width="14" stroke-linecap="round"/><path d="M92 100q10-16 22-6" stroke="var(--accent)" stroke-width="8" stroke-linecap="round"/>',
    window: '<rect x="64" y="40" width="92" height="80" rx="4" stroke="var(--ink-faint)" stroke-width="7"/><line x1="110" y1="40" x2="110" y2="120" stroke="var(--ink-faint)" stroke-width="5"/><line x1="64" y1="80" x2="156" y2="80" stroke="var(--ink-faint)" stroke-width="5"/><path d="M80 52l16 18-8 12 14 16" stroke="var(--m3,#EF4444)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>' + '<path d="M176 96l-22 22M154 96l22 22" stroke="var(--m3,#EF4444)" stroke-width="6" stroke-linecap="round"/>',
    outdoor: '<path d="M28 90V56l20-16 20 16v34" stroke="var(--ink-faint)" stroke-width="7" fill="none" stroke-linejoin="round"/><path d="M84 92h44" stroke="var(--accent)" stroke-width="6" stroke-linecap="round"/><path d="M118 80l14 12-14 12" stroke="var(--accent)" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>' ,
    vehicle: '<rect x="56" y="84" width="106" height="30" rx="10" fill="var(--accent)"/><path d="M74 84l12-20h44l14 20" stroke="var(--accent)" stroke-width="8" fill="none" stroke-linejoin="round"/><circle cx="84" cy="120" r="11" fill="var(--ink-faint)"/><circle cx="140" cy="120" r="11" fill="var(--ink-faint)"/><path d="M176 92h16M176 106h16" stroke="var(--ink-faint)" stroke-width="6" stroke-linecap="round"/>',
    bed: '<rect x="44" y="96" width="132" height="14" rx="7" fill="var(--ink-faint)"/><line x1="52" y1="110" x2="52" y2="140" stroke="var(--ink-faint)" stroke-width="8" stroke-linecap="round"/><line x1="168" y1="110" x2="168" y2="140" stroke="var(--ink-faint)" stroke-width="8" stroke-linecap="round"/><path d="M66 92q30-14 60 0" stroke="var(--accent)" stroke-width="12" stroke-linecap="round"/><rect x="128" y="74" width="40" height="18" rx="9" fill="var(--accent)" opacity=".6"/>',
    nolift: '<rect x="72" y="38" width="76" height="104" rx="5" stroke="var(--ink-faint)" stroke-width="7"/><line x1="110" y1="38" x2="110" y2="142" stroke="var(--ink-faint)" stroke-width="5"/><path d="M88 24l12 10 12-10" stroke="var(--ink-faint)" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round" transform="translate(0,4)"/><path d="M150 96l-26 26M124 96l26 26" stroke="var(--m3,#EF4444)" stroke-width="8" stroke-linecap="round"/>',
    aftershock: '<path d="M74 142V84l36-30 36 30v58" stroke="var(--ink-faint)" stroke-width="8" fill="none" stroke-linejoin="round"/><path d="M28 70q-8 8 0 18M40 62q-12 14 0 30" stroke="var(--accent)" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M192 70q8 8 0 18M180 62q12 14 0 30" stroke="var(--accent)" stroke-width="5" fill="none" stroke-linecap="round"/>',
    firstaid: '<rect x="62" y="58" width="96" height="72" rx="10" fill="var(--accent)"/><rect x="96" y="44" width="28" height="14" rx="6" fill="var(--accent)" opacity=".6"/><path d="M110 76v36M92 94h36" stroke="var(--surface,#fff)" stroke-width="10" stroke-linecap="round"/>',
    gasleak: '<rect x="82" y="66" width="56" height="76" rx="10" fill="var(--ink-faint)"/><rect x="98" y="52" width="24" height="14" rx="4" fill="var(--ink-faint)"/><path d="M92 44q6-10 0-18M110 44q6-10 0-18M128 44q6-10 0-18" stroke="var(--accent)" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M178 92l-24 24M154 92l24 24" stroke="var(--m3,#EF4444)" stroke-width="7" stroke-linecap="round"/>',
    evacstairs: '<path d="M42 142h44v-26h40V90h40V64h38" stroke="var(--ink-faint)" stroke-width="8" fill="none" stroke-linejoin="round"/>' + '<circle cx="96" cy="86" r="11" fill="var(--accent)"/><path d="M96 98l-4 26M96 98l14 20" stroke="var(--accent)" stroke-width="9" stroke-linecap="round"/><path d="M52 118l14 14" stroke="var(--accent)" stroke-width="5" stroke-linecap="round"/>',
    radio: '<rect x="62" y="76" width="96" height="56" rx="10" fill="var(--ink-faint)"/><circle cx="90" cy="104" r="13" stroke="var(--surface,#111)" stroke-width="5"/><line x1="116" y1="94" x2="146" y2="94" stroke="var(--surface,#111)" stroke-width="5" stroke-linecap="round"/><line x1="146" y1="76" x2="170" y2="46" stroke="var(--ink-faint)" stroke-width="6" stroke-linecap="round"/><path d="M178 74q10 10 0 22M190 64q16 18 0 40" stroke="var(--accent)" stroke-width="5" fill="none" stroke-linecap="round" transform="translate(-14,10)"/>',
    sms: '<rect x="76" y="34" width="52" height="96" rx="10" stroke="var(--ink-faint)" stroke-width="7"/><line x1="94" y1="118" x2="110" y2="118" stroke="var(--ink-faint)" stroke-width="5" stroke-linecap="round"/><rect x="120" y="56" width="58" height="38" rx="10" fill="var(--accent)"/><path d="M132 94l-4 14 16-8z" fill="var(--accent)"/><path d="M132 70h34M132 80h22" stroke="var(--surface,#fff)" stroke-width="5" stroke-linecap="round"/>',
    shoes: '<path d="M56 116q0-14 14-14h20l10 10h34q22 0 26 18v6H56z" fill="var(--accent)"/><path d="M90 102v-8m14 16v-8" stroke="var(--surface,#fff)" stroke-width="4" stroke-linecap="round"/><path d="M46 140l8-12 8 12zM150 140l8-12 8 12zM104 140l8-12 8 12z" fill="var(--ink-faint)" transform="translate(0,2)"/>',
    gasoff: '<rect x="86" y="72" width="52" height="70" rx="10" fill="var(--ink-faint)"/><rect x="100" y="58" width="24" height="14" rx="4" fill="var(--ink-faint)"/><circle cx="112" cy="46" r="12" stroke="var(--accent)" stroke-width="6"/><path d="M112 34v-12" stroke="var(--accent)" stroke-width="6" stroke-linecap="round"/><path d="M148 34a26 26 0 0 1 10 20" stroke="var(--accent)" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M162 58l-10 4 2-12z" fill="var(--accent)"/>',
    dangerwall: '<rect x="52" y="38" width="72" height="104" fill="var(--ink-faint)"/><path d="M74 38l12 26-10 18 14 24-8 20" stroke="var(--surface,#111)" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M140 38q10 26-6 40t2 36" stroke="var(--m3,#EF4444)" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M170 64l-7 26h10l-9 26" stroke="var(--accent-2,#FBBF24)" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    openground: fig(110, 104) + '<path d="M30 60V40l14-12 14 12v20" stroke="var(--ink-faint)" stroke-width="5" fill="none" stroke-linejoin="round" opacity=".6"/><path d="M60 34l-36 36M24 34l36 36" stroke="var(--m3,#EF4444)" stroke-width="4" stroke-linecap="round" transform="translate(2,0) scale(.6) translate(16,20)"/><path d="M150 66h44M158 82h28" stroke="var(--line-2)" stroke-width="4" stroke-linecap="round"/>',
    softstory: '<rect x="60" y="36" width="100" height="56" fill="var(--ink-faint)"/><rect x="60" y="92" width="100" height="8" fill="var(--ink-faint)"/><line x1="72" y1="100" x2="72" y2="142" stroke="var(--m3,#EF4444)" stroke-width="6"/><line x1="110" y1="100" x2="110" y2="142" stroke="var(--m3,#EF4444)" stroke-width="6"/><line x1="148" y1="100" x2="148" y2="142" stroke="var(--m3,#EF4444)" stroke-width="6"/>',
    brickwall: '<g fill="var(--ink-faint)"><rect x="56" y="46" width="34" height="16"/><rect x="94" y="46" width="34" height="16"/><rect x="132" y="46" width="34" height="16"/><rect x="74" y="66" width="34" height="16"/><rect x="112" y="66" width="34" height="16"/><rect x="56" y="86" width="34" height="16"/><rect x="94" y="86" width="34" height="16"/><rect x="132" y="86" width="34" height="16"/><rect x="74" y="106" width="34" height="16"/><rect x="112" y="106" width="34" height="16"/></g><path d="M100 42l14 30-10 20 16 30" stroke="var(--m3,#EF4444)" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    addedfloor: '<rect x="66" y="86" width="88" height="56" fill="var(--ink-faint)"/><rect x="66" y="44" width="88" height="38" fill="none" stroke="var(--m3,#EF4444)" stroke-width="5" stroke-dasharray="9 7"/><path d="M176 60l14-6M176 74l14 6" stroke="var(--m3,#EF4444)" stroke-width="5" stroke-linecap="round"/>',
    heavyroof: '<rect x="52" y="40" width="116" height="26" rx="4" fill="var(--ink-faint)"/><path d="M72 66q-6 38 -12 74" stroke="var(--m3,#EF4444)" stroke-width="7" stroke-linecap="round" fill="none"/><path d="M148 66q6 38 12 74" stroke="var(--m3,#EF4444)" stroke-width="7" stroke-linecap="round" fill="none"/><path d="M110 66v76" stroke="var(--ink-faint)" stroke-width="7" stroke-linecap="round"/>',
    xcrack: '<rect x="60" y="40" width="100" height="102" fill="var(--ink-faint)"/><path d="M74 56l72 72M146 56l-72 72" stroke="var(--m3,#EF4444)" stroke-width="7" stroke-linecap="round"/>',
    weakcol: '<rect x="94" y="36" width="32" height="106" fill="var(--ink-faint)"/><path d="M94 78q16 10 32 0" stroke="var(--surface,#111)" stroke-width="5" fill="none"/><circle cx="102" cy="92" r="4" fill="var(--m3,#EF4444)"/><circle cx="112" cy="98" r="4" fill="var(--m3,#EF4444)"/><circle cx="120" cy="90" r="4" fill="var(--m3,#EF4444)"/>',
    badground: '<path d="M18 142L202 84" stroke="var(--line-2)" stroke-width="5" stroke-linecap="round"/><g transform="rotate(-9 120 90)"><path d="M84 118V76l28-22 28 22v42z" fill="var(--ink-faint)"/></g><path d="M60 132q10 4 20 0" stroke="var(--m3,#EF4444)" stroke-width="4" fill="none" stroke-linecap="round"/>',
    lshape: '<path d="M66 44h56v52h42v46H66z" fill="none" stroke="var(--ink-faint)" stroke-width="8" stroke-linejoin="round"/><path d="M130 60l-8 22h12l-10 22" stroke="var(--accent-2,#FBBF24)" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    frame: '<g stroke="var(--ink-faint)" stroke-width="8" stroke-linecap="round"><line x1="72" y1="38" x2="72" y2="142"/><line x1="148" y1="38" x2="148" y2="142"/><line x1="52" y1="66" x2="168" y2="66"/><line x1="52" y1="106" x2="168" y2="106"/></g><g fill="var(--accent)"><circle cx="72" cy="66" r="7"/><circle cx="148" cy="66" r="7"/><circle cx="72" cy="106" r="7"/><circle cx="148" cy="106" r="7"/></g>',
    bands: '<path d="M66 142V72l44-34 44 34v70" stroke="var(--ink-faint)" stroke-width="8" fill="none" stroke-linejoin="round"/><g stroke="var(--accent)" stroke-width="6" stroke-linecap="round"><line x1="66" y1="94" x2="154" y2="94"/><line x1="66" y1="118" x2="154" y2="118"/><line x1="80" y1="66" x2="140" y2="66"/></g>',
    cornersteel: '<path d="M70 142V50h92" stroke="var(--ink-faint)" stroke-width="12" stroke-linecap="round"/><line x1="86" y1="66" x2="86" y2="136" stroke="var(--accent)" stroke-width="5" stroke-linecap="round"/><line x1="100" y1="66" x2="100" y2="136" stroke="var(--accent)" stroke-width="5" stroke-linecap="round"/><g stroke="var(--accent)" stroke-width="4"><line x1="80" y1="82" x2="106" y2="82"/><line x1="80" y1="104" x2="106" y2="104"/><line x1="80" y1="126" x2="106" y2="126"/></g>',
    symmetric: '<path d="M62 142V84l48-34 48 34v58" stroke="var(--ink-faint)" stroke-width="8" fill="none" stroke-linejoin="round"/><line x1="110" y1="50" x2="110" y2="142" stroke="var(--accent)" stroke-width="4" stroke-dasharray="7 7"/><path d="M84 120l8 8 14-16M138 120l-8 8" stroke="var(--accent)" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity=".9"/>',
    code: '<rect x="70" y="36" width="80" height="106" rx="6" fill="var(--ink-faint)"/><line x1="84" y1="58" x2="136" y2="58" stroke="var(--surface,#111)" stroke-width="5" stroke-linecap="round"/><line x1="84" y1="74" x2="124" y2="74" stroke="var(--surface,#111)" stroke-width="5" stroke-linecap="round"/><circle cx="110" cy="108" r="20" fill="var(--accent)"/><path d="M100 108l7 7 13-14" stroke="var(--surface,#fff)" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    securedtank: '<rect x="78" y="56" width="64" height="56" rx="10" fill="var(--ink-faint)"/><path d="M78 68h64M78 100h64" stroke="var(--accent)" stroke-width="5"/><path d="M86 112l-10 30M134 112l10 30" stroke="var(--accent)" stroke-width="6" stroke-linecap="round"/><rect x="98" y="46" width="24" height="10" rx="4" fill="var(--ink-faint)"/>'
  };
  function artCard(key, n) {
    if (!ART[key]) return placeholder(n);
    return '<svg viewBox="0 0 220 160" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' + GND + ART[key] + '</svg>' +
      '<span class="phase-card-num">' + n + '</span>';
  }

  function build() {
    var srcs = document.querySelectorAll(".phase-src");
    for (var s = 0; s < srcs.length; s++) {
      var src = srcs[s];
      var phase = src.getAttribute("data-phase");
      var track = phase ? document.getElementById("pc-" + phase) : null;
      if (!track) continue;

      var imgs = (src.getAttribute("data-imgs") || "")
        .split("|").map(function (x) { return x.trim(); });
      var arts = (src.getAttribute("data-art") || "")
        .split("|").map(function (x) { return x.trim(); });
      var lis = src.querySelectorAll("li");
      var out = "";
      for (var i = 0; i < lis.length; i++) {
        var label = "image placeholder: " + phase + " step " + (i + 1);
        out += '<article class="phase-card">' +
          '<div class="phase-card-img" title="' + label + '">' + media(imgs[i], i + 1, arts[i]) + '</div>' +
          '<div class="phase-card-body">' + lis[i].innerHTML + '</div>' +
          '</article>';
      }
      track.innerHTML = out;
    }
  }

  function wire() {
    var arrows = document.querySelectorAll(".pc-arrow");
    for (var a = 0; a < arrows.length; a++) (function (btn) {
      if (btn._eqcWired) return;
      btn._eqcWired = 1;
      btn.addEventListener("click", function () {
        var track = document.getElementById("pc-" + btn.getAttribute("data-target"));
        if (!track) return;
        var card = track.querySelector(".phase-card");
        var step = card ? card.offsetWidth + 16 : 280;
        track.scrollBy({ left: btn.classList.contains("pc-next") ? step : -step, behavior: "smooth" });
      });
    })(arrows[a]);
  }

  function go() { build(); wire(); }

  document.addEventListener("eq:langchange", go);
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", go);
  } else {
    go();
  }
})();
