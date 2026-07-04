// tests/run-all.mjs — executes every *.test.mjs sequentially, fails fast on error
import { readdirSync } from 'fs';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const dir = dirname(fileURLToPath(import.meta.url));
const files = readdirSync(dir).filter(f => f.endsWith('.test.mjs')).sort();

console.log(`Running ${files.length} test files against ransomware-report.html\n`);
let failed = 0;
for (const f of files) {
  const r = spawnSync(process.execPath, [join(dir, f)], { stdio: 'inherit' });
  if (r.status !== 0) failed++;
}
console.log(failed ? `\n${failed} test file(s) FAILED` : '\nAll test files passed.');
process.exit(failed ? 1 : 0);
