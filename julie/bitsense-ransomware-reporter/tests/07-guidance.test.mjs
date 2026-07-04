// TC-07 — "Nothing happening?" guidance: idle hint, no-op explanations
import { loadApp, sleep, assert, assertIncludes, report } from './harness.mjs';
import { fillValidForm } from './helpers-fill.mjs';

const { doc } = loadApp();
await sleep(300);

// TC-07.1 hint bar exists and starts hidden
const bar = doc.getElementById('hintBar');
assert(!!bar, 'TC-07.1 hint bar present');
assert(!bar.classList.contains('show'), 'TC-07.1 hint bar hidden on load');

// TC-07.2 clicking disabled Store area explains what to do
doc.getElementById('btnStore').parentElement.click();
assertIncludes(doc.getElementById('storeStatus').textContent, 'Validate & process',
  'TC-07.2 disabled-store click gives instructions');

// TC-07.3 saving an empty store gives instructions instead of silence
doc.getElementById('btnSave').click();
await sleep(120);
assertIncludes(doc.getElementById('saveStatus').textContent, 'Nothing to save',
  'TC-07.3 empty save explains');
assertIncludes(doc.getElementById('saveStatus').textContent, 'Validate & process',
  'TC-07.3 empty save instructs next step');

// TC-07.4 clearing an empty store gives instructions
doc.getElementById('btnClear').click();
await sleep(120);
assertIncludes(doc.getElementById('saveStatus').textContent, 'Nothing to clear',
  'TC-07.4 empty clear explains');

// TC-07.5 dismiss button hides the bar once shown
bar.classList.add('show');
doc.getElementById('hintClose').click();
assert(!bar.classList.contains('show'), 'TC-07.5 dismiss hides hint bar');

// TC-07.6 normal flow still works and disabled-store message is replaced by success path
fillValidForm(doc);
doc.getElementById('btnProcess').click();
assertIncludes(doc.getElementById('jsonOut').textContent, '"reportId"', 'TC-07.6 process still works');
assert(!doc.getElementById('btnStore').disabled, 'TC-07.6 store unlocked after processing');

report('TC-07 guidance & no-op explanations');
