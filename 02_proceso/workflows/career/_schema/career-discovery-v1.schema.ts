import {z} from 'zod';

import {CareerIdSchema, Sha256Schema} from './primitives-v1.schema.ts';

const PrivateSourceRefSchema = z
  .string()
  .min(1)
  .max(500)
  .refine(
    (value) =>
      value.startsWith('03_artefactos/work/private/') &&
      !value.startsWith('~/') &&
      !value.includes('\\') &&
      !value.split('/').includes('..') &&
      !/^[a-z][a-z0-9+.-]*:/iu.test(value),
    'Expected a portable private reference without locator or protocol',
  );

const SourceSchema = z.strictObject({
  source_id: CareerIdSchema,
  source_type: z.enum([
    'cv',
    'certificate',
    'performance_review',
    'role_description',
    'project',
    'portfolio',
    'interview_answer',
    'other',
  ]),
  source_ref: PrivateSourceRefSchema,
  source_sha256: Sha256Schema,
  authority: z.enum(['first_party_material', 'candidate_statement', 'external_requirement']),
});

const GapSchema = z.strictObject({
  gap_id: CareerIdSchema,
  dimension: z.enum([
    'identity',
    'chronology',
    'achievement',
    'competency',
    'metric',
    'attribution',
    'role_family',
    'contradiction',
    'evidence',
  ]),
  severity: z.enum(['blocking', 'non_blocking']),
  status: z.enum(['open', 'accepted', 'resolved']),
  prompt_hint: z.string().min(1).max(280),
});

const QuestionSchema = z.strictObject({
  question_id: CareerIdSchema,
  gap_ids: z.array(CareerIdSchema).min(1),
  kind: z.enum(['context', 'challenge', 'action', 'result', 'attribution', 'evidence', 'limit']),
  prompt: z.string().min(1).max(360),
  answer: z.string().min(1).max(4000).nullable(),
});

export const CareerDiscoverySessionV1Schema = z
  .strictObject({
    schema_version: z.literal('career-discovery-session-v1'),
    session_id: CareerIdSchema,
    candidate_id: CareerIdSchema,
    source_inventory: z.array(SourceSchema).min(1),
    role_families: z.array(z.string().min(1).max(120)).min(1),
    gaps: z.array(GapSchema),
    rounds: z
      .array(
        z.strictObject({
          round_number: z.number().int().min(1).max(4),
          status: z.enum(['open', 'completed', 'paused']),
          questions: z.array(QuestionSchema).min(1).max(3),
        }),
      )
      .max(4),
    state: z.enum(['SOURCE_REVIEW', 'INTERVIEW_REQUIRED', 'PAUSED', 'READY_FOR_CONFIRMATION']),
    next_gate: z.enum(['CR_CAREER_DISCOVERY_CONTINUE', 'CR_CAREER_EVIDENCE_CONFIRM']),
    session_sha256: Sha256Schema,
  })
  .superRefine((value, context) => {
    const sourceIds = value.source_inventory.map(({source_id}) => source_id);
    if (new Set(sourceIds).size !== sourceIds.length) {
      context.addIssue({code: 'custom', message: 'source_id must be unique'});
    }
    const declaredGapIds = value.gaps.map(({gap_id}) => gap_id);
    if (new Set(declaredGapIds).size !== declaredGapIds.length) {
      context.addIssue({code: 'custom', message: 'gap_id must be unique'});
    }
    if (value.rounds.some(({round_number}, index) => round_number !== index + 1)) {
      context.addIssue({code: 'custom', message: 'round_number must be sequential from one'});
    }
    const firstPending = value.rounds.findIndex(({status}) => status !== 'completed');
    if (
      firstPending >= 0 &&
      (firstPending !== value.rounds.length - 1 ||
        value.rounds.filter(({status}) => status !== 'completed').length !== 1)
    ) {
      context.addIssue({code: 'custom', message: 'only the terminal round may be open or paused'});
    }
    const gapIds = new Set(declaredGapIds);
    const questionIds = new Set<string>();
    for (const round of value.rounds) {
      for (const question of round.questions) {
        if (questionIds.has(question.question_id)) {
          context.addIssue({code: 'custom', message: 'question_id must be unique'});
        }
        questionIds.add(question.question_id);
        if (question.gap_ids.some((gapId) => !gapIds.has(gapId))) {
          context.addIssue({code: 'custom', message: 'question references an unknown gap'});
        }
        if (round.status === 'completed' && question.answer === null) {
          context.addIssue({code: 'custom', message: 'completed rounds require every answer'});
        }
      }
    }
    const expectedGate =
      value.state === 'READY_FOR_CONFIRMATION'
        ? 'CR_CAREER_EVIDENCE_CONFIRM'
        : 'CR_CAREER_DISCOVERY_CONTINUE';
    if (value.next_gate !== expectedGate) {
      context.addIssue({code: 'custom', message: 'state and next_gate do not match'});
    }
    if (value.state === 'SOURCE_REVIEW' && value.rounds.length > 0) {
      context.addIssue({code: 'custom', message: 'source review cannot contain interview rounds'});
    }
    if (value.state === 'INTERVIEW_REQUIRED' && value.rounds.at(-1)?.status !== 'open') {
      context.addIssue({code: 'custom', message: 'interview required needs an open round'});
    }
    if (value.state === 'PAUSED' && value.rounds.at(-1)?.status !== 'paused') {
      context.addIssue({code: 'custom', message: 'paused state needs a paused round'});
    }
    if (
      value.state === 'READY_FOR_CONFIRMATION' &&
      (value.gaps.some(({status}) => status === 'open') ||
        value.rounds.some(({status}) => status !== 'completed'))
    ) {
      context.addIssue({code: 'custom', message: 'confirmation requires closed gaps and rounds'});
    }
  });

export type CareerDiscoverySessionV1 = z.infer<typeof CareerDiscoverySessionV1Schema>;
