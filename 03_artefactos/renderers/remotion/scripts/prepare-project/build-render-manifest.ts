// prepare-project/build-render-manifest.ts — builds the initial render manifest
// binding every deterministic input to its sha256. Key order byte-stable. [CÓDIGO]
import type {CampaignCopy} from './validate-inputs.ts';
import type {buildPreflight} from './build-preflight.ts';

type Preflight = ReturnType<typeof buildPreflight>;

export type RenderManifestDigests = {
  readonly inputProps: string;
  readonly assetsManifest: string;
  readonly componentRegistry: string;
  readonly rendererEntryPath: string;
  readonly rendererEntry: string;
  readonly rawBeatMap: string;
  readonly rawCaptions: string;
  readonly rawCommitteeDecision: string;
  readonly lockfile: string;
};

export const buildRenderManifest = ({
  copy,
  preflight,
  digests,
}: {
  readonly copy: CampaignCopy;
  readonly preflight: Preflight;
  readonly digests: RenderManifestDigests;
}) => ({
  schema_version: 1,
  manifest_id: 'RENDER-MANIFEST-VS001-001',
  artifact_id: copy.workProductId,
  composition_id: 'MethodologiaVertical',
  governed_workflow_state: 'BLOCKED_BEFORE_SOURCE_LOCK',
  technical_validation_state: 'PREFLIGHT_VALIDATED',
  state_scope: 'technical_local_only_not_a_governed_transition_receipt',
  visible_status: copy.requestedState,
  visible_scope: copy.scopeBadge,
  source_snapshot_id: copy.sourceSnapshot.sourceSnapshotId,
  source_normalized_sha256: copy.sourceSnapshot.normalizedSha256,
  profile: preflight.profile,
  audio: {expected_streams: ['video'], mode: 'silent-first'},
  inputs: [
    {path: 'projects/vs-001-source-to-campaign/remotion/05-input-props.json', sha256: digests.inputProps},
    {
      path: 'projects/vs-001-source-to-campaign/remotion/assets-manifest.yml',
      sha256: digests.assetsManifest,
    },
    {
      path: 'projects/vs-001-source-to-campaign/remotion/04-component-registry.yml',
      sha256: digests.componentRegistry,
    },
    {path: digests.rendererEntryPath, sha256: digests.rendererEntry},
    {
      path: 'projects/vs-001-source-to-campaign/remotion/02-beat-map.yml',
      sha256: digests.rawBeatMap,
    },
    {
      path: 'projects/vs-001-source-to-campaign/remotion/captions.json',
      sha256: digests.rawCaptions,
    },
    {
      path: 'projects/vs-001-source-to-campaign/remotion/committee/committee-decision.json',
      sha256: digests.rawCommitteeDecision,
    },
    {path: 'pnpm-lock.yaml', sha256: digests.lockfile},
  ],
  expected_outputs: [
    'projects/vs-001-source-to-campaign/remotion/receipts/media/vs-001-smoke.mp4',
    'projects/vs-001-source-to-campaign/remotion/receipts/media/vs-001-review-a.mp4',
    'projects/vs-001-source-to-campaign/remotion/receipts/media/vs-001-review-b.mp4',
  ],
  outputs: [],
  review_shots: [],
  deterministic_pixel_match: 'pending',
  human_review: 'pending',
  publish_authorized: false,
  coverage_gaps: [
    'four_canonical_texts_missing_0_of_4',
    'formal_component_registry_approval_receipt_absent',
    'cross_host_chromium_pixel_equivalence_unverified',
    'font_binary_origin_version_unresolved',
    'authoritative_linux_network_namespace_offline_render_unexecuted',
    'remotion_commercial_license_eligibility_unresolved',
    'guardian_and_human_approval_absent',
    'external_distribution_not_authorized',
  ],
});