import {describe, expect, it} from 'vitest';

import {hashModel} from '../../../02_proceso/workflows/trainer-os/common.ts';
import {transition} from '../../../02_proceso/workflows/trainer-os/state-machine.ts';
import {TrainerRunManifestV1Schema} from '../../../02_proceso/workflows/trainer-os/trainer-run-manifest-v1.schema.ts';

const HASH = 'a'.repeat(64);
const ref = (name: string) => ({ref: `runs/example/${name}.json`, sha256: HASH});

const manifest = (overrides: Record<string, unknown> = {}) => {
  const value: Record<string, unknown> = {
    schemaVersion: 'trainer-run-manifest-v1',
    runId: 'example-run',
    manifestSha256: '',
    projectId: 'trainer-os',
    state: 'INTAKE',
    intakeRef: 'runs/example/intake.json',
    stateRef: 'runs/example/state.json',
    resumeRef: 'runs/example/resume.json',
    handoffRef: 'runs/example/handoff.json',
    invalidated: [],
    maximumState: 'RENDERED_DRAFT',
    effects: {network: false, connectors: false, publication: false},
    tokenBudget: {maximum: 8000, estimated: 0, measured: 0},
    ...overrides,
  };
  value.manifestSha256 = hashModel(value, 'manifestSha256');
  return value;
};

describe('Trainer OS PR1 fail-closed contracts', () => {
  it('rejects descendants that appear before their canonical state', () => {
    expect(
      TrainerRunManifestV1Schema.safeParse(
        manifest({routeSpec: ref('spec'), designLock: ref('design')}),
      ).success,
    ).toBe(false);
  });

  it('requires transitive invalidation of every descendant', () => {
    expect(
      TrainerRunManifestV1Schema.safeParse(
        manifest({invalidated: ['routeSpec'], designLock: ref('design')}),
      ).success,
    ).toBe(false);
  });

  it('binds declared refs to continuity and intake outputs', () => {
    const mismatched = manifest({
      state: 'CONTEXT_READY',
      intake: ref('other-intake'),
      stateOutput: ref('other-state'),
      resumeOutput: ref('other-resume'),
      handoffOutput: ref('other-handoff'),
    });
    expect(TrainerRunManifestV1Schema.safeParse(mismatched).success).toBe(false);
  });

  it('requires human review evidence before RENDERED_DRAFT', () => {
    const rendered = manifest({
      state: 'RENDERED_DRAFT',
      intake: ref('intake'),
      routeSpec: ref('spec'),
      designLock: ref('design'),
      artifactPlan: ref('plan'),
      buildManifest: ref('build'),
      verificationReceipt: ref('verification'),
      stateOutput: ref('state'),
      resumeOutput: ref('resume'),
      handoffOutput: ref('handoff'),
    });
    expect(TrainerRunManifestV1Schema.safeParse(rendered).success).toBe(false);
    const humanReviewReceipt = {
      ...ref('human-review'),
      actorId: 'H01',
      verdict: 'APPROVED',
      buildManifestSha256: HASH,
      verificationReceiptSha256: HASH,
    };
    rendered.humanReviewReceipt = humanReviewReceipt;
    rendered.manifestSha256 = hashModel(rendered, 'manifestSha256');
    expect(TrainerRunManifestV1Schema.safeParse(rendered).success).toBe(true);

    humanReviewReceipt.buildManifestSha256 = 'b'.repeat(64);
    rendered.manifestSha256 = hashModel(rendered, 'manifestSha256');
    expect(TrainerRunManifestV1Schema.safeParse(rendered).success).toBe(false);
  });

  it('rejects unknown and non-adjacent runtime transitions', () => {
    expect(() => transition('BOGUS' as never, 'INTAKE')).toThrow();
    expect(() => transition('INTAKE', 'SPEC_READY')).toThrow('TRAINER_INVALID_TRANSITION');
    expect(transition('INTAKE', 'CONTEXT_READY')).toBe('CONTEXT_READY');
  });
});
