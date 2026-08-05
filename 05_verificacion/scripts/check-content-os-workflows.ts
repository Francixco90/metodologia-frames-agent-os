import {execFileSync} from 'node:child_process';
import {mkdtempSync, readdirSync, readFileSync, statSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';

const root = process.cwd();
const outRoot = mkdtempSync(join(tmpdir(), 'cosw-audit-'));

// Content OS workflow skills that ship a workflow-audit.mjs auditor plus
// positive/negative fixtures. CI runs each auditor against its fixtures and
// asserts the report JSON: positive => zero violations, negative => >=1.
// Parsing the report (not the exit code) keeps the check robust to auditors
// that print violations without setting a non-zero exit status.
const workflowSkills = [
  'content-os-faceless-explainer',
  'content-os-pr-to-video',
  'content-os-product-launch-video',
  'content-os-motion-graphics',
  'content-os-embedded-captions',
  'content-os-slideshow',
  'content-os-general-video',
  'content-os-remotion-bridge',
] as const;

type AuditReport = {violations?: unknown[]};

function reportViolations(skillId: string, fixture: string): number {
  const dir = join(outRoot, skillId, fixture);
  const files = statSync(dir, {throwIfNoEntry: false})?.isDirectory() ? readdirSync(dir) : [];
  const reportFile = files.find((name) => name.endsWith('.json'));
  if (!reportFile) return -1;
  const report = JSON.parse(readFileSync(join(dir, reportFile), 'utf8')) as AuditReport;
  return Array.isArray(report.violations) ? report.violations.length : -1;
}

const errors: string[] = [];

for (const skillId of workflowSkills) {
  const auditor = resolve(root, 'skills', skillId, 'scripts', 'workflow-audit.mjs');
  const positiveDir = resolve(root, 'skills', skillId, 'fixtures', 'positive');
  const negativeDir = resolve(root, 'skills', skillId, 'fixtures', 'negative');

  if (!statSync(auditor, {throwIfNoEntry: false})?.isFile()) {
    errors.push(`COSW-001 missing auditor ${skillId}`);
    continue;
  }

  const positiveFiles = statSync(positiveDir, {throwIfNoEntry: false})?.isDirectory()
    ? readdirSync(positiveDir).filter((name) => name.endsWith('.yml') || name.endsWith('.yaml'))
    : [];
  const negativeFiles = statSync(negativeDir, {throwIfNoEntry: false})?.isDirectory()
    ? readdirSync(negativeDir).filter((name) => name.endsWith('.yml') || name.endsWith('.yaml'))
    : [];

  if (positiveFiles.length === 0) {
    errors.push(`COSW-002 no positive fixture ${skillId}`);
  }
  if (negativeFiles.length === 0) {
    errors.push(`COSW-003 no negative fixture ${skillId}`);
  }

  for (const file of positiveFiles) {
    const target = resolve(positiveDir, file);
    try {
      execFileSync(process.execPath, [auditor, target, '--out', join(outRoot, skillId, file)], {
        cwd: root,
        encoding: 'utf8',
        stdio: 'pipe',
      });
    } catch {
      errors.push(`COSW-004 positive fixture audit errored ${skillId}:${file}`);
      continue;
    }
    const count = reportViolations(skillId, file);
    if (count !== 0) {
      errors.push(`COSW-004 positive fixture has ${count} violations ${skillId}:${file}`);
    }
  }

  for (const file of negativeFiles) {
    const target = resolve(negativeDir, file);
    try {
      execFileSync(process.execPath, [auditor, target, '--out', join(outRoot, skillId, file)], {
        cwd: root,
        encoding: 'utf8',
        stdio: 'pipe',
      });
    } catch {
      // Some auditors exit non-zero on violations; that is acceptable as long
      // as the report records the violations. The report is parsed below.
    }
    const count = reportViolations(skillId, file);
    if (count < 1) {
      errors.push(
        `COSW-005 negative fixture has ${count} violations (expected >=1) ${skillId}:${file}`,
      );
    }
  }
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.info(
    `PASS CONTENT OS WORKFLOWS: ${workflowSkills.length} auditors cover positive + negative fixtures.`,
  );
}
