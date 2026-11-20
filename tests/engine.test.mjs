// Run with:  node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simulate, runTests, assess, accuracy, sampleCatchProb, CONTROLS, DAYS } from '../assets/engine.js';

const SEEDS = Array.from({ length: 50 }, (_, i) => i + 1);

test('the October 2026 calendar has 21 business days (Thanksgiving excluded)', () => {
  assert.equal(DAYS.length, 21);
  assert.ok(!DAYS.includes('2026-10-12'));
});

test('every planted failure is caught, in every control, across 50 simulated months', () => {
  for (const seed of SEEDS) {
    const data = simulate(seed); const acc = accuracy(data, runTests(data));
    for (const a of acc) assert.equal(a.missed, 0, `seed ${seed}, ${a.id}: missed ${a.missed} of ${a.planted}`);
  }
});

test('no clean record is flagged (zero false positives) across 50 simulated months', () => {
  for (const seed of SEEDS) {
    const data = simulate(seed); const acc = accuracy(data, runTests(data));
    for (const a of acc) assert.equal(a.falsePositives, 0, `seed ${seed}, ${a.id}: ${a.falsePositives} false positives`);
  }
});

test('every control has at least one planted failure in every month', () => {
  for (const seed of SEEDS) {
    const data = simulate(seed);
    for (const c of CONTROLS) assert.ok((data.planted[c.id]?.size ?? 0) > 0, `seed ${seed}: nothing planted for ${c.id}`);
  }
});

test('control tests never read the planted labels', () => {
  const data = simulate(11); const before = runTests(data);
  delete data.planted; const after = runTests(data);
  assert.deepEqual(after, before);
});

test('the simulation is reproducible from its seed', () => {
  assert.deepEqual(runTests(simulate(7)), runTests(simulate(7)));
  assert.notDeepEqual(runTests(simulate(7)), runTests(simulate(8)));
});

test('sample-of-25 catch probability matches hand calculations', () => {
  assert.equal(sampleCatchProb(1000, 0), 0);
  assert.equal(sampleCatchProb(20, 1), 1);                 // the sample covers the whole population
  assert.ok(Math.abs(sampleCatchProb(50, 1) - 0.5) < 1e-12); // 25 of 50 drawn, one exception
  assert.ok(Math.abs(sampleCatchProb(100, 2) - (1 - (75 * 74) / (100 * 99))) < 1e-12);
});

test('ratings follow the rules: zero exceptions is effective; zero-tolerance controls with any exception are ineffective', () => {
  const clean = Object.fromEntries(CONTROLS.map(c => [c.id, { population: 100, exceptions: [] }]));
  assess(clean).forEach(a => { assert.equal(a.operating, 'Effective'); assert.equal(a.issue, null); });
  const one = { ...clean, P1: { population: 2000, exceptions: [{ id: 'x' }] }, P3: { population: 300, exceptions: [{ id: 'y' }] } };
  const r = Object.fromEntries(assess(one).map(a => [a.id, a]));
  assert.equal(r.P1.operating, 'Ineffective');           // zero tolerance
  assert.equal(r.P3.operating, 'Partially effective');   // 1 in 300 is within 1%
  assert.equal(r.P1.residual, r.P1.inherent);            // an ineffective control does not reduce risk
  assert.ok(r.P1.issue && r.P1.issue.due > r.P1.issue.opened);
});
