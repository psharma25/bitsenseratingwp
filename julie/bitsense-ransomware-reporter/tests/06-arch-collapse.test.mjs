// TC-06 — Console tab is NOT collapsible; only architecture-tab frames collapse (default collapsed)
import { loadApp, sleep, assert, assertIncludes, report } from './harness.mjs';
import { fillValidForm } from './helpers-fill.mjs';

const { doc } = loadApp();
await sleep(300);

// TC-06.1 tab toggle: arch shows, console hides — and back
doc.getElementById('tabArch').click();
assert(doc.getElementById('archView').classList.contains('show'), 'TC-06.1 arch shown');
assert(doc.getElementById('consoleView').classList.contains('hidden'), 'TC-06.1 console hidden');
doc.getElementById('tabConsole').click();
assert(!doc.getElementById('archView').classList.contains('show'), 'TC-06.1 arch hidden again');

// TC-06.2 OV-1 content with threat actor and federal partner nodes; save-to-drive in system arch
const arch = doc.getElementById('archView');
['OV-1','Threat actor','FBI field office','IC3','CISA','Save to drive'].forEach(m =>
  assertIncludes(arch.textContent, m, 'TC-06.2 ' + m));

// TC-06.3 ALL architecture-tab frames start COLLAPSED and are the ONLY collapsibles on the page
const archFrames = arch.querySelectorAll('.collapsible');
assert(archFrames.length >= 3, `TC-06.3 arch frames found (${archFrames.length})`);
archFrames.forEach((f, i) =>
  assert(f.classList.contains('collapsed'), `TC-06.3 arch frame ${i} collapsed by default`));
assert(doc.querySelectorAll('.collapsible').length === archFrames.length,
  'TC-06.3 no collapsible frames exist outside #archView');

// TC-06.4 tab-1 frames are permanently EXPANDED and NOT collapsible (no chevron, no collapse on click)
const scen = doc.querySelector('.scenarios');
const pipe = doc.querySelector('.pipeframe');
const howto = doc.querySelector('.howto');
[ [scen,'scenarios'], [pipe,'pipeline'], [howto,'how-to'] ].forEach(([f, name]) => {
  assert(!f.classList.contains('collapsible'), `TC-06.4 ${name} not collapsible`);
  assert(!f.classList.contains('collapsed'), `TC-06.4 ${name} expanded`);
  assert(!f.querySelector(':scope > h3 .chev'), `TC-06.4 ${name} has no chevron`);
  const head = f.querySelector(':scope > h3');
  head.click();
  assert(!f.classList.contains('collapsed'), `TC-06.4 ${name} stays expanded after click`);
});
doc.querySelectorAll('#consoleView .card').forEach((c, i) => {
  assert(!c.classList.contains('collapsible'), `TC-06.4 console card ${i} not collapsible`);
  assert(!c.classList.contains('collapsed'), `TC-06.4 console card ${i} expanded`);
  const head = c.querySelector(':scope > h2');
  if (head) { head.click();
    assert(!c.classList.contains('collapsed'), `TC-06.4 console card ${i} stays expanded after click`); }
});

// TC-06.5 arch frames toggle back and forth (click + keyboard)
doc.getElementById('tabArch').click();
const aHead = archFrames[0].querySelector(':scope > h2, :scope > h3');
aHead.click();
assert(!archFrames[0].classList.contains('collapsed'), 'TC-06.5 arch frame expands on click');
aHead.click();
assert(archFrames[0].classList.contains('collapsed'), 'TC-06.5 arch frame re-collapses');
aHead.dispatchEvent(new doc.defaultView.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
assert(!archFrames[0].classList.contains('collapsed'), 'TC-06.5 Enter expands arch frame');
aHead.dispatchEvent(new doc.defaultView.KeyboardEvent('keydown', { key: ' ', bubbles: true }));
assert(archFrames[0].classList.contains('collapsed'), 'TC-06.5 Space collapses arch frame');
doc.getElementById('tabConsole').click();

// TC-06.6 pipeline still runs normally on tab 1
fillValidForm(doc);
doc.getElementById('btnProcess').click();
assertIncludes(doc.getElementById('jsonOut').textContent, '"reportId"', 'TC-06.6 pipeline works');

report('TC-06 collapse & architecture');
