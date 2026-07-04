// TC-02 — Validation: empty form fails, bad email/future date/negative numbers fail, valid input passes
import { loadApp, sleep, assert, assertIncludes, report } from './harness.mjs';
import { fillValidForm } from './helpers-fill.mjs';

const { doc } = loadApp();
await sleep(300);
const set = (id, v) => doc.getElementById(id).value = v;

// TC-02.1 empty form must fail validation
doc.getElementById('btnProcess').click();
assert(doc.getElementById('valSummary').classList.contains('bad'), 'TC-02.1 empty form fails');
assert(doc.getElementById('btnStore').disabled, 'TC-02.1 store stays disabled on failure');

// TC-02.2 valid manual input passes all rules
fillValidForm(doc);
doc.getElementById('btnProcess').click();
assert(doc.getElementById('valSummary').classList.contains('ok'), 'TC-02.2 valid input passes');

// TC-02.3 malformed email rejected
set('contactEmail', 'not-an-email');
doc.getElementById('btnProcess').click();
assert(doc.getElementById('valSummary').classList.contains('bad'), 'TC-02.3 bad email fails');
assert(doc.getElementById('err-contactEmail').classList.contains('show'), 'TC-02.3 email error shown');
set('contactEmail', 'ciso@acme-health.example');

// TC-02.4 future incident date rejected
set('incidentDate', new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10));
doc.getElementById('btnProcess').click();
assert(doc.getElementById('valSummary').classList.contains('bad'), 'TC-02.4 future date fails');
set('incidentDate', new Date(Date.now() - 86400000).toISOString().slice(0, 10));

// TC-02.5 negative ransom rejected
set('ransomUsd', '-5');
doc.getElementById('btnProcess').click();
assert(doc.getElementById('valSummary').classList.contains('bad'), 'TC-02.5 negative ransom fails');
set('ransomUsd', '2500000');

// TC-02.6 short description rejected (min 20 chars)
set('description', 'too short');
doc.getElementById('btnProcess').click();
assert(doc.getElementById('valSummary').classList.contains('bad'), 'TC-02.6 short description fails');
set('description', 'A description that is definitely longer than twenty characters.');

// TC-02.7 corrected form passes again and JSON is produced
doc.getElementById('btnProcess').click();
assert(doc.getElementById('valSummary').classList.contains('ok'), 'TC-02.7 corrected form passes');
assertIncludes(doc.getElementById('jsonOut').textContent, '"reportId"', 'TC-02.7 JSON rendered');

report('TC-02 validation');
