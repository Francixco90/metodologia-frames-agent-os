import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {type VideoOsState} from '../../../02_proceso/workflows/video-os/index.ts';

export const HASH_A = 'a'.repeat(64);
export const HASH_B = 'b'.repeat(64);

export const createVideoOsCheckIo = (root: string, errors: string[]) => {
  const read = (path: string): string => readFileSync(resolve(root, path), 'utf8');
  return {
    read,
    readJson: <T>(path: string): T => JSON.parse(read(path)) as T,
    check: (condition: boolean, code: string): void => {
      if (!condition) errors.push(code);
    },
  };
};

export const makeVideoOsCheckState = (): VideoOsState => ({
  schema_version: 'video-os-state-v1',
  job_id: 'VIDEO-SYNTHETIC-CHECK-001',
  status: 'RENDERED_DRAFT',
  active_stage: 'V04',
  decisions_used: 4,
  spec_sha256: HASH_A,
  manifest_sha256: HASH_B,
  manifest_spec_sha256: HASH_A,
  primary_verification: 'NOT_RUN',
  primary_verification_receipt: null,
  visual_evidence: {
    shot_boundaries_resolved: true,
    privacy_mode: 'light',
    mask_strategy: 'field-level',
    samples_per_layout: 3,
    speaker_motion_verified: true,
    frozen_intro_frames: 0,
  },
  human_approval_receipt: null,
  secondary_exports_requested: [],
  evidence_refs: ['work/private/video-os/synthetic/review.json'],
  producer_actor_id: 'ACTOR-PRODUCER-001',
  verifier_actor_id: 'ACTOR-VERIFIER-001',
  guardian_actor_id: 'ACTOR-GUARDIAN-001',
  next_gate: 'VO_PRINCIPAL_VERIFIED',
  gaps: [],
});

export const makeVideoOsVerificationReceipt = (
  state: VideoOsState,
): NonNullable<VideoOsState['primary_verification_receipt']> => ({
  verifier_actor_id: state.verifier_actor_id,
  spec_sha256: HASH_A,
  manifest_sha256: HASH_B,
  render_sha256: 'c'.repeat(64),
  receipt_ref: 'work/private/video-os/synthetic/verification.json',
  receipt_sha256: 'd'.repeat(64),
  visual_evidence_sha256: createHash('sha256')
    .update(JSON.stringify(state.visual_evidence), 'utf8')
    .digest('hex'),
  verdict: 'PASS',
});

export const mustRejectVideoOsState = (
  candidate: VideoOsState,
  code: string,
  expected: RegExp,
  errors: string[],
  validate: (value: unknown) => unknown,
): void => {
  try {
    validate(candidate);
    errors.push(`${code} accepted`);
  } catch (error) {
    if (!expected.test(String(error))) errors.push(`${code} wrong error: ${String(error)}`);
  }
};
