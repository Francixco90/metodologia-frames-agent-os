import {z} from 'zod';

export const CAREER_SCORE_WEIGHTS = {
  evidence: 30,
  hard_requirements: 20,
  constraints: 15,
  transferability: 10,
  publication_quality: 10,
  sector: 5,
  application_friction: 5,
  legitimate_contact: 5,
} as const;

const ScoreInputSchema = z.strictObject({
  evidence: z.number().min(0).max(1),
  hard_requirements: z.number().min(0).max(1),
  constraints: z.number().min(0).max(1),
  transferability: z.number().min(0).max(1),
  publication_quality: z.number().min(0).max(1),
  sector: z.number().min(0).max(1),
  application_friction: z.number().min(0).max(1),
  legitimate_contact: z.number().min(0).max(1),
  mandatory_blockers: z.array(z.string().min(1)).max(20),
});

export type CareerScoreInput = z.infer<typeof ScoreInputSchema>;

export const scoreCareerOpportunity = (input: CareerScoreInput) => {
  const value = ScoreInputSchema.parse(input);
  const components = Object.fromEntries(
    Object.entries(CAREER_SCORE_WEIGHTS).map(([key, weight]) => [
      key,
      Number((value[key as keyof typeof CAREER_SCORE_WEIGHTS] * weight).toFixed(2)),
    ]),
  );
  const score = Number(
    Object.values(components)
      .reduce((total, component) => total + component, 0)
      .toFixed(2),
  );
  return {
    score,
    components,
    decision: value.mandatory_blockers.length > 0 ? ('BLOCKED' as const) : ('SCORED' as const),
    mandatory_blockers: value.mandatory_blockers,
  };
};
