// check-atemporal.ts — G21: enforce atemporal naming (ADR 0027).
//
// Scans versionable files; fails if any basename embeds a date
// (\d{4}-\d{2}-\d{2} or 20\d{6}) and the path is NOT under the task/trace
// allowlist (04_estado/receipts/**, 04_estado/tasks/**). Receipts and tasks
// are the only surfaces that carry time/version traces. [CONFIG]
//
// Usage: node --import tsx 05_verificacion/scripts/check-atemporal.ts
import {execFileSync} from 'node:child_process';
import {existsSync} from 'node:fs';
import {resolve} from 'node:path';

const ROOT = process.cwd();
const DATE_PATTERNS = [/\d{4}-\d{2}-\d{2}/u, /20\d{6}/u];
// Paths allowed to carry dates: task traces (ADR 0027) + vendored external
// content (captured snapshots whose date is semantic, not repo versioning).
const ALLOW_PREFIXES = ['04_estado/receipts/', '04_estado/tasks/', '03_artefactos/skills/vendor/'];

const versionable = (): string[] =>
  execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], {
    cwd: ROOT,
    encoding: 'utf8',
  })
    .split('\0')
    .filter((p) => p.length > 0 && !p.startsWith('node_modules/'))
    // Skip staged-but-deleted paths (still in the git index, absent on disk).
    .filter((p) => existsSync(resolve(ROOT, p)));

const isAllowed = (path: string): boolean => ALLOW_PREFIXES.some((p) => path.startsWith(p));

const hasDate = (path: string): boolean => {
  const base = path.split('/').pop() ?? path;
  return DATE_PATTERNS.some((re) => re.test(base));
};

const main = (): void => {
  const paths = versionable();
  const violations = paths.filter((p) => hasDate(p) && !isAllowed(p));
  for (const v of violations) console.error(`atemporal: date in name -> ${v}`);
  console.info(`atemporal: scanned=${paths.length} violations=${violations.length}`);
  if (violations.length > 0) {
    console.error(`[FAIL] ${violations.length} file(s) embed a date in the name (ADR 0027)`);
    process.exitCode = 1;
  } else {
    console.info('PASS G21: atemporal naming clean.');
  }
};

const isMain =
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === resolve(import.meta.url.replace(/^file:\/\//u, ''));
if (isMain) main();

export {versionable, isAllowed, hasDate, main};
