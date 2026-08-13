import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {describe, expect, it} from 'vitest';

import {
  advanceVideoOs,
  assertVideoOsState,
  buildResumeCapsule,
  planVideoOs,
  validateVideoOsJob,
  type VideoOsState,
} from 'workflows/video-os/index.ts';

const HASH_A = 'a'.repeat(64);
const HASH_B = 'b'.repeat(64);
const readJson = <T>(path: string): T =>
  JSON.parse(readFileSync(resolve(process.cwd(), path), 'utf8')) as T;
const baseState = (overrides: Partial<VideoOsState> = {}): VideoOsState => ({
  schema_version: 'video-os-state-v1',
  job_id: 'VIDEO-SYNTHETIC-001',
  status: 'RENDERED_DRAFT',
  active_stage: 'V04',
  decisions_used: 3,
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
  ...overrides,
});
const verificationReceipt = (): NonNullable<VideoOsState['primary_verification_receipt']> => ({
  verifier_actor_id: 'ACTOR-VERIFIER-001',
  spec_sha256: HASH_A,
  manifest_sha256: HASH_B,
  render_sha256: 'c'.repeat(64),
  receipt_ref: 'work/private/video-os/synthetic/verification.json',
  receipt_sha256: 'd'.repeat(64),
  visual_evidence_sha256: createHash('sha256')
    .update(JSON.stringify(baseState().visual_evidence), 'utf8')
    .digest('hex'),
  verdict: 'PASS',
});

describe('Video OS fail-closed state and regression gates', () => {
  it('accepts only the declared linear state path and rejects skipped stages', () => {
    const intake = baseState({
      status: 'INTAKE',
      active_stage: 'V00',
      spec_sha256: null,
      manifest_sha256: null,
      manifest_spec_sha256: null,
      visual_evidence: null,
      evidence_refs: [],
    });
    const frozen = advanceVideoOs(
      {...intake, evidence_refs: ['work/private/video-os/synthetic/source-receipt.json']},
      'SOURCE_FROZEN',
    );

    expect(frozen.status).toBe('SOURCE_FROZEN');
    expect(() => advanceVideoOs(intake, 'SPEC_APPROVED')).toThrow(/ILLEGAL-TRANSITION/u);
  });

  it('requires material evidence, spec and current manifest at corresponding gates', () => {
    expect(() =>
      assertVideoOsState(
        baseState({
          status: 'SOURCE_FROZEN',
          active_stage: 'V01',
          spec_sha256: null,
          manifest_sha256: null,
          manifest_spec_sha256: null,
          visual_evidence: null,
          evidence_refs: [],
        }),
      ),
    ).toThrow(/SOURCE-EVIDENCE-REQUIRED/u);
    expect(() =>
      assertVideoOsState(
        baseState({
          status: 'SPEC_APPROVED',
          active_stage: 'V02',
          spec_sha256: null,
          manifest_sha256: null,
          manifest_spec_sha256: null,
          visual_evidence: null,
        }),
      ),
    ).toThrow(/SPEC-HASH-REQUIRED/u);
    expect(() =>
      assertVideoOsState(
        baseState({
          status: 'PLAN_COMPILED',
          active_stage: 'V03',
          manifest_sha256: null,
          manifest_spec_sha256: null,
          visual_evidence: null,
        }),
      ),
    ).toThrow(/MANIFEST-HASH-REQUIRED/u);
  });

  it('requires distinct producer, verifier and Guardian', () => {
    expect(() => assertVideoOsState(baseState({verifier_actor_id: 'ACTOR-PRODUCER-001'}))).toThrow(
      /ACTORS-MUST-BE-DISTINCT/u,
    );
  });

  it('rejects stale manifests and unverifiable terminal claims', () => {
    expect(() => assertVideoOsState(baseState({manifest_spec_sha256: HASH_B}))).toThrow(
      /STALE-MANIFEST/u,
    );
    expect(() => assertVideoOsState(baseState({status: 'VERIFIED'}))).toThrow(
      /VERIFICATION-RECEIPT-REQUIRED/u,
    );
  });

  it('requires scene-aware sampling and real motion evidence', () => {
    expect(() => assertVideoOsState(baseState({visual_evidence: null}))).toThrow(
      /VISUAL-EVIDENCE-REQUIRED/u,
    );
    expect(() =>
      assertVideoOsState(
        baseState({visual_evidence: {...baseState().visual_evidence!, samples_per_layout: 2}}),
      ),
    ).toThrow();
    expect(() =>
      assertVideoOsState(
        baseState({
          visual_evidence: {
            ...baseState().visual_evidence!,
            frozen_intro_frames: 1,
          } as unknown as VideoOsState['visual_evidence'],
        }),
      ),
    ).toThrow();
    expect(() =>
      assertVideoOsState(
        baseState({
          visual_evidence: {
            ...baseState().visual_evidence!,
            speaker_motion_verified: false,
          } as unknown as VideoOsState['visual_evidence'],
        }),
      ),
    ).toThrow();
  });

  it('blocks a secondary export until principal verification passes', () => {
    expect(() => assertVideoOsState(baseState({secondary_exports_requested: ['16:9']}))).toThrow(
      /PRIMARY-PASS-REQUIRED/u,
    );
    expect(
      assertVideoOsState(
        baseState({
          primary_verification: 'PASS',
          primary_verification_receipt: verificationReceipt(),
          secondary_exports_requested: ['16:9'],
        }),
      ).secondary_exports_requested,
    ).toEqual(['16:9']);
  });

  it('rejects a PASS receipt stale or not bound to visual evidence', () => {
    const receipt = {...verificationReceipt(), visual_evidence_sha256: 'e'.repeat(64)};
    expect(() =>
      assertVideoOsState(
        baseState({primary_verification: 'PASS', primary_verification_receipt: receipt}),
      ),
    ).toThrow(/PRIMARY-VERIFICATION-RECEIPT-MISMATCH/u);
    expect(() =>
      assertVideoOsState(
        baseState({
          primary_verification: 'PASS',
          primary_verification_receipt: {...verificationReceipt(), manifest_sha256: 'f'.repeat(64)},
        }),
      ),
    ).toThrow(/PRIMARY-VERIFICATION-RECEIPT-MISMATCH/u);
  });

  it('does not let an automatic validator grant HUMAN_APPROVED', () => {
    expect(() =>
      assertVideoOsState(
        baseState({
          status: 'HUMAN_APPROVED',
          primary_verification: 'PASS',
          primary_verification_receipt: verificationReceipt(),
        }),
      ),
    ).toThrow(/HUMAN-APPROVAL-RECEIPT-REQUIRED/u);
  });

  it('does not let the deterministic transition helper grant HUMAN_APPROVED', () => {
    expect(() =>
      advanceVideoOs(
        baseState({
          status: 'VERIFIED',
          primary_verification: 'PASS',
          primary_verification_receipt: verificationReceipt(),
        }),
        'HUMAN_APPROVED',
      ),
    ).toThrow(/MANUAL-GATE-EXTERNAL/u);
  });

  it('rejects state/stage drift', () => {
    expect(() => assertVideoOsState(baseState({active_stage: 'V03'}))).toThrow(
      /STAGE-STATE-MISMATCH/u,
    );
  });

  it('validates a job as deterministic plan plus governed state', () => {
    const plan = planVideoOs({
      request: 'Crear reel de evidencia',
      sourceRefs: ['work/private/video-os/source.mp4'],
      sourceAuthority: 'verified',
      rights: 'cleared',
    });
    const job = validateVideoOsJob({schema_version: 'video-os-job-v1', plan, state: baseState()});

    expect(job.plan.request_sha256).toBe(plan.request_sha256);
    expect(job.state.spec_sha256).toBe(HASH_A);
    expect(() =>
      validateVideoOsJob({
        schema_version: 'video-os-job-v1',
        plan: {...plan, unexpected: true},
        state: baseState(),
      }),
    ).toThrow();
  });

  it('builds a bounded resume capsule instead of replaying chat history', () => {
    const capsule = buildResumeCapsule(
      baseState({
        evidence_refs: Array.from({length: 40}, (_, index) => `work/private/evidence/${index}`),
        gaps: Array.from({length: 20}, (_, index) => `gap-${index}`),
      }),
    );

    expect(capsule.length).toBeLessThan(7_200);
    expect(capsule).toContain('decisions: 3/5');
    expect(capsule).not.toContain('work/private/evidence/39');
    expect(capsule).not.toContain('gap-19');
  });

  it('keeps the synthetic regression catalog complete and fail-closed', () => {
    const catalog = readJson<{
      schema_version: string;
      cases: Array<{id: string; condition: string; expected: string}>;
    }>('02_proceso/workflows/video-os/_assets/regressions.json');
    const expected = [
      'REG-MOTION-001',
      'REG-PRIVACY-001',
      'REG-PRIVACY-002',
      'REG-SPEAKER-001',
      'REG-SOURCE-001',
      'REG-MANIFEST-001',
      'REG-EXPORT-001',
    ];

    expect(catalog.schema_version).toBe('video-os-regressions-v1');
    expect(catalog.cases.map(({id}) => id)).toEqual(expect.arrayContaining(expected));
    expect(catalog.cases.every(({expected: verdict}) => verdict === 'BLOCKED')).toBe(true);
    expect(
      catalog.cases.map(({id}) => id).some((id, index, ids) => ids.indexOf(id) !== index),
    ).toBe(false);
  });
});
