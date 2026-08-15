import {afterEach, describe, expect, it} from 'vitest';

import {assertCaseLongformPreservationPlanAuthority} from 'workflows/video-os/index.ts';
import {CaseLongformRedactionMap} from 'workflows/video-os/_runner/case-longform-graph-structure.ts';
import {assertCaseLongformPreservationPlanGeometry} from 'workflows/video-os/_runner/case-longform-preservation-plan-geometry.ts';
import {
  cleanupCaseFixtures,
  writeCaseFixture,
} from './video-os-case-longform-coverage-fixture.test.ts';
import {materializeCaseLongformPreservationPlanFixture} from './video-os-case-longform-preservation-plan-fixture.test.ts';

type Fixture = ReturnType<typeof materializeCaseLongformPreservationPlanFixture>;
const validate = (fixture: Fixture) =>
  assertCaseLongformPreservationPlanAuthority(
    fixture.preservationContract,
    fixture.preservationOptions,
  );
const rewritePolicy = (fixture: Fixture): void => {
  const ref = fixture.preservationContract.artifacts.preservation_policy_receipt;
  const policy = writeCaseFixture(
    fixture.options.trustPolicy.authorityRoot,
    ref.ref,
    fixture.values.preservationPolicy,
  );
  fixture.preservationContract.artifacts.preservation_policy_receipt = policy;
  fixture.values.preservationPlan.policy_sha256 = policy.sha256;
  fixture.preservationContract.artifacts.preservation_plan = writeCaseFixture(
    fixture.root,
    fixture.preservationContract.artifacts.preservation_plan.ref,
    fixture.values.preservationPlan,
  );
};
const overlap = (a: {x: number; y: number; width: number; height: number}, b: typeof a) =>
  Math.max(a.x, b.x) < Math.min(a.x + a.width, b.x + b.width) &&
  Math.max(a.y, b.y) < Math.min(a.y + a.height, b.y + b.height);
afterEach(cleanupCaseFixtures);

describe('case-longform PR1c1a preservation plan safety', () => {
  it('accepts 8/900000 boundaries and rejects 9 or 899999', () => {
    const safe = materializeCaseLongformPreservationPlanFixture();
    safe.values.preservationPolicy.rgb_tolerance_per_channel = 8;
    rewritePolicy(safe);
    expect(validate(safe).status).toBe('BLOCKED_PENDING_RGB_DIFF_LEDGER_CONTRACTS');
    for (const [field, value] of [
      ['rgb_tolerance_per_channel', 9],
      ['minimum_residual_ratio_ppm', 899_999],
    ] as const) {
      const invalid = materializeCaseLongformPreservationPlanFixture();
      invalid.values.preservationPolicy[field] = value;
      rewritePolicy(invalid);
      expect(() => validate(invalid)).toThrow();
    }
  });
  it('rejects CAPTION as a preservation exclusion', () => {
    const caption = materializeCaseLongformPreservationPlanFixture();
    // @ts-expect-error adversarial strict-schema input
    caption.values.preservationPolicy.participants[0]!.authorized_overlays[0]!.kind = 'CAPTION';
    rewritePolicy(caption);
    expect(() => validate(caption)).toThrow();
  });
  it('rejects an unknown material MASK source', () => {
    const unknown = materializeCaseLongformPreservationPlanFixture();
    unknown.values.preservationPolicy.participants[0]!.authorized_overlays[0]!.source_id =
      'unknown';
    rewritePolicy(unknown);
    expect(() => validate(unknown)).toThrow(/MASK-DRIFT/u);
  });
  it.each([
    [
      'extra category',
      (fixture: Fixture) => {
        const participant = fixture.values.preservationPolicy.participants[0]!;
        participant.regions.push({
          ...participant.regions[0]!,
          region_id: 'extra',
          category: 'faces',
          source_roi: {x: 1600, y: 900, width: 100, height: 100},
        });
      },
    ],
    [
      'dashboard at intro',
      (fixture: Fixture) => {
        fixture.values.preservationPolicy.participants[0]!.regions[0]!.source_role = 'intro';
      },
    ],
  ] as const)('rejects canonical allowlist %s', (_name, mutate) => {
    const fixture = materializeCaseLongformPreservationPlanFixture();
    mutate(fixture);
    rewritePolicy(fixture);
    expect(() => validate(fixture)).toThrow(/CANONICAL-ALLOWLIST/u);
  });
  it.each(['full-frame', '99.99-percent'] as const)(
    'rejects %s material MASK union before an RGB ledger',
    (variant) => {
      const fixture = materializeCaseLongformPreservationPlanFixture();
      const policy = structuredClone(fixture.values.preservationPolicy);
      const plan = structuredClone(fixture.values.preservationPlan);
      const redaction = CaseLongformRedactionMap.parse(structuredClone(fixture.values.redaction));
      const masks = redaction.masks;
      masks[0]!.roi =
        variant === 'full-frame'
          ? {x: 0, y: 0, width: 1920, height: 1080}
          : {x: 0, y: 0, width: 500, height: 399};
      if (variant === '99.99-percent') masks[1]!.roi = {x: 0, y: 399, width: 480, height: 1};
      const overlays = policy.participants[0]!.authorized_overlays;
      overlays.forEach((overlay) => {
        overlay.roi = masks.find(({id}) => id === overlay.source_id)!.roi;
      });
      plan.regions.forEach((region) => {
        region.overlay_ids = overlays
          .filter(
            (overlay) =>
              overlay.start_frame <= region.output_end_frame &&
              overlay.end_frame >= region.output_start_frame &&
              overlap(overlay.roi, region.output_roi),
          )
          .map(({overlay_id}) => overlay_id);
      });
      expect(() =>
        assertCaseLongformPreservationPlanGeometry(policy, plan, {
          sourceSet: fixture.values.sourceSet,
          segments: fixture.values.segments,
          redaction,
        }),
      ).toThrow(/RESIDUAL-RATIO/u);
    },
  );
});
