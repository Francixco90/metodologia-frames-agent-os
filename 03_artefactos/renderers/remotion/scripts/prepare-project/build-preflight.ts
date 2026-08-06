// prepare-project/build-preflight.ts — builds the preflight render-input
// receipt binding source snapshot, digests and runtime policy. [CÓDIGO]
import type {Props} from './build-props.ts';
import type {CampaignCopy, Timeline} from './validate-inputs.ts';

export const buildPreflight = ({
  copy,
  timeline,
  claimLedgerDigest,
  assetsManifestDigest,
  props,
}: {
  readonly copy: CampaignCopy;
  readonly timeline: Timeline;
  readonly claimLedgerDigest: string;
  readonly assetsManifestDigest: string;
  readonly props: Props;
}) => ({
  requestId: 'REQ-REMOTION-VS001-001',
  projectId: copy.projectId,
  requestedState: copy.requestedState,
  governedWorkflowState: 'BLOCKED_BEFORE_SOURCE_LOCK',
  technicalValidationState: 'PREFLIGHT_VALIDATED',
  sourceSnapshot: {
    id: copy.sourceSnapshot.sourceSnapshotId,
    normalizedSha256: copy.sourceSnapshot.normalizedSha256,
  },
  claimsLedgerDigest: claimLedgerDigest,
  assetsManifestDigest,
  profile: {
    width: copy.profile.width,
    height: copy.profile.height,
    fps: copy.profile.fps,
    durationInFrames: timeline.durationInFrames,
  },
  props,
  runtime: {
    remotionVersion: '4.0.494',
    zodMajor: 4,
    networkAllowed: false,
    licenseVerdict: 'evaluation_only',
  },
});