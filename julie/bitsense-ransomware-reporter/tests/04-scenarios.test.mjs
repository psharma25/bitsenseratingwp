// TC-04 — Scenarios: clicking a card loads it and animates steps 1–4; display-only (step 5 skipped)
import { loadApp, sleep, SCENARIO_MS, assert, assertEq, assertIncludes, report } from './harness.mjs';

const { doc } = loadApp();
await sleep(300);
const scens = doc.querySelectorAll('.scen');

// TC-04.1 clicking scenario 1 LOADS it into the form and runs the walkthrough (CRITICAL, score 14)
scens[0].click(); await sleep(SCENARIO_MS);
assertEq(doc.getElementById('orgName').value, 'Riverside Regional Medical Center', 'TC-04.1 form loaded by click');
assert(doc.getElementById('fExfil').checked, 'TC-04.1 exfil flag loaded');
assertEq(doc.getElementById('sevBadge').textContent, 'CRITICAL', 'TC-04.1 severity');
assertIncludes(doc.getElementById('scoreDetail').textContent, 'score 14', 'TC-04.1 score');
assertIncludes(doc.getElementById('jsonOut').textContent, 'Riverside Regional', 'TC-04.1 JSON shown');

// TC-04.2 walkthrough log narrates steps 1–4 + skip notice for step 5
const logTxt = doc.getElementById('walklog').textContent;
['STEP 1', 'STEP 2', 'STEP 3', 'STEP 4', 'skipped by design'].forEach(m =>
  assertIncludes(logTxt, m, 'TC-04.2 walklog ' + m));

// TC-04.3 display-only enforcement: store disabled
assert(doc.getElementById('btnStore').disabled, 'TC-04.3 store disabled');

// TC-04.4 step 5 visually marked skipped
const skipped = [...doc.querySelectorAll('.step.skipped')].map(s => s.dataset.step);
assert(skipped.includes('5'), 'TC-04.4 step 5 skipped');

// TC-04.5 nothing leaked into IndexedDB
assertIncludes(doc.getElementById('storeTableWrap').textContent, 'No records stored yet', 'TC-04.5 store empty');

// TC-04.6 scenario 2 (fintech exfil-only): loads + score 8 HIGH, encrypted=false
scens[1].click(); await sleep(SCENARIO_MS);
assertEq(doc.getElementById('orgName').value, 'Meridian Pay Technologies', 'TC-04.6 form loaded');
assertEq(doc.getElementById('sevBadge').textContent, 'HIGH', 'TC-04.6 severity');
assertIncludes(doc.getElementById('scoreDetail').textContent, 'score 8', 'TC-04.6 score');
assertIncludes(doc.getElementById('jsonOut').textContent, '"dataEncrypted": false', 'TC-04.6 exfil-only');

// TC-04.7 scenario 3 (manufacturing MFT zero-day): loads + score 7 HIGH
scens[2].click(); await sleep(SCENARIO_MS);
assertEq(doc.getElementById('orgName').value, 'Granite State Precision Manufacturing', 'TC-04.7 form loaded');
assertEq(doc.getElementById('sevBadge').textContent, 'HIGH', 'TC-04.7 severity');
assertIncludes(doc.getElementById('scoreDetail').textContent, 'score 7', 'TC-04.7 score');

// TC-04.8 display-only note visible
assert(doc.getElementById('scenNote').classList.contains('show'), 'TC-04.8 note shown');

report('TC-04 scenarios');
