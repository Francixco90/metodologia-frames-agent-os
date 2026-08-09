import {describe, expect, it} from 'vitest';

import {transitionCareerState} from 'workflows/career/_runner/state-machine.ts';
import {SubmissionAuthorizationV1Schema} from 'workflows/career/_schema/state-v1.schema.ts';

const HASH = 'a'.repeat(64);
const PACKAGE_HASH = 'b'.repeat(64);
const baseEvent = {
  schema_version: 'career-event-v1',
  event_id: 'EVT-SYNTHETIC-001',
  application_id: 'APP-SYNTHETIC-001',
  actor_id: 'ACTOR-PRODUCER-001',
  artifact_sha256: HASH,
  evidence_refs: ['work/private/career/evidence/receipt.yml'],
} as const;

const submittedPacket = () => ({
  event: {
    ...baseEvent,
    from: 'DRAFTED',
    to: 'SUBMITTED',
    kind: 'submission-confirmed',
    actor_id: 'ACTOR-SUBMITTER-001',
    artifact_sha256: PACKAGE_HASH,
    evidence_refs: ['work/private/career/confirmation.html'],
  },
  authorization: {
    schema_version: 'submission-authorization-v1',
    authorization_id: 'AUTH-SYNTHETIC-001',
    candidate_id: 'CAND-SYNTHETIC-001',
    application_id: 'APP-SYNTHETIC-001',
    job_sha256: HASH,
    package_sha256: PACKAGE_HASH,
    channel: 'company-careers',
    approver_actor_id: 'H01',
    single_use: true,
    status: 'authorized',
  },
  confirmation: {
    schema_version: 'submission-confirmation-receipt-v1',
    receipt_id: 'RCPT-SYNTHETIC-001',
    authorization_id: 'AUTH-SYNTHETIC-001',
    candidate_id: 'CAND-SYNTHETIC-001',
    application_id: 'APP-SYNTHETIC-001',
    channel: 'company-careers',
    job_sha256: HASH,
    package_sha256: PACKAGE_HASH,
    confirmation_ref: 'work/private/career/confirmation.html',
    confirmation_sha256: 'c'.repeat(64),
    submitted_by_actor_id: 'ACTOR-SUBMITTER-001',
    status: 'confirmed',
  },
  producer_actor_id: 'ACTOR-PRODUCER-001',
  verifier_actor_id: 'RT-09',
  guardian_actor_id: 'RT-11',
});

describe('Career OS fail-closed state machine', () => {
  it('admits only a captured DISCOVERED job as the initial event', () => {
    expect(
      transitionCareerState({...baseEvent, from: null, to: 'DISCOVERED', kind: 'job-captured'}),
    ).toBe('DISCOVERED');
    expect(() =>
      transitionCareerState({...baseEvent, from: null, to: 'VALIDATED', kind: 'job-validated'}),
    ).toThrow(/Initial event/u);
  });

  it('accepts the evidenced linear application path', () => {
    const path = [
      ['DISCOVERED', 'VALIDATED', 'job-validated'],
      ['VALIDATED', 'SHORTLISTED', 'fit-scored'],
      ['SHORTLISTED', 'PACKAGED', 'evidence-packaged'],
      ['PACKAGED', 'DRAFTED', 'documents-drafted'],
    ] as const;
    for (const [from, to, kind] of path) {
      expect(transitionCareerState({...baseEvent, from, to, kind})).toBe(to);
    }
    expect(transitionCareerState(submittedPacket())).toBe('SUBMITTED');
  });

  it('rejects skipped stages and incorrect evidence kinds', () => {
    expect(() =>
      transitionCareerState({
        ...baseEvent,
        from: 'DISCOVERED',
        to: 'SHORTLISTED',
        kind: 'fit-scored',
      }),
    ).toThrow(/Illegal career transition/u);
    expect(() =>
      transitionCareerState({
        ...baseEvent,
        from: 'DRAFTED',
        to: 'SUBMITTED',
        kind: 'documents-drafted',
      }),
    ).toThrow(/submission-confirmed/u);
  });

  it('never infers SUBMITTED without material confirmation evidence', () => {
    expect(() =>
      transitionCareerState({
        ...baseEvent,
        from: 'DRAFTED',
        to: 'SUBMITTED',
        kind: 'submission-confirmed',
        evidence_refs: [],
      }),
    ).toThrow();
  });

  it.each([
    [
      'authorization',
      (packet: ReturnType<typeof submittedPacket>) => ({
        ...packet,
        authorization: {...packet.authorization, package_sha256: 'd'.repeat(64)},
      }),
    ],
    [
      'visible receipt',
      (packet: ReturnType<typeof submittedPacket>) => ({
        ...packet,
        confirmation: {...packet.confirmation, confirmation_ref: 'work/private/career/other.html'},
      }),
    ],
    [
      'package binding',
      (packet: ReturnType<typeof submittedPacket>) => ({
        ...packet,
        confirmation: {...packet.confirmation, package_sha256: 'e'.repeat(64)},
      }),
    ],
    [
      'distinct actors',
      (packet: ReturnType<typeof submittedPacket>) => ({
        ...packet,
        verifier_actor_id: packet.producer_actor_id,
      }),
    ],
  ])('blocks DRAFTED → SUBMITTED when %s is invalid', (_label, mutate) => {
    expect(() => transitionCareerState(mutate(submittedPacket()))).toThrow();
  });

  it('keeps CLOSED terminal and constrains recovery from BLOCKED', () => {
    expect(() =>
      transitionCareerState({...baseEvent, from: 'CLOSED', to: 'VALIDATED', kind: 'job-validated'}),
    ).toThrow(/Illegal career transition/u);
    expect(
      transitionCareerState({
        ...baseEvent,
        from: 'BLOCKED',
        to: 'DRAFTED',
        kind: 'documents-drafted',
      }),
    ).toBe('DRAFTED');
    expect(() =>
      transitionCareerState({
        ...baseEvent,
        from: 'BLOCKED',
        to: 'SUBMITTED',
        kind: 'submission-confirmed',
      }),
    ).toThrow(/Illegal career transition/u);
  });

  it('requires a single-use H01 authorization bound to job, package and channel', () => {
    const authorization = SubmissionAuthorizationV1Schema.parse({
      schema_version: 'submission-authorization-v1',
      authorization_id: 'AUTH-SYNTHETIC-001',
      application_id: 'APP-SYNTHETIC-001',
      job_sha256: HASH,
      package_sha256: 'b'.repeat(64),
      channel: 'company-careers',
      approver_actor_id: 'H01',
      single_use: true,
      status: 'authorized',
    });
    expect(authorization).toMatchObject({approver_actor_id: 'H01', single_use: true});
    expect(
      SubmissionAuthorizationV1Schema.safeParse({...authorization, single_use: false}).success,
    ).toBe(false);
    expect(
      SubmissionAuthorizationV1Schema.safeParse({
        ...authorization,
        approver_actor_id: 'ACTOR-PRODUCER-001',
      }).success,
    ).toBe(false);
  });
});
