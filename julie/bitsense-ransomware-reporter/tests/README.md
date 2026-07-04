# Test Suite — BitSense Ransomware Incident Reporter

jsdom-based tests for `ransomware-report.html`. Minimal assertion kit in `harness.mjs`,
`fake-indexeddb` for IndexedDB, `helpers-fill.mjs` fills the intake form manually.

## Run

```bash
cd tests
npm install
npm test                    # all files via run-all.mjs
node 05-buttons.test.mjs    # or any single file
APP_HTML=/path/to/file.html npm test   # test another copy
```

## Test case matrix (127 assertions)

| File | ID | Verifies |
|---|---|---|
| 01-structure | TC-01.1 | Pipeline has 5 steps (email step removed) in a collapsible frame |
| | TC-01.2 | Exactly 3 exfiltration scenario cards |
| | TC-01.3 | Present buttons: process/reset/store/save/clear/tabs; removed: demo/copy/email/send/cancel/export |
| | TC-01.4 | How-to frame sits ABOVE scenarios; mentions preload + manual input |
| | TC-01.5 | Key frames incl. saveStatus; Save button labeled "Save to local drive" |
| | TC-01.6 | Architecture tab: 5 UCs + 2 SVGs incl. OV-1; no mailto references |
| 02-validation | TC-02.1–02.7 | Empty/bad-email/future-date/negative-ransom/short-description fail; valid input passes; JSON rendered |
| 03-triage | TC-03.1–03.8 | Deterministic scores 0/3/6/7/9/10 → LOW/MEDIUM/HIGH/CRITICAL bands; exfil adds breach-notification action; FBI + IC3 always present |
| 04-scenarios | TC-04.1 | Clicking SCEN-EXF-01 LOADS the form + score 14 CRITICAL |
| | TC-04.2 | Walkthrough log narrates steps 1–4 + step-5 skip notice |
| | TC-04.3 | Display-only: store disabled |
| | TC-04.4 | Step 5 marked skipped in the stepper |
| | TC-04.5 | Nothing written to IndexedDB |
| | TC-04.6 | SCEN-EXF-02 loads; score 8 HIGH, encrypted=false |
| | TC-04.7 | SCEN-EXF-03 loads; score 7 HIGH |
| | TC-04.8 | Display-only note visible |
| 05-buttons | TC-05.1 | Process enables store |
| | TC-05.2 | Save with empty store → "Nothing to save" |
| | TC-05.3 | Store writes IndexedDB, renders table, marks step 5 done |
| | TC-05.4 | View reloads record; re-store disabled |
| | TC-05.5 | Save via File System Access API: picker gets suggested name, JSON written, chosen filename shown |
| | TC-05.6 | Cancelling the Save dialog → graceful message, no fallback download |
| | TC-05.7 | Fallback browser download when FS Access API unavailable |
| | TC-05.8 | Per-row delete removes record |
| | TC-05.9 | Clear store wipes all records |
| | TC-05.10 | Reset clears form, store button, save status |
| 06-arch-collapse | TC-06.1 | Console/Architecture tab toggle |
| | TC-06.2 | OV-1 nodes (threat actor, FBI, IC3, CISA) + Save-to-drive in system arch |
| | TC-06.3 | ALL architecture frames collapsed by default |
| | TC-06.4 | Scenarios + pipeline collapsed by default; how-to + cards expanded |
| | TC-06.5 | Collapsed frames toggle back and forth (click + Enter/Space) |
| | TC-06.6 | Arch frames expand and re-collapse |
| | TC-06.7 | Pipeline functions while its frame is collapsed |
