import {describe, expect, it} from 'vitest';
import {validateAulaPromotionReviewV1} from '../../../02_proceso/workflows/multimedia/_schema/aula-promotion-review-v1.ts';
const evaluation = {status: 'PASS', actorId: 'RT-09-INDEPENDENT', sha256: 'a'.repeat(64)};
const valid = {
  status: 'PASS',
  role: 'RT-11',
  actorId: 'RT-11-INDEPENDENT',
  evaluationSha256: evaluation.sha256,
};
describe('Aula local draft promotion requires independent Guardian evidence', () => {
  it('accepts a separate Guardian tied to exact evaluation bytes', () =>
    expect(validateAulaPromotionReviewV1(valid, evaluation).actorId).toBe('RT-11-INDEPENDENT'));
  it.each([
    {actorId: {}},
    {actorId: ''},
    {actorId: 'RT-07'},
    {actorId: 'RT-09-INDEPENDENT'},
    {role: 'RT-09'},
    {evaluationSha256: 'b'.repeat(64)},
  ])('rejects %j', (patch) =>
    expect(() => validateAulaPromotionReviewV1({...valid, ...patch}, evaluation)).toThrow(),
  );
  it('rejects failed evaluation even when the review matches its hash', () =>
    expect(() => validateAulaPromotionReviewV1(valid, {...evaluation, status: 'FAIL'})).toThrow());
  it('rejects malformed evaluator identity', () =>
    expect(() => validateAulaPromotionReviewV1(valid, {...evaluation, actorId: {}})).toThrow());
});
