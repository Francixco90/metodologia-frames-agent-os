import {z} from 'zod';
import {Sha256Schema} from '../../../core/contracts/index.ts';
export const AulaPromotionReviewV1Schema = z.strictObject({
  status: z.literal('PASS'),
  role: z.literal('RT-11'),
  actorId: z.string().trim().min(1).max(120),
  evaluationSha256: Sha256Schema,
});
export function validateAulaPromotionReviewV1(value: unknown, evaluation: unknown) {
  const authority = z
    .strictObject({
      status: z.literal('PASS'),
      actorId: z.string().trim().min(1).max(120),
      sha256: Sha256Schema,
    })
    .parse(evaluation);
  const review = AulaPromotionReviewV1Schema.parse(value);
  if (
    ['RT-07', 'RT-07-v1'].includes(review.actorId) ||
    review.actorId === authority.actorId ||
    review.evaluationSha256 !== authority.sha256
  )
    throw new Error('AULA_INDEPENDENT_REVIEW_INVALID');
  return review;
}
