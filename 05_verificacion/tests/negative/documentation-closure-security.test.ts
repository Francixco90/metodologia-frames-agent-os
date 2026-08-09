import {createHash} from 'node:crypto';
import {mkdtempSync, rmSync, symlinkSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

import {afterEach, describe, expect, it} from 'vitest';

import {
  DocumentationClosureReceiptV1Schema,
  DocumentationImpactPlanV1Schema,
  DocumentationSurfaceV1Schema,
  FramesWorkOrderV1Schema,
  hashExperienceValue,
} from 'core/contracts/index.ts';
import {verifyDocumentationClosureV1} from 'workflows/maintenance/index.ts';
import {verifyDocumentationGateInputV1} from '../../scripts/check-documentation-closure.ts';

const roots: string[] = [];
const digest = (value: string): string => createHash('sha256').update(value).digest('hex');
const candidateSha256 = 'c'.repeat(64);

const impactPlan = DocumentationImpactPlanV1Schema.parse({
  schemaVersion: 'documentation-impact-plan-v1',
  planId: 'DOC-PLAN-SEC-001',
  changeClass: 'CORRECT',
  scope: 'CANONICAL',
  affectedIds: ['content-os-router'],
  surfaces: DocumentationSurfaceV1Schema.options.map((surface) =>
    surface === 'INDEXES_INVENTORIES'
      ? {
          surface,
          disposition: 'REQUIRED' as const,
          sourceRefs: ['source.md'],
        }
      : {
          surface,
          disposition: 'NOT_APPLICABLE' as const,
          reasonCode: 'NO_USER_VISIBLE_CHANGE' as const,
        },
  ),
  canonicalSha256: 'a'.repeat(64),
});

const workOrder = FramesWorkOrderV1Schema.parse({
  schemaVersion: 'frames-work-order-v1',
  workOrderId: 'WO-DOC-SEC-001',
  requestHash: 'a'.repeat(64),
  routeId: 'R9',
  workflowId: 'M05',
  stepId: 'M05-S01',
  skillId: 'frames-docs-as-code',
  actorId: 'RT-10',
  readSet: ['source.md'],
  writeSet: ['projection.md'],
  inputs: [{ref: 'source.md', sha256: 'b'.repeat(64)}],
  expectedOutputs: ['projection.md'],
  tools: ['apply-patch'],
  effectClass: 'LOCAL_REVERSIBLE',
  budget: {targetFiles: 1, maxFiles: 2, targetTokens: 1_000, maxTokens: 2_000},
  acceptanceCriteria: ['El cierre documental es material y trazable.'],
  stopRule: 'Detener ante UNKNOWN.',
  changeClass: 'CORRECT',
  documentationImpact: impactPlan,
  canonicalSha256: 'd'.repeat(64),
});

const fixture = () => {
  const root = mkdtempSync(join(tmpdir(), 'frames-doc-gate-'));
  roots.push(root);
  const source = 'source\n';
  const projection = 'projection\n';
  writeFileSync(join(root, 'source.md'), source);
  writeFileSync(join(root, 'projection.md'), projection);
  const receipt = DocumentationClosureReceiptV1Schema.parse({
    schemaVersion: 'documentation-closure-receipt-v1',
    receiptId: 'DOC-CLOSE-SEC-001',
    impactPlanSha256: hashExperienceValue(impactPlan),
    candidateSha256,
    baseCommit: '1'.repeat(40),
    headCommit: '2'.repeat(40),
    actorId: 'RT-10',
    verifierActorId: 'RT-09',
    status: 'PASS' as const,
    sources: [{ref: 'source.md', sha256: digest(source)}],
    projections: [{ref: 'projection.md', sha256: digest(projection)}],
    checks: ['DOCS_TRANSVERSAL_COMPLETE'],
    privacyStatus: 'PASS' as const,
    canonicalSha256: 'e'.repeat(64),
  });
  return {root, receipt};
};

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, {recursive: true, force: true});
});

describe('documentation closure gate security', () => {
  it('executes the productive gate with mutation profile and material closure together', () => {
    const {root, receipt} = fixture();
    expect(
      verifyDocumentationGateInputV1(
        {workOrder, impactPlan, closureReceipt: receipt, candidateSha256},
        root,
        [
          {
            skillId: workOrder.skillId,
            mutationClasses: ['CORRECT'],
            documentationImpactRequired: true,
          },
        ],
      ),
    ).toEqual({
      schema_version: 'documentation-transversal-gate-v1',
      gate: 'DOCS_TRANSVERSAL_COMPLETE',
      status: 'PASS',
      reason_codes: [],
    });
  });
  it('passes only a causally bound, material closure', () => {
    const {root, receipt} = fixture();
    expect(
      verifyDocumentationClosureV1({
        root,
        workOrder,
        impactPlan,
        closureReceipt: receipt,
        candidateSha256,
      }),
    ).toEqual({status: 'PASS', gate: 'DOCS_TRANSVERSAL_COMPLETE', reasonCodes: []});
  });

  it('blocks stale plan, candidate and material hashes', () => {
    const {root, receipt} = fixture();
    const result = verifyDocumentationClosureV1({
      root,
      workOrder,
      impactPlan,
      closureReceipt: {
        ...receipt,
        impactPlanSha256: '0'.repeat(64),
        candidateSha256: '9'.repeat(64),
        projections: [{ref: 'projection.md', sha256: '8'.repeat(64)}],
      },
      candidateSha256,
    });
    expect(result.status).toBe('BLOCKED');
    expect(result.reasonCodes).toEqual(
      expect.arrayContaining([
        'DOCS-CANDIDATE001',
        'DOCS-PLAN-HASH001',
        'DOCS-HASH001:projection.md',
      ]),
    );
  });

  it('blocks symlinked evidence without following it', () => {
    const {root, receipt} = fixture();
    const outside = join(root, '..', `outside-${Date.now()}.md`);
    writeFileSync(outside, 'private\n');
    symlinkSync(outside, join(root, 'linked.md'));
    try {
      const result = verifyDocumentationClosureV1({
        root,
        workOrder,
        impactPlan,
        closureReceipt: {
          ...receipt,
          projections: [{ref: 'linked.md', sha256: digest('private\n')}],
        },
        candidateSha256,
      });
      expect(result).toMatchObject({status: 'BLOCKED'});
      expect(result.reasonCodes).toContain('DOCS-PATH002:linked.md');
    } finally {
      rmSync(outside, {force: true});
    }
  });
});
