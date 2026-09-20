/* Illustrative kinematics, NOT a calibrated deformation or earthquake model.
   Distances are drawing units; stage durations are presentation time. */
(function (scope) {
  "use strict";
  var durations = [8000, 8000, 10000, 8500, 8000, 8000];
  var total = durations.reduce(function (a, b) { return a + b; }, 0);
  function clamp(v) { return Math.max(0, Math.min(1, v)); }
  function smooth(v) { v = clamp(v); return v * v * (3 - 2 * v); }
  function sample(time) {
    time = Math.max(0, Math.min(total, Number(time) || 0));
    var remaining = time, stage = 0;
    while (stage < durations.length - 1 && remaining >= durations[stage]) { remaining -= durations[stage]; stage++; }
    var phase = clamp(remaining / durations[stage]);
    var loading = clamp(time / 26000);
    var slip = stage < 3 ? 0 : stage === 3 ? smooth(phase / .72) : 1;
    return { time: time, stage: stage, phase: phase, loading: loading, slip: slip, strain: loading * (1 - .72 * slip) };
  }
  function weight(x) { return smooth((x - 240) / 100) * smooth((710 - x) / 100); }
  function offset(side, x, y, state) {
    var contact = 135 + .13 * x;
    var depth = clamp(Math.abs(y - contact) / 135);
    // Paired material at the contact shares the same loading displacement.
    // Slip adds a jump only inside the buried patch, leaving its edges locked.
    var common = 12 * state.loading;
    var atFault = common + (side === "upper" ? -34 : 6) * state.slip * weight(x);
    var far = side === "upper" ? 0 : 42 * state.loading;
    var dx = atFault * (1 - depth) + far * depth;
    return { x: dx, y: .13 * dx };
  }
  scope.EQTectonicModel = { durations: durations, total: total, sample: sample, offset: offset };
})(typeof window === "undefined" ? globalThis : window);
