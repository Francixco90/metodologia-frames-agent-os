import {z} from 'zod';

const Sha256 = z.string().regex(/^[a-f0-9]{64}$/u);
const RelativeRef = z
  .string()
  .min(1)
  .max(240)
  .refine((value) => !value.startsWith('/') && !value.includes('..') && !value.includes('\\'));

export const SkillMaterialRefV1Schema = z.strictObject({ref: RelativeRef, sha256: Sha256});

export const SkillCaseGateInputV1Schema = z.strictObject({
  schema_version: z.literal('skill-case-gate-input-v1'),
  case_ref: SkillMaterialRefV1Schema,
  source_refs: z.array(SkillMaterialRefV1Schema).min(1),
});

export const SkillArchitectureGateInputV1Schema = z.strictObject({
  schema_version: z.literal('skill-architecture-gate-input-v1'),
  capability_map_ref: SkillMaterialRefV1Schema,
  decision_ref: SkillMaterialRefV1Schema,
});

export const SkillStaticGateInputV1Schema = z.strictObject({
  schema_version: z.literal('skill-static-gate-input-v1'),
  candidate_ref: SkillMaterialRefV1Schema,
  contract_refs: z.array(SkillMaterialRefV1Schema).min(1),
});

export type SkillMaterialRefV1 = z.infer<typeof SkillMaterialRefV1Schema>;
