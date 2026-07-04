// TC-01 — Structure: frames, buttons, 5-step pipeline, how-to above scenarios, no email UI
import { loadApp, sleep, assert, assertEq, assertIncludes, report } from './harness.mjs';

const { doc } = loadApp();
await sleep(300);

// TC-01.1 pipeline has exactly 5 steps (email step removed) inside a collapsible frame
assertEq(doc.querySelectorAll('.step').length, 5, 'TC-01.1 pipeline steps');
assert(doc.querySelector('.pipeframe'), 'TC-01.1 pipeline frame exists');

// TC-01.2 exactly 3 preloaded exfiltration scenario cards
assertEq(doc.querySelectorAll('.scen').length, 3, 'TC-01.2 scenario cards');

// TC-01.3 buttons: present set + removed set
['btnProcess','btnReset','btnStore','btnSave','btnClear','tabConsole','tabArch'].forEach(id =>
  assert(doc.getElementById(id), `TC-01.3 button #${id} exists`));
['btnDemo','btnCopy','btnEmail','btnSend','btnEmailCancel','btnExport'].forEach(id =>
  assert(!doc.getElementById(id), `TC-01.3 button #${id} removed`));
assert(!doc.getElementById('emailPanel'), 'TC-01.3 email panel removed');

// TC-01.4 how-to frame sits ABOVE the scenarios frame
const howto = doc.querySelector('.howto');
const scen = doc.querySelector('.scenarios');
assert(howto && scen, 'TC-01.4 frames exist');
assert(howto.compareDocumentPosition(scen) & 4 /* DOCUMENT_POSITION_FOLLOWING */,
  'TC-01.4 how-to precedes scenarios');
assertIncludes(howto.textContent, 'scenario', 'TC-01.4 mentions preload');
assertIncludes(howto.textContent, 'input', 'TC-01.4 mentions manual input');

// TC-01.5 key frames exist; Save button labeled correctly
['walklog','jsonOut','triageBox','storeTableWrap','archView','valSummary','saveStatus'].forEach(id =>
  assert(doc.getElementById(id), `TC-01.5 frame #${id} exists`));
assertIncludes(doc.getElementById('btnSave').textContent, 'Save to local drive', 'TC-01.5 save label');

// TC-01.6 architecture tab: 5 use cases + 2 SVGs incl. OV-1; no email mentions
assertEq(doc.querySelectorAll('#archView .uc').length, 5, 'TC-01.6 use cases');
assertEq(doc.querySelectorAll('#archView svg.archsvg').length, 2, 'TC-01.6 SVGs incl. OV-1');
assertIncludes(doc.querySelector('#archView').textContent, 'OV-1', 'TC-01.6 OV-1 labeled');
assert(!doc.querySelector('#archView').textContent.includes('mailto'), 'TC-01.6 no mailto in architecture');

report('TC-01 structure');
