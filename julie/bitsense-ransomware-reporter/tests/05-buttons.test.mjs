// TC-05 — Buttons: process, store, VIEW, Save to local drive (FS Access API + fallback), delete, clear, reset
import { loadApp, sleep, assert, assertIncludes, report } from './harness.mjs';
import { fillValidForm } from './helpers-fill.mjs';

const { window: w, doc } = loadApp();
await sleep(300);
const tbl = () => doc.getElementById('storeTableWrap').textContent;
const saveStatus = () => doc.getElementById('saveStatus').textContent;

// TC-05.1 Validate & process enables store
fillValidForm(doc);
doc.getElementById('btnProcess').click();
assert(!doc.getElementById('btnStore').disabled, 'TC-05.1 store enabled');

// TC-05.2 Save with empty store reports "nothing to save"
doc.getElementById('btnSave').click(); await sleep(200);
assertIncludes(saveStatus(), 'Nothing to save', 'TC-05.2 empty-store save message');

// TC-05.3 Store writes to IndexedDB, renders table, completes pipeline (step 5 done)
doc.getElementById('btnStore').click(); await sleep(300);
assertIncludes(tbl(), 'Acme Regional Medical Center', 'TC-05.3 record in table');
assertIncludes(doc.getElementById('storeStatus').textContent, 'Stored', 'TC-05.3 status');
assert(doc.querySelector('.step[data-step="5"]').classList.contains('done'), 'TC-05.3 step 5 marked done');

// TC-05.4 VIEW reloads record into right frame; re-store disabled
doc.getElementById('jsonOut').textContent = 'cleared';
const viewBtn = doc.querySelector('[data-view]');
assert(viewBtn, 'TC-05.4 view button rendered');
viewBtn.click(); await sleep(100);
assertIncludes(doc.getElementById('jsonOut').textContent, 'Acme Regional', 'TC-05.4 JSON restored');
assertIncludes(doc.getElementById('storeStatus').textContent, 'already in IndexedDB', 'TC-05.4 view status');
assert(doc.getElementById('btnStore').disabled, 'TC-05.4 re-store disabled on view');

// TC-05.5 Save via File System Access API — mocked picker receives the JSON
let written = null, pickerOpts = null;
w.showSaveFilePicker = async (opts) => {
  pickerOpts = opts;
  return { name: 'my-incidents.json',
    createWritable: async () => ({ write: async d => { written = d; }, close: async () => {} }) };
};
doc.getElementById('btnSave').click(); await sleep(300);
assert(pickerOpts && pickerOpts.suggestedName === 'bitsense_ransomware_incidents.json', 'TC-05.5 picker suggested name');
assert(written && written.includes('"reportId"'), 'TC-05.5 JSON written through FS Access API');
assertIncludes(saveStatus(), 'Saved', 'TC-05.5 save status');
assertIncludes(saveStatus(), 'my-incidents.json', 'TC-05.5 chosen filename shown');

// TC-05.6 user cancels the Save dialog → graceful message, no fallback download
w.__downloadClicked = false;
w.showSaveFilePicker = async () => { const e = new Error('cancel'); e.name = 'AbortError'; throw e; };
doc.getElementById('btnSave').click(); await sleep(200);
assertIncludes(saveStatus(), 'cancelled', 'TC-05.6 cancel message');
assert(!w.__downloadClicked, 'TC-05.6 no download on cancel');

// TC-05.7 fallback download when FS Access API unavailable
delete w.showSaveFilePicker;
w.__downloadClicked = false;
doc.getElementById('btnSave').click(); await sleep(300);
assert(String(w.__downloadClicked).includes('bitsense_ransomware_incidents.json'), 'TC-05.7 fallback download');
assertIncludes(saveStatus(), 'Download started', 'TC-05.7 fallback status');

// TC-05.8 per-row delete empties the store
doc.querySelector('[data-del]').click(); await sleep(300);
assertIncludes(tbl(), 'No records stored yet', 'TC-05.8 delete');

// TC-05.9 Clear store wipes everything
fillValidForm(doc);
doc.getElementById('btnProcess').click();
doc.getElementById('btnStore').click(); await sleep(300);
doc.getElementById('btnClear').click(); await sleep(300);
assertIncludes(tbl(), 'No records stored yet', 'TC-05.9 clear');

// TC-05.10 Reset clears form, disables store, clears save status
doc.getElementById('btnReset').click();
assert(doc.getElementById('orgName').value === '', 'TC-05.10 form cleared');
assert(doc.getElementById('btnStore').disabled, 'TC-05.10 store disabled');
assert(saveStatus() === '', 'TC-05.10 save status cleared');

report('TC-05 buttons');
