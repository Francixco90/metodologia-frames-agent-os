import {
  CaseLongformPreservationPlan,
  CaseLongformPreservationPlanAuthoritySchema,
  CaseLongformPreservationPolicyReceipt,
} from 'workflows/video-os/index.ts';
import {writeCaseFixture} from './video-os-case-longform-coverage.fixture.ts';
import {materializeCaseLongformSemanticFixture} from './video-os-case-longform-semantic.fixture.ts';

const roi = (x: number, y: number, width: number, height: number) => ({x, y, width, height});
const region = (
  region_id: string,
  category:
    | 'faces'
    | 'drawings'
    | 'products'
    | 'dashboards'
    | 'interfaces'
    | 'functional_text'
    | 'evidence'
    | 'captions'
    | 'motion',
  source_role: 'body' | 'closure',
  source_start_frame: number,
  source_end_frame: number,
  source_roi: ReturnType<typeof roi>,
) => ({region_id, category, source_role, source_start_frame, source_end_frame, source_roi});
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
  const regions = [
    region('danilo-dashboard-main', 'dashboards', 'body', 4, 5, roi(0, 0, 500, 400)),
    region('danilo-dashboard-secondary', 'dashboards', 'body', 6, 7, roi(0, 500, 300, 100)),
    region('danilo-interface', 'interfaces', 'body', 4, 5, roi(600, 0, 150, 80)),
    region('danilo-functional', 'functional_text', 'body', 4, 5, roi(800, 0, 150, 80)),
    region('danilo-evidence', 'evidence', 'body', 4, 5, roi(1000, 0, 150, 80)),
    region('danilo-motion', 'motion', 'closure', 0, 1, roi(1200, 0, 150, 80)),
  ];
  const categoryRegions = (prefix: string, categories: Parameters<typeof region>[1][]) =>
    categories.map((category, index) =>
      region(
        prefix + '-' + category,
        category,
        'body',
        4,
        5,
        roi((index % 6) * 250, 400 + Math.floor(index / 6) * 150, 180, 80),
      ),
    );
  const participants = [
    {
      participant_id: 'danilo' as const,
      public_name: 'Danilo Cardona Estrada',
      regions,
      authorized_overlays: maskOverlays,
      allowed_cross_category_overlaps: [],
    },
    {
      participant_id: 'alejandra' as const,
      public_name: 'Alejandra Calderón',
      regions: categoryRegions('alejandra', [
        'dashboards',
        'interfaces',
        'functional_text',
        'faces',
        'evidence',
        'captions',
        'motion',
      ]),
      authorized_overlays: [],
      allowed_cross_category_overlaps: [],
    },
    {
      participant_id: 'natalia' as const,
      public_name: 'Natalia Andrade',
      regions: categoryRegions('natalia', [
        'faces',
        'drawings',
        'products',
        'dashboards',
        'interfaces',
        'functional_text',
        'evidence',
        'captions',
        'motion',
      ]),
      authorized_overlays: [],
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
    minimum_residual_ratio_ppm: 900_000,
    participants,
  });
  const policy = writeCaseFixture(
    options.trustPolicy.authorityRoot,
    'preservation-policy.json',
    policyValue,
  );
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
    regions: regions.map((value) => {
      const source = base.values.sourceSet.sources.find(({role}) => role === value.source_role)!;
      const segment = base.values.segments.segments.find(
        (item) =>
          item.role === value.source_role &&
          item.source_start_frame <= value.source_start_frame &&
          item.source_end_frame >= value.source_end_frame,
      )!;
      const output_start_frame =
        segment.output_start_frame + value.source_start_frame - segment.source_start_frame;
      return {
        ...value,
        source_sha256: source.media.sha256,
        output_start_frame,
        output_end_frame: output_start_frame + value.source_end_frame - value.source_start_frame,
        output_roi: value.source_roi,
        overlay_ids: overlayIds(value),
      };
    }),
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
    preservationOptions: {...options, preservationToolAuthority: {...options.mediaToolAuthority}},
    values: {...base.values, preservationPolicy: policyValue, preservationPlan: planValue},
  };
};
