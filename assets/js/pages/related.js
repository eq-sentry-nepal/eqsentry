/* ==========================================================================
   EQ Sentry — "keep going" related-content cards.
   Injects a small row of next-step links before the footer on safety/content
   pages. Titles & descriptions reuse the core nav dictionary (nav.* / nd.*),
   so nothing new to translate. Rebuilt on language change.
   ========================================================================== */
(function () {
  "use strict";
  var MAP = {
    prep: [["plan.html", "nav.plan", "nd.plan"], ["building.html", "nav.building", "nd.building"], ["district.html", "nav.district", "nd.district"]],
    plan: [["preparedness.html", "nav.prep", "nd.prep"], ["building.html", "nav.building", "nd.building"], ["resources.html", "nav.resources", "nd.resources"]],
    building: [["district.html", "nav.district", "nd.district"], ["preparedness.html", "nav.prep", "nd.prep"], ["plan.html", "nav.plan", "nd.plan"]],
    district: [["building.html", "nav.building", "nd.building"], ["felt.html", "nav.felt", "nd.felt"], ["history.html", "nav.history", "nd.history"]],
    felt: [["district.html", "nav.district", "nd.district"], ["aftermath.html", "nav.after", "nd.after"], ["preparedness.html", "nav.prep", "nd.prep"]],
    after: [["resources.html", "nav.resources", "nd.resources"], ["directory.html", "nav.directory", "nd.directory"], ["facts.html", "nav.facts", "nd.facts"]],
    facts: [["faq.html", "nav.faq", "nd.faq"], ["glossary.html", "nav.glossary", "nd.glossary"], ["history.html", "nav.history", "nd.history"]],
    faq: [["facts.html", "nav.facts", "nd.facts"], ["glossary.html", "nav.glossary", "nd.glossary"], ["preparedness.html", "nav.prep", "nd.prep"]],
    resources: [["directory.html", "nav.directory", "nd.directory"], ["plan.html", "nav.plan", "nd.plan"], ["aftermath.html", "nav.after", "nd.after"]],
    directory: [["resources.html", "nav.resources", "nd.resources"], ["district.html", "nav.district", "nd.district"], ["plan.html", "nav.plan", "nd.plan"]],
    glossary: [["faq.html", "nav.faq", "nd.faq"], ["facts.html", "nav.facts", "nd.facts"], ["history.html", "nav.history", "nd.history"]],
    history: [["preparedness.html", "nav.prep", "nd.prep"], ["building.html", "nav.building", "nd.building"], ["glossary.html", "nav.glossary", "nd.glossary"]],
    schoolplan: [["preparedness.html", "nav.prep", "nd.prep"], ["plan.html", "nav.plan", "nd.plan"], ["resources.html", "nav.resources", "nd.resources"]]
  };
  var page = document.body.getAttribute("data-page");
  var items = MAP[page];
  if (!items) return;
  function T(k) { return window.EQ ? window.EQ.t(k) : k; }

  var sec = document.createElement("section");
  sec.className = "section tight related-sec";
  function build() {
    sec.innerHTML = '<div class="container">' +
      '<h3 style="margin:0 0 14px" data-rel-t>' + T("rel.t") + '</h3>' +
      '<div class="grid cols-3">' + items.map(function (it) {
        return '<a class="card link-card" href="' + it[0] + '" style="padding:18px 20px">' +
          '<h3 style="margin:0 0 4px;font-size:1.02rem">' + T(it[1]) + '</h3>' +
          '<p class="mb-0" style="color:var(--ink-soft);font-size:.88rem">' + T(it[2]) + '</p>' +
          '<span class="card-arrow">→</span></a>';
      }).join("") + "</div></div>";
  }
  build();
  var footer = document.getElementById("site-footer");
  if (footer) footer.parentNode.insertBefore(sec, footer);
  document.addEventListener("eq:langchange", build);
})();
