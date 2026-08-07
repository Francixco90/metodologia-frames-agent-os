// H-E008 runner — adversarial write-set violation.
// Executable eval: loads a fixture task.yaml whose write_set includes
// `secrets/private-key.pem` (outside any owner allowlist), parses it via
// TaskContractSchema (the schema alone allows the relative path), then runs
// an allowlist check mirroring tool-policy.yml and asserts the adversarial
// path is flagged as a violation. Deterministic: fixed allowlist + timestamps.
// [CÓDIGO]

import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {describe, expect, it} from 'vitest';
import YAML from 'yaml';

import {TaskContractSchema} from '../../../02_proceso/core/contracts/index.ts';

const FIXTURE_DIR = resolve(__dirname, 'fixture');
const TASK_PATH = resolve(FIXTURE_DIR, 'task.yaml');

/**
 * Allowlist por responsable, espejo de 02_proceso/governance/tool-policy.yml.
 * Minimal subset sufficient for the eval oracle: the legitimate task.yaml
 * self-write path is covered for `lead`; `secrets/**` is covered by NO owner.
 * [CONFIG]
 */
const OWNER_ALLOWLIST: Readonly<Record<string, readonly string[]>> = {
  lead: ['04_estado/tasks/**', 'docs/**', 'registries/projects/**', 'README.md', 'AGENTS.md'],
  repo: ['package.json', 'tsconfig.json', 'scripts/**', 'receipts/builds/**'],
  qa: ['tests/**', 'quality/**', 'receipts/dependency-audits/**'],
  core: ['core/**', 'workflows/core/**', 'tests/unit/core/**'],
  governance: ['governance/**', 'receipts/migrations/**'],
  // guardian is a non-writer (may_remediate: false); no allowlist.
};

/**
 * Match a relative path against a glob pattern. Supports `/**` suffix
 * (recursive prefix) and exact match. Mirrors the static-prefix logic of
 * check-ownership.ts. [CÓDIGO]
 */
function pathMatchesPattern(path: string, pattern: string): boolean {
  if (pattern.endsWith('/**')) {
    const prefix = pattern.slice(0, -3);
    return path === prefix || path.startsWith(`${prefix}/`);
  }
  return path === pattern;
}

function pathInAllowlist(path: string, patterns: readonly string[]): boolean {
  return patterns.some((p) => pathMatchesPattern(path, p));
}

/**
 * Validador adversarial de write_set: para cada path, verifica que cae bajo
 * algún patrón de la allowlist del responsable. Devuelve las rutas
 * fuera-de-allowlist (violaciones). [CÓDIGO]
 */
function findWriteSetViolations(writeSet: readonly string[], responsable: string): string[] {
  const patterns = OWNER_ALLOWLIST[responsable];
  if (patterns === undefined) {
    // No allowlist registered for this owner → all writes are violations
    // (guardian path is handled by TaskContractSchema's guardian superRefine).
    return [...writeSet];
  }
  return writeSet.filter((p) => !pathInAllowlist(p, patterns));
}

describe('H-E008 — adversarial write-set violation', () => {
  it('rejects a write_set path outside the owner allowlist', () => {
    const raw = YAML.parse(readFileSync(TASK_PATH, 'utf8')) as unknown;

    // The schema alone accepts `secrets/private-key.pem` (valid relative path).
    const parsed = TaskContractSchema.safeParse(raw);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return; // narrowing for TS
    const contract = parsed.data;

    expect(contract.responsable).toBe('lead');
    expect(contract.write_set).toContain('secrets/private-key.pem');

    const violations = findWriteSetViolations(contract.write_set, contract.responsable);

    // The adversarial path is detected as outside the lead allowlist.
    expect(violations).toContain('secrets/private-key.pem');
    expect(violations.length).toBeGreaterThanOrEqual(1);

    // The legitimate self-write path is NOT flagged (it is covered by
    // `04_estado/tasks/**`), isolating the violation to the adversarial path.
    expect(violations).not.toContain('04_estado/tasks/TASK-adversarial-001/task.yaml');
  });

  it('flags every write path when the owner has no allowlist (guardian)', () => {
    const guardianWriteSet = ['guardian/report.md', 'docs/x.md'];
    // guardian is not in OWNER_ALLOWLIST → all writes are violations here
    // (mirrors may_remediate:false; TaskContractSchema separately enforces
    // the guardian/ prefix at schema level).
    const violations = findWriteSetViolations(guardianWriteSet, 'guardian');
    expect(violations).toEqual(guardianWriteSet);
  });

  it('passes a clean write_set within the owner allowlist', () => {
    const cleanWriteSet = ['04_estado/tasks/TASK-clean-001/task.yaml'];
    const violations = findWriteSetViolations(cleanWriteSet, 'lead');
    expect(violations).toEqual([]);
  });
});
