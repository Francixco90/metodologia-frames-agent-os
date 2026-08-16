import {describe, expect, it} from 'vitest';

import {
  CASE_LONGFORM_CAPTION_REVIEW_CHECKS,
  assertCaseLongformCaptionReviewPlanContract,
  caseLongformCaptionReviewPlanStatus,
} from 'workflows/video-os/index.ts';
import {
  caseLongformCaptionReviewLedgerRef,
  caseLongformCaptionReviewPlanRef,
  cleanupCaseLongformCaptionReviewPlanFixtures,
  materializeCaseLongformCaptionReviewPlanFixture,
} from '../../../tests/fixtures/video-os-case-longform-caption-review-plan.fixture.ts';

type Fixture = ReturnType<typeof materializeCaseLongformCaptionReviewPlanFixture>;
const validate = (fixture: Fixture) => assertCaseLongformCaptionReviewPlanContract(fixture);
const rewritePlan = (fixture: Fixture): void => {
  fixture.contract.artifacts.caption_external_review_plan = caseLongformCaptionReviewPlanRef(
    fixture.plan,
  );
};
const rewriteLedger = (fixture: Fixture): void => {
  fixture.contract.artifacts.caption_execution_ledger = caseLongformCaptionReviewLedgerRef(
    fixture.ledger,
  );
};
const withFixture = (test: (fixture: Fixture) => void): void => {
  const fixture = materializeCaseLongformCaptionReviewPlanFixture();
  try {
    test(fixture);
  } finally {
    cleanupCaseLongformCaptionReviewPlanFixtures();
  }
};

describe('case-longform V7c0 external caption review plan contract', () => {
  it('validates only the structural projection and keeps the full-chain gap explicit', () =>
    withFixture((fixture) => {
      const result = validate(fixture);
      expect(result.status).toBe('PRE_RENDER_BLOCKED');
      expect(result.coverage_gap).toBe('V7C_FULL_CHAIN_FIXTURE_NOT_ACCREDITED');
    }));

  it('derives the exact ledger-entry by five-check task product without outcomes', () =>
    withFixture((fixture) => {
      expect(fixture.plan.tasks).toHaveLength(
        fixture.ledger.entries.length * CASE_LONGFORM_CAPTION_REVIEW_CHECKS.length,
      );
      expect(fixture.plan.tasks.map(({sequence}) => sequence)).toEqual(
        fixture.plan.tasks.map((_task, index) => index),
      );
      expect(fixture.plan.tasks.slice(0, 5).map(({check}) => check)).toEqual(
        CASE_LONGFORM_CAPTION_REVIEW_CHECKS,
      );
      expect(fixture.plan).not.toHaveProperty('verdict');
      expect(fixture.plan).not.toHaveProperty('receipt');
    }));

  it('accepts only the exact positive ledger order 0..n-1', () =>
    withFixture((fixture) => {
      expect(fixture.ledger.entries.map(({sequence}) => sequence)).toEqual([0, 1]);
      expect(validate(fixture).status).toBe('PRE_RENDER_BLOCKED');
    }));

  it('rejects ledger sequence=999 even when the ledger ref is recomputed', () =>
    withFixture((fixture) => {
      fixture.ledger.entries[0]!.sequence = 999;
      rewriteLedger(fixture);
      expect(() => validate(fixture)).toThrow(/LEDGER-SEQUENCE-DRIFT/u);
    }));

  it('rejects duplicated ledger sequences [0,0]', () =>
    withFixture((fixture) => {
      fixture.ledger.entries[1]!.sequence = 0;
      rewriteLedger(fixture);
      expect(() => validate(fixture)).toThrow(/LEDGER-SEQUENCE-DRIFT/u);
    }));

  it('rejects reordered ledger sequences [1,0]', () =>
    withFixture((fixture) => {
      fixture.ledger.entries[0]!.sequence = 1;
      fixture.ledger.entries[1]!.sequence = 0;
      rewriteLedger(fixture);
      expect(() => validate(fixture)).toThrow(/LEDGER-SEQUENCE-DRIFT/u);
    }));

  it('rejects ledger job_id drift before plan derivation', () =>
    withFixture((fixture) => {
      fixture.ledger.job_id = 'forged-job';
      rewriteLedger(fixture);
      expect(() => validate(fixture)).toThrow(/LEDGER-BINDING-DRIFT/u);
    }));

  it('rejects ledger graph_sha256 drift before plan derivation', () =>
    withFixture((fixture) => {
      fixture.ledger.graph_sha256 = '0'.repeat(64);
      rewriteLedger(fixture);
      expect(() => validate(fixture)).toThrow(/LEDGER-BINDING-DRIFT/u);
    }));

  it('rejects loss of the Danilo PRE_RENDER_BLOCKED state between V4 and V7b', () =>
    withFixture((fixture) => {
      fixture.contract.v7b_status = 'BLOCKED_PENDING_CAPTION_VISUAL_EVIDENCE_CONTRACTS';
      expect(() => validate(fixture)).toThrow(/V7B-STATUS-DRIFT/u);
    }));

  it('rejects an injected PRE_RENDER_BLOCKED V7b state for a non-blocked V4 participant', () =>
    withFixture((fixture) => {
      fixture.contract.v4_status = 'BLOCKED_PENDING_PRESERVATION_AND_EXTERNAL_REVIEW_CONTRACTS';
      fixture.contract.status =
        'BLOCKED_PENDING_V7C_FULL_CHAIN_FIXTURE_AND_CAPTION_VISUAL_EVIDENCE_CONTRACTS';
      expect(() => validate(fixture)).toThrow(/V7B-STATUS-DRIFT/u);
    }));

  it('maps non-Danilo V4 status only to the explicit full-chain blocked state', () => {
    expect(
      caseLongformCaptionReviewPlanStatus(
        'BLOCKED_PENDING_PRESERVATION_AND_EXTERNAL_REVIEW_CONTRACTS',
      ),
    ).toBe('BLOCKED_PENDING_V7C_FULL_CHAIN_FIXTURE_AND_CAPTION_VISUAL_EVIDENCE_CONTRACTS');
  });

  it.each([
    [
      'relative',
      (fixture: Fixture): void => void (fixture.contract.planned_review_authority_root = '.'),
    ],
    [
      'noncanonical',
      (fixture: Fixture): void =>
        void (fixture.contract.planned_review_authority_root = '/v7c0/./review'),
    ],
    [
      'overlap',
      (fixture: Fixture): void =>
        void (fixture.contract.planned_review_authority_root = fixture.trust.priorRoots[0]!),
    ],
  ] as const)('rejects %s review roots', (_label, mutate) =>
    withFixture((fixture) => {
      mutate(fixture);
      expect(() => validate(fixture)).toThrow(/ROOT/u);
    }),
  );

  it.each([
    ['planner', 'trustedPlannerActorIds'],
    ['review verifier', 'trustedCaptionVerifierActorIds'],
    ['guardian', 'trustedGuardianActorIds'],
  ] as const)('rejects an untrusted %s', (_label, key) =>
    withFixture((fixture) => {
      fixture.trust[key] = [];
      expect(() => validate(fixture)).toThrow(/ACTOR-DRIFT/u);
    }),
  );

  it('rejects review actors reused from prior authorities or from each other', () =>
    withFixture((fixture) => {
      fixture.contract.review_actors.planner =
        fixture.base.contract.caption_actors.layout_authority;
      fixture.trust.trustedPlannerActorIds = [fixture.contract.review_actors.planner];
      expect(() => validate(fixture)).toThrow(/ACTOR-DRIFT/u);
      fixture.contract.review_actors.planner = fixture.contract.review_actors.guardian;
      fixture.trust.trustedPlannerActorIds = [fixture.contract.review_actors.planner];
      expect(() => validate(fixture)).toThrow(/ACTOR-DRIFT/u);
    }));

  it.each([
    ['omission', (fixture: Fixture): void => void fixture.plan.tasks.pop()],
    [
      'extra',
      (fixture: Fixture): void =>
        void fixture.plan.tasks.push({...fixture.plan.tasks[0]!, task_id: 'extra'}),
    ],
    ['reorder', (fixture: Fixture): void => void fixture.plan.tasks.reverse()],
    [
      'entry forgery',
      (fixture: Fixture): void =>
        void (fixture.plan.tasks[0]!.caption_entry_sha256 = '0'.repeat(64)),
    ],
  ] as const)('rejects task %s', (_label, mutate) =>
    withFixture((fixture) => {
      mutate(fixture);
      rewritePlan(fixture);
      expect(() => validate(fixture)).toThrow(/PLAN-DRIFT/u);
    }),
  );

  it('rejects artifact aliases and status promotion', () =>
    withFixture((fixture) => {
      fixture.contract.artifacts.caption_external_review_plan =
        fixture.contract.artifacts.caption_execution_ledger;
      expect(() => validate(fixture)).toThrow(/REF-ALIAS/u);
      const promoted = materializeCaseLongformCaptionReviewPlanFixture();
      promoted.contract.status =
        'BLOCKED_PENDING_V7C_FULL_CHAIN_FIXTURE_AND_CAPTION_VISUAL_EVIDENCE_CONTRACTS';
      expect(() => validate(promoted)).toThrow(/STATUS-DRIFT/u);
    }));

  it('strictly rejects outcomes, receipts and render lifecycle aliases', () =>
    withFixture((fixture) => {
      expect(() =>
        assertCaseLongformCaptionReviewPlanContract({
          ...fixture,
          contract: {
            ...fixture.contract,
            observation: {},
            evidence: {},
            verdict: 'PASS',
            receipt: {},
            media: {},
            render: {},
            effects: true,
          },
        }),
      ).toThrow();
      const plan = {...fixture.plan, verdict: 'PASS', receipt: {}};
      expect(() => assertCaseLongformCaptionReviewPlanContract({...fixture, plan})).toThrow();
    }));
});
