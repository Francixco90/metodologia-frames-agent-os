import {describe, expect, it} from 'vitest';

import {hasDate, isAllowed} from '../../scripts/check-atemporal.ts';

describe('check-atemporal helpers', () => {
  it('hasDate detects YYYY-MM-DD and YYYYMMDD in filenames', () => {
    expect(hasDate('doctor-2026-08-06.yml')).toBe(true);
    expect(hasDate('env-drift-20260806.yml')).toBe(true);
    expect(hasDate('RCP-DEP-PRODUCTION-20260806-006.json')).toBe(true);
    expect(hasDate('check-atemporal.ts')).toBe(false);
    expect(hasDate('docs-budget-policy.yml')).toBe(false);
  });

  it('isAllowed permits receipts and tasks (legitimate temporal traces)', () => {
    expect(isAllowed('04_estado/receipts/check-runs/C-001/receipt.yml')).toBe(true);
    expect(
      isAllowed('04_estado/receipts/dependency-audits/RCP-DEP-PRODUCTION-20260806-006.json'),
    ).toBe(true);
    expect(isAllowed('04_estado/tasks/T-001/task.yml')).toBe(true);
  });

  it('isAllowed rejects dated filenames outside receipts/tasks', () => {
    expect(isAllowed('05_verificacion/quality/reports/doctor-2026-08-06.yml')).toBe(false);
    expect(isAllowed('03_artefactos/brand/fonts/font-20260720.yml')).toBe(false);
  });

  it('vendor skills path is allowed (vendor surface exempt)', () => {
    expect(isAllowed('03_artefactos/skills/vendor/harness-creator/SKILL.md')).toBe(true);
  });
});
