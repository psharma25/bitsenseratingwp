// TC-03 — Triage engine: deterministic scores and severity bands are reproducible
import { loadApp, sleep, assert, assertEq, assertIncludes, report } from './harness.mjs';

const { doc } = loadApp();
await sleep(300);
const set = (id, v) => doc.getElementById(id).value = v;
const chk = (id, v) => doc.getElementById(id).checked = v;

function fillBase() {
  doc.getElementById('btnReset').click();
  set('orgName', 'Test Org');
  set('sector', 'Technology');                    // non-critical sector
  set('contactName', 'Tester');
  set('contactEmail', 't@test.example');
  set('incidentDate', new Date(Date.now() - 86400000).toISOString().slice(0, 10));
  set('description', 'Baseline incident description exceeding twenty characters.');
}
const run = () => { doc.getElementById('btnProcess').click(); };
const sev = () => doc.getElementById('sevBadge').textContent;
const detail = () => doc.getElementById('scoreDetail').textContent;

// TC-03.1 no factors → score 0 → LOW
fillBase(); run();
assertEq(sev(), 'LOW', 'TC-03.1 severity');
assertIncludes(detail(), 'score 0', 'TC-03.1 score');

// TC-03.2 exfil only (+3) → MEDIUM
fillBase(); chk('fExfil', true); run();
assertEq(sev(), 'MEDIUM', 'TC-03.2 severity');
assertIncludes(detail(), 'score 3', 'TC-03.2 score');

// TC-03.3 exfil + encrypted (3+3=6) → HIGH
fillBase(); chk('fExfil', true); chk('fEncrypted', true); run();
assertEq(sev(), 'HIGH', 'TC-03.3 severity');
assertIncludes(detail(), 'score 6', 'TC-03.3 score');

// TC-03.4 exfil + encrypted + ops (+2) + backups (+2) = 10 → CRITICAL
fillBase(); chk('fExfil', true); chk('fEncrypted', true); chk('fOpsDown', true); chk('fBackups', true); run();
assertEq(sev(), 'CRITICAL', 'TC-03.4 severity');
assertIncludes(detail(), 'score 10', 'TC-03.4 score');

// TC-03.5 critical sector adds +2; thresholds: systems>100 +2, ransom>=1M +2
fillBase();
set('sector', 'Healthcare / Medical Devices');
set('systemsCount', '101');
set('ransomUsd', '1000000');
chk('fExfil', true); run();                        // 3+2+2+2 = 9 → CRITICAL
assertEq(sev(), 'CRITICAL', 'TC-03.5 severity');
assertIncludes(detail(), 'score 9', 'TC-03.5 score');

// TC-03.6 boundary just below: systems=100 (+1 band), ransom=999999 (+... none ≥100k? 999,999 ≥ 100k → +1)
fillBase();
set('sector', 'Healthcare / Medical Devices');
set('systemsCount', '100');                        // >10 band → +1
set('ransomUsd', '999999');                        // ≥100k band → +1
chk('fExfil', true); run();                        // 3+2+1+1 = 7 → HIGH
assertEq(sev(), 'HIGH', 'TC-03.6 severity');
assertIncludes(detail(), 'score 7', 'TC-03.6 score');

// TC-03.7 exfil always adds breach-notification action
assertIncludes(doc.getElementById('actionList').textContent, 'breach-notification', 'TC-03.7 exfil action');

// TC-03.8 FBI/IC3 guidance always present
const actions = doc.getElementById('actionList').textContent;
assertIncludes(actions, 'FBI field office', 'TC-03.8 FBI action');
assertIncludes(actions, 'ic3.gov', 'TC-03.8 IC3 action');

report('TC-03 triage engine');
