import {describe, expect, it} from 'vitest';

import {prepareSubmission} from 'workflows/career/_runner/submission.ts';

const HASH_A = 'a'.repeat(64);
const HASH_B = 'b'.repeat(64);
const preview = {
  schema_version: 'submission-preview-v1',
  application_id: 'APP-SYNTHETIC-001',
  job_sha256: HASH_A,
  package_sha256: HASH_B,
  channel: 'company-careers',
  package_ref: 'work/private/career/packages/app-001.yml',
  blockers: [],
} as const;
const authorization = {
  schema_version: 'submission-authorization-v1',
  authorization_id: 'AUTH-SYNTHETIC-001',
  application_id: preview.application_id,
  job_sha256: preview.job_sha256,
  package_sha256: preview.package_sha256,
  channel: preview.channel,
  approver_actor_id: 'H01',
  single_use: true,
  status: 'authorized',
} as const;

describe('Career C09 submission boundary', () => {
  it('prepares and stops when authorization is absent', () => {
    expect(prepareSubmission(preview)).toMatchObject({
      authorization_valid: false,
      decision: 'PREPARED_STOP',
      next_gate: 'CR_SUBMISSION_AUTHORIZED',
    });
  });

  it('still prepares and stops with an exact valid authorization', () => {
    const result = prepareSubmission(preview, authorization);
    expect(result).toMatchObject({
      authorization_valid: true,
      decision: 'PREPARED_STOP',
      blockers: [],
    });
    expect(result.message).toMatch(/no submission authority/u);
    expect(JSON.stringify(result)).not.toContain('SUBMITTED');
  });

  it.each([
    ['application', {application_id: 'APP-DIFFERENT-001'}],
    ['job hash', {job_sha256: 'c'.repeat(64)}],
    ['package hash', {package_sha256: 'd'.repeat(64)}],
    ['channel', {channel: 'linkedin'}],
    ['status', {status: 'consumed'}],
  ])('invalidates authorization when %s drifts', (_label, drift) => {
    expect(prepareSubmission(preview, {...authorization, ...drift}).authorization_valid).toBe(
      false,
    );
  });

  it.each(['captcha', 'otp', 'legal_terms', 'sensitive_question', 'recorded_interview'] as const)(
    'preserves the %s human blocker and performs no submission',
    (blocker) => {
      const result = prepareSubmission({...preview, blockers: [blocker]}, authorization);
      expect(result).toMatchObject({decision: 'PREPARED_STOP', blockers: [blocker]});
    },
  );

  it('rejects unsafe package locators before evaluating authorization', () => {
    const absolutePrivateLocator = ['', 'Users', 'private', 'package.yml'].join('/');
    expect(() => prepareSubmission({...preview, package_ref: absolutePrivateLocator})).toThrow();
    expect(() => prepareSubmission({...preview, package_ref: '../outside/package.yml'})).toThrow();
  });
});
