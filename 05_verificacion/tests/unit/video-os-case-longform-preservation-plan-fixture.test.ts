import {afterEach, describe, expect, it} from 'vitest';

import {
  CaseLongformPreservationPlan,
  CaseLongformPreservationPlanAuthoritySchema,
  CaseLongformPreservationPolicyReceipt,
} from 'workflows/video-os/index.ts';
import {
  cleanupCaseFixtures,
  writeCaseFixture,
} from './video-os-case-longform-coverage-fixture.test.ts';
import {materializeCaseLongformSemanticFixture} from './video-os-case-longform-semantic-fixture.test.ts';

const roi = (x: number, y: number, width: number, height: number) => ({x, y, width, height});
export const materializeCaseLongformPreservationPlanFixture = () => {
  const base = materializeCaseLongformSemanticFixture();
  const {root, options, semanticContract} = base;
  const a = semanticContract.artifacts;
  const maskOverlays = base.values.redaction.masks.map((mask) => ({
    overlay_id: `overlay-${mask.id}`,
    kind: 'MASK' as const,
    source_id: mask.id,
    start_frame: mask.start_frame,
    end_frame: mask.end_frame,
    roi: mask.roi,
  }));
  const caption = (id: string, source: 'one' | 'two', value: ReturnType<typeof roi>) => {
    const cue = base.values.captions.cues.find(({id: cueId}) => cueId === source)!;
    return {
      overlay_id: id,
      kind: 'CAPTION' as const,
      source_id: source,
      start_frame: cue.start_frame,
      end_frame: cue.end_frame,
      roi: value,
    };
  };
  const regions = [
    {
      region_id: 'danilo-dashboard-main',
      category: 'dashboards' as const,
      source_role: 'body' as const,
      source_start_frame: 4,
      source_end_frame: 6,
      source_roi: roi(0, 0, 300, 100),
    },
    {
      region_id: 'danilo-dashboard-secondary',
      category: 'dashboards' as const,
      source_role: 'body' as const,
      source_start_frame: 7,
      source_end_frame: 8,
      source_roi: roi(0, 200, 300, 100),
    },
  ];
  const participants = [
    {
      participant_id: 'danilo' as const,
      public_name: 'Danilo Cardona Estrada',
      regions,
      authorized_overlays: [
        ...maskOverlays,
        caption('caption-one', 'one', roi(0, 60, 300, 40)),
        caption('caption-two', 'two', roi(0, 260, 300, 40)),
      ],
      allowed_cross_category_overlaps: [],
    },
    {
      participant_id: 'alejandra' as const,
      public_name: 'Alejandra Calderón',
      regions: [
        {
          region_id: 'alejandra-interface',
          category: 'interfaces' as const,
          source_role: 'body' as const,
          source_start_frame: 4,
          source_end_frame: 5,
          source_roi: roi(500, 0, 200, 100),
        },
      ],
      authorized_overlays: [caption('alejandra-caption', 'one', roi(500, 60, 200, 40))],
      allowed_cross_category_overlaps: [],
    },
    {
      participant_id: 'natalia' as const,
      public_name: 'Natalia Andrade',
      regions: [
        {
          region_id: 'natalia-drawing',
          category: 'drawings' as const,
          source_role: 'body' as const,
          source_start_frame: 4,
          source_end_frame: 5,
          source_roi: roi(750, 0, 200, 100),
        },
      ],
      authorized_overlays: [caption('natalia-caption', 'one', roi(750, 60, 200, 40))],
      allowed_cross_category_overlaps: [],
    },
  ];
  const policyValue = CaseLongformPreservationPolicyReceipt.parse({
    schema_version: 'case-longform-preservation-policy-receipt-v1',
    kind: 'preservation_policy_receipt',
    job_id: semanticContract.job_id,
    plan_sha256: a.plan.sha256,
    source_set_sha256: semanticContract.source_set_sha256,
    previous_policy_sha256: a.semantic_policy_receipt_v3.sha256,
    actor_id: base.values.policyV3.actor_id,
    fps: 24,
    width: 1920,
    height: 1080,
    rgb_tolerance_per_channel: 0,
    minimum_residual_ratio_ppm: 500_000,
    participants,
  });
  const policy = writeCaseFixture(
    options.trustPolicy.authorityRoot,
    'preservation-policy.json',
    policyValue,
  );
  const body = base.values.sourceSet.sources.find(({role}) => role === 'body')!;
  const overlayIds = (region: (typeof regions)[number]) =>
    participants[0]!.authorized_overlays
      .filter(
        (overlay) =>
          overlay.start_frame <= region.source_end_frame + 5 &&
          overlay.end_frame >= region.source_start_frame + 5 &&
          Math.max(overlay.roi.x, region.source_roi.x) <
            Math.min(
              overlay.roi.x + overlay.roi.width,
              region.source_roi.x + region.source_roi.width,
            ) &&
          Math.max(overlay.roi.y, region.source_roi.y) <
            Math.min(
              overlay.roi.y + overlay.roi.height,
              region.source_roi.y + region.source_roi.height,
            ),
      )
      .map(({overlay_id}) => overlay_id);
  const planValue = CaseLongformPreservationPlan.parse({
    schema_version: 'case-longform-preservation-plan-v1',
    kind: 'preservation_plan',
    job_id: semanticContract.job_id,
    participant_id: 'danilo',
    graph_sha256: a.operation_graph.sha256,
    source_set_sha256: semanticContract.source_set_sha256,
    policy_sha256: policy.sha256,
    source_segment_map_sha256: a.source_segment_map.sha256,
    redaction_map_sha256: a.redaction_map.sha256,
    caption_track_sha256: a.caption_track.sha256,
    regions: regions.map((region) => ({
      ...region,
      source_sha256: body.media.sha256,
      output_start_frame: region.source_start_frame + 5,
      output_end_frame: region.source_end_frame + 5,
      output_roi: region.source_roi,
      overlay_ids: overlayIds(region),
    })),
  });
  const plan = writeCaseFixture(root, 'preservation-plan.json', planValue);
  const preservationContract = CaseLongformPreservationPlanAuthoritySchema.parse({
    schema_version: 'case-longform-preservation-plan-authority-v5a',
    job_id: semanticContract.job_id,
    source_set_sha256: semanticContract.source_set_sha256,
    artifacts: {...a, preservation_policy_receipt: policy, preservation_plan: plan},
    v4_status: semanticContract.status,
    status: 'BLOCKED_PENDING_RGB_DIFF_LEDGER_CONTRACTS',
  });
  return {
    ...base,
    preservationContract,
    preservationOptions: {...options, preservationToolAuthority: {...options.audioToolAuthority}},
    values: {...base.values, preservationPolicy: policyValue, preservationPlan: planValue},
  };
};

afterEach(cleanupCaseFixtures);
describe('case-longform preservation plan fixture', () => {
  it('materializes a blocked plan without an RGB ledger', () => {
    expect(materializeCaseLongformPreservationPlanFixture().preservationContract.status).toBe(
      'BLOCKED_PENDING_RGB_DIFF_LEDGER_CONTRACTS',
    );
  });
});
