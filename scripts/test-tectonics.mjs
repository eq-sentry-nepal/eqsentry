import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const context = {};
vm.runInNewContext(readFileSync(new URL('../assets/js/tectonics-model.js', import.meta.url), 'utf8'), context);
const model = context.EQTectonicModel;
// Loading must deform rock without creating hidden slip at a locked contact.
for (const time of [4000, 12000, 22000, 25999]) {
  const state = model.sample(time);
  for (const x of [120, 440, 780]) {
    const y = 135 + .13 * x;
    assert.equal(model.offset('upper', x, y, state).x, model.offset('lower', x, y, state).x);
  }
  const x = 440, y = 135 + .13 * x;
  assert.ok(model.offset('lower', x, y + 135, state).x > model.offset('lower', x, y, state).x);
}
// Thrust slip has the correct sense and leaves unruptured areas without a jump.
const final = model.sample(model.total);
const upper = model.offset('upper', 440, 135 + .13 * 440, final);
const lower = model.offset('lower', 440, 135 + .13 * 440, final);
assert.ok(upper.x < lower.x && upper.y < lower.y);
for (const x of [120, 780]) {
  const y = 135 + .13 * x;
  assert.equal(model.offset('upper', x, y, final).x, model.offset('lower', x, y, final).x);
}
assert.ok(final.strain > 0 && final.strain < 1, 'the event must not imply complete strain release');
assert.equal(model.sample(-1).time, 0);
assert.equal(model.sample(Infinity).time, model.total);
assert.equal(final.stage, 5);
assert.equal(model.sample(26000).slip, 0);
console.log('✓ Tectonic mechanics: locked contact, loading deformation, thrust-slip direction, finite rupture and residual strain.');
