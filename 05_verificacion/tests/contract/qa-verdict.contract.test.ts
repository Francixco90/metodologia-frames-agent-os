import {describe, expect, it} from 'vitest';
import {z} from 'zod';

import {readRepositoryYaml} from '../fixtures/verifier/io.ts';

const DefectSchema = z.strictObject({
  defect_id: z.string().regex(/^QA-[A-Z0-9-]+$/u),
  package: z.enum(['A02', 'A05', 'A06', 'A11']),
  artifact: z.string().min(1),
  severity: z.enum(['critical', 'high', 'medium', 'low']),
  status: z.literal('open'),
  evidence_tag: z.enum(['[CÓDIGO]', '[CONFIG]', '[DOC]', '[INFERENCIA]', '[SUPUESTO]']),
  invariant: z.string().min(1),
  observed: z.string().min(1),
  test_ref: z.string().startsWith('tests/'),
  gate_effect: z.string().min(1),
});

const DefectLedgerSchema = z.object({
  schema_version: z.literal(1),
  release_authorized: z.literal(false),
  independence: z.object({
    independently_verified_packages: z.tuple([
      z.literal('A02'),
      z.literal('A05'),
      z.literal('A06'),
      z.literal('A11'),
    ]),
  }),
  summary: z.strictObject({
    open_critical: z.number().int().nonnegative(),
    open_high: z.number().int().nonnegative(),
    open_medium: z.number().int().nonnegative(),
    overall: z.literal('BLOCKED'),
  }),
  defects: z.array(DefectSchema),
  resolved_findings: z.array(
    z
      .object({
        finding_ids: z.array(z.string().startsWith('QA-')).min(1),
        package: z.enum(['A02', 'A05', 'A06', 'A11']),
        status: z.literal('resolved_by_producer_and_regression_verified'),
        evidence: z.string().startsWith('tests/'),
        result: z.string().min(1),
      })
      .strict(),
  ),
  coverage_gaps: z.array(
    z.strictObject({
      id: z.string().startsWith('GAP-'),
      package: z.enum(['A02', 'A05', 'A06', 'A11']),
      detail: z.string().min(1),
    }),
  ),
});

describe('A09/A10 verifier evidence contracts', () => {
  it('keeps counts, package scope, and release denial consistent', () => {
    const ledger = DefectLedgerSchema.parse(
      readRepositoryYaml('quality/reports/a09-a10-defect-ledger.yml'),
    );
    const counts = ledger.defects.reduce(
      (result, defect) => ({
        ...result,
        [defect.severity]: result[defect.severity] + 1,
      }),
      {critical: 0, high: 0, medium: 0, low: 0},
    );

    expect(ledger.summary).toMatchObject({
      open_critical: counts.critical,
      open_high: counts.high,
      open_medium: counts.medium,
    });
    expect(ledger.independence.independently_verified_packages).toEqual([
      'A02',
      'A05',
      'A06',
      'A11',
    ]);
    expect(ledger.defects).toEqual([]);
    expect(ledger.resolved_findings.flatMap(({finding_ids}) => finding_ids)).toEqual(
      expect.arrayContaining([
        'QA-SKILL-001',
        'QA-WEB-001',
        'QA-WEB-002',
        'QA-WEB-003',
        'QA-N8N-001',
        'QA-N8N-002',
        'QA-N8N-003',
      ]),
    );
  });

  it('explicitly excludes A03/A04 from independence and denies every release state', () => {
    const verdict = z
      .object({
        producer_separation: z.strictObject({
          independently_verified: z.tuple([
            z.literal('A02'),
            z.literal('A05'),
            z.literal('A06'),
            z.literal('A11'),
          ]),
          excluded_because_verifier_produced: z.tuple([z.literal('A03'), z.literal('A04')]),
          excluded_because_deferred: z.tuple([z.literal('A07'), z.literal('A08')]),
        }),
        overall_verdict: z.literal('BLOCKED'),
        human_approval_granted: z.literal(false),
        ready_granted: z.literal(false),
        release_authorized: z.literal(false),
      })
      .parse(readRepositoryYaml('governance/a09-a10-cross-verifier-verdict.yml'));

    expect(verdict.overall_verdict).toBe('BLOCKED');
  });
});
