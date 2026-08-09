import {describe, expect, it} from 'vitest';

import {
  DocumentationClosureReceiptV1Schema,
  DocumentationImpactPlanV1Schema,
  DocumentationSurfaceV1Schema,
  FramesWorkOrderV1Schema,
} from 'core/contracts/index.ts';

const digest = 'a'.repeat(64);
const surfaces = DocumentationSurfaceV1Schema.options.map((surface) => ({
  surface,
  disposition: 'NOT_APPLICABLE' as const,
  reasonCode: 'NO_USER_VISIBLE_CHANGE' as const,
}));

const impactPlan = {
  schemaVersion: 'documentation-impact-plan-v1',
  planId: 'DOC-PLAN-001',
  changeClass: 'CORRECT',
  scope: 'CANONICAL',
  affectedIds: ['content-os-router'],
  surfaces: surfaces.map((surface) =>
    surface.surface === 'INDEXES_INVENTORIES'
      ? {
          surface: surface.surface,
          disposition: 'REQUIRED' as const,
          sourceRefs: ['01_intencion/program/ecosystem-inventory-v1.json'],
        }
      : surface,
  ),
  canonicalSha256: digest,
} as const;

const workOrder = {
  schemaVersion: 'frames-work-order-v1',
  workOrderId: 'WO-DOC-001',
  requestHash: digest,
  routeId: 'R9',
  workflowId: 'M03',
  stepId: 'M03-IMPLEMENT',
  skillId: 'frames-harness-maintainer',
  actorId: 'RT-10',
  readSet: ['02_proceso/governance/router.yml'],
  writeSet: ['02_proceso/governance/router.yml'],
  inputs: [{ref: '02_proceso/governance/router.yml', sha256: digest}],
  expectedOutputs: ['02_proceso/governance/router.yml'],
  tools: ['apply-patch'],
  effectClass: 'LOCAL_REVERSIBLE',
  budget: {targetFiles: 2, maxFiles: 4, targetTokens: 2_000, maxTokens: 4_000},
  acceptanceCriteria: ['La corrección conserva routing determinista.'],
  stopRule: 'Detener ante UNKNOWN.',
  changeClass: 'CORRECT',
  documentationImpact: impactPlan,
  canonicalSha256: digest,
} as const;

const closureReceipt = {
  schemaVersion: 'documentation-closure-receipt-v1',
  receiptId: 'DOC-CLOSE-001',
  impactPlanSha256: digest,
  candidateSha256: 'b'.repeat(64),
  baseCommit: '1'.repeat(40),
  headCommit: '2'.repeat(40),
  actorId: 'RT-10',
  verifierActorId: 'RT-09',
  status: 'PASS',
  sources: [{ref: '02_proceso/governance/router.yml', sha256: digest}],
  projections: [{ref: '01_intencion/program/ecosystem-inventory-v1.json', sha256: 'c'.repeat(64)}],
  checks: ['DOCS_TRANSVERSAL_COMPLETE'],
  privacyStatus: 'PASS',
  canonicalSha256: 'd'.repeat(64),
} as const;

describe('documentation governance contracts', () => {
  it('requires every documentation surface exactly once', () => {
    expect(DocumentationImpactPlanV1Schema.parse(impactPlan)).toEqual(impactPlan);
    expect(() =>
      DocumentationImpactPlanV1Schema.parse({
        ...impactPlan,
        surfaces: impactPlan.surfaces.slice(1),
      }),
    ).toThrow();
    expect(() =>
      DocumentationImpactPlanV1Schema.parse({
        ...impactPlan,
        surfaces: [...impactPlan.surfaces.slice(1), impactPlan.surfaces[1]],
      }),
    ).toThrow(/Every documentation surface/u);
  });

  it('prevents local impact plans from targeting canonical documentation', () => {
    expect(() =>
      DocumentationImpactPlanV1Schema.parse({...impactPlan, scope: 'PROJECT_LOCAL'}),
    ).toThrow(/only write local docs/u);
  });

  it('binds every mutating work order to a matching documentation impact plan', () => {
    expect(FramesWorkOrderV1Schema.parse(workOrder)).toEqual(workOrder);
    expect(() =>
      FramesWorkOrderV1Schema.parse({...workOrder, documentationImpact: undefined}),
    ).toThrow(/documentation impact plan/u);
    expect(() => FramesWorkOrderV1Schema.parse({...workOrder, changeClass: 'EXPAND'})).toThrow(
      /change class differ/u,
    );
  });

  it('accepts only material, independent and privacy-safe PASS receipts', () => {
    expect(DocumentationClosureReceiptV1Schema.parse(closureReceipt)).toEqual(closureReceipt);
    expect(() =>
      DocumentationClosureReceiptV1Schema.parse({
        ...closureReceipt,
        verifierActorId: closureReceipt.actorId,
      }),
    ).toThrow(/must differ/u);
    expect(() =>
      DocumentationClosureReceiptV1Schema.parse({...closureReceipt, privacyStatus: 'UNKNOWN'}),
    ).toThrow(/privacy/u);
    expect(() =>
      DocumentationClosureReceiptV1Schema.parse({
        ...closureReceipt,
        sources: [],
        projections: [],
      }),
    ).toThrow(/requires sources, projections/u);
  });
});
