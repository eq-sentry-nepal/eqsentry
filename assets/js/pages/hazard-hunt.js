/* ==========================================================================
   EQ Sentry — room-by-room home hazard hunt (building.html).
   22 checks across 5 rooms; ticked items persist locally. Renders per-room
   progress plus an overall score bar with encouragement tiers. Bilingual via
   the page dictionary (hh.* keys); rebuilds on language change.
   ========================================================================== */
(function () {
  "use strict";
  var box = document.getElementById("hhRooms");
  if (!box) return;
  function T(k) { return window.EQ ? window.EQ.t(k) : k; }
  var KEY = "eqsentry_hazards";
  var ROOMS = [
    { key: "hh.r.kitchen", items: ["hh.k1", "hh.k2", "hh.k3", "hh.k4"] },
    { key: "hh.r.bedroom", items: ["hh.b1", "hh.b2", "hh.b3", "hh.b4"] },
    { key: "hh.r.living", items: ["hh.l1", "hh.l2", "hh.l3", "hh.l4"] },
    { key: "hh.r.exits", items: ["hh.e1", "hh.e2", "hh.e3", "hh.e4"] },
    { key: "hh.r.outside", items: ["hh.o1", "hh.o2", "hh.o3"] }
  ];
  var TOTAL = ROOMS.reduce(function (a, r) { return a + r.items.length; }, 0);
  var state = {};

  function load() { try { state = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { state = {}; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }
  function count() { var n = 0; ROOMS.forEach(function (r) { r.items.forEach(function (i) { if (state[i]) n++; }); }); return n; }

  function render() {
    box.innerHTML = ROOMS.map(function (r) {
      var done = r.items.filter(function (i) { return state[i]; }).length;
      return '<div class="hh-room">' +
        '<div class="hh-roomhead"><h4 style="margin:0">' + T(r.key) + '</h4>' +
        '<span class="muted" style="font-family:var(--mono);font-size:.8rem">' + done + "/" + r.items.length + "</span></div>" +
        r.items.map(function (i) {
          var on = !!state[i];
          return '<label class="kit-item' + (on ? " on" : "") + '" style="display:flex;gap:10px;align-items:flex-start;margin:6px 0">' +
            '<input type="checkbox" data-hh="' + i + '"' + (on ? " checked" : "") + ' style="width:auto;margin-top:4px" /> <span>' + T(i) + "</span></label>";
        }).join("") + "</div>";
    }).join("");
    paintScore();
  }
  function paintScore() {
    var n = count(), pct = Math.round(n / TOTAL * 100);
    var s = document.getElementById("hhScore"); if (s) s.textContent = n + "/" + TOTAL;
    var bar = document.getElementById("hhBar"); if (bar) bar.style.width = pct + "%";
    var tier = document.getElementById("hhTier");
    if (tier) tier.textContent = n === TOTAL ? T("hh.done")
      : T(pct >= 70 ? "hh.tier.high" : pct >= 35 ? "hh.tier.mid" : "hh.tier.low");
  }

  load(); render();

  box.addEventListener("change", function (e) {
    var id = e.target && e.target.getAttribute("data-hh");
    if (!id) return;
    state[id] = e.target.checked;
    var l = e.target.closest(".kit-item"); if (l) l.classList.toggle("on", e.target.checked);
    save(); paintScore();
    // refresh the per-room counter
    var room = e.target.closest(".hh-room");
    if (room) {
      var boxes = room.querySelectorAll("input[data-hh]"), d = 0;
      boxes.forEach(function (b) { if (b.checked) d++; });
      var c = room.querySelector(".hh-roomhead .muted"); if (c) c.textContent = d + "/" + boxes.length;
    }
  });

  var reset = document.getElementById("hhReset");
  if (reset) reset.addEventListener("click", function () {
    state = {}; save(); render();
  });

  document.addEventListener("eq:langchange", render);
})();
