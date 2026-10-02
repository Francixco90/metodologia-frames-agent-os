import {z} from 'zod';
import {RelativePathSchema, Sha256Schema} from '../../../core/contracts/index.ts';
import {AulaBuildBindingV1Schema} from './aula-dependencies-v1.ts';

export const AulaEditionV1Schema = z.enum(['metodologia', 'white-label']);
const identity = {
  decision: z.literal('APPROVED'),
  actor: z.string().trim().min(1).max(120),
  basis: z.literal('explicit_human_decision'),
  requestHash: Sha256Schema,
  routeId: z.literal('R6'),
  edition: AulaEditionV1Schema,
};
export const AulaBriefApprovalV1Schema = z.strictObject({
  ...identity,
  gate: z.literal('EXP_BRIEF_APPROVED'),
  briefSha256: Sha256Schema,
});
export const AulaSpecApprovalV1Schema = z.strictObject({
  ...identity,
  gate: z.literal('MW_SPEC_APPROVED'),
  specSha256: Sha256Schema,
  inputSha256: Sha256Schema,
});
export const AulaDeckIntakeApprovalV1Schema = z.strictObject({
  ...identity,
  gate: z.literal('DECK_INTAKE_APPROVED'),
  intakeSha256: Sha256Schema,
});
export const AulaDesignV1Schema = z.strictObject({
  schemaVersion: z.literal('frames-aula-design-v1'),
  requestHash: Sha256Schema,
  routeId: z.literal('R6'),
  edition: AulaEditionV1Schema,
  kind: z.string().min(1),
  skillId: z.string().min(1),
  inputRef: RelativePathSchema,
  inputSha256: Sha256Schema,
  briefRef: RelativePathSchema,
  briefSha256: Sha256Schema,
  intakeRef: RelativePathSchema.optional(),
  intakeSha256: Sha256Schema.optional(),
  state: z.literal('SPEC_DRAFT'),
  buildBinding: AulaBuildBindingV1Schema.optional(),
  engineAuthoritySha256: Sha256Schema.optional(),
});
export const AulaContinuationV1Schema = z.strictObject({
  stage: z.enum(['spec', 'build']),
  edition: AulaEditionV1Schema.optional(),
  inputRef: RelativePathSchema,
  briefRef: RelativePathSchema,
  briefApprovalRef: RelativePathSchema,
  specRef: RelativePathSchema.optional(),
  specApprovalRef: RelativePathSchema.optional(),
  intakeRef: RelativePathSchema.optional(),
  intakeApprovalRef: RelativePathSchema.optional(),
  bankRef: RelativePathSchema.optional(),
  outputDirectoryRef: RelativePathSchema,
  writeSet: z.array(RelativePathSchema).min(1).max(12),
});
export type AulaContinuationV1 = z.infer<typeof AulaContinuationV1Schema>;
