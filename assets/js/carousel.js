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

  function media(url, n) {
    if (url) {
      return '<img src="' + url + '" alt="" loading="lazy" decoding="async">' +
        '<span class="phase-card-num">' + n + '</span>';
    }
    return placeholder(n);
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
      var lis = src.querySelectorAll("li");
      var out = "";
      for (var i = 0; i < lis.length; i++) {
        var label = "image placeholder: " + phase + " step " + (i + 1);
        out += '<article class="phase-card">' +
          '<div class="phase-card-img" title="' + label + '">' + media(imgs[i], i + 1) + '</div>' +
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
