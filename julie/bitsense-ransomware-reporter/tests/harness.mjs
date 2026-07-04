// tests/harness.mjs — shared jsdom harness for ransomware-report.html
// Loads the app with fake-indexeddb and gives every test the same helpers.
import { JSDOM, VirtualConsole } from 'jsdom';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { IDBFactory } from 'fake-indexeddb';
import { IDBKeyRange } from 'fake-indexeddb';

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP = process.env.APP_HTML || join(__dirname, '..', 'ransomware-report.html');

export function loadApp() {
  const html = readFileSync(APP, 'utf8');
  const vc = new VirtualConsole();
  const jsdomErrors = [];
  // jsdom cannot navigate (mailto:) — expected, filtered out
  vc.on('jsdomError', e => { if (!/not implemented.*navigation/i.test(String(e))) jsdomErrors.push(String(e)); });
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole: vc,
    beforeParse(w) {
      w.indexedDB = new IDBFactory();          // fresh DB per test file
      w.IDBKeyRange = IDBKeyRange;
      w.URL.createObjectURL = () => 'blob:fake';
      w.URL.revokeObjectURL = () => {};
      w.HTMLAnchorElement.prototype.click = function () { w.__downloadClicked = this.download || true; };
    }
  });
  return { dom, window: dom.window, doc: dom.window.document, jsdomErrors };
}

export const sleep = ms => new Promise(r => setTimeout(r, ms));
// scenario walkthrough = 4 stages x 650ms + half-steps; 4500ms is safe
export const SCENARIO_MS = 4500;

/* -------- tiny assertion kit (no framework, matches the app's vanilla ethos) -------- */
let failures = [];
let count = 0;
export function assert(cond, msg) {
  count++;
  if (!cond) failures.push(msg);
}
export function assertEq(actual, expected, msg) {
  assert(actual === expected, `${msg} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}
export function assertIncludes(haystack, needle, msg) {
  assert(String(haystack).includes(needle), `${msg} — "${needle}" not found`);
}
export function report(name) {
  if (failures.length) {
    console.error(`✗ ${name}: ${failures.length}/${count} assertions FAILED`);
    failures.forEach(f => console.error('   - ' + f));
    process.exit(1);
  }
  console.log(`✓ ${name}: ${count} assertions passed`);
}
