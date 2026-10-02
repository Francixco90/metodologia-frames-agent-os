import {z} from 'zod';
import {Sha256Schema} from '../../../core/contracts/index.ts';

const Ref = z
  .string()
  .regex(/^[a-zA-Z0-9][a-zA-Z0-9._/-]*$/u)
  .refine((ref) => ref.split('/').every((part) => !['', '.', '..'].includes(part)));
export const AulaDependencyV1Schema = z.strictObject({
  role: z.enum([
    'profile',
    'font',
    'core-catalog',
    'bank-manifest',
    'bank-catalog',
    'asset',
    'linked-piece',
  ]),
  ref: Ref,
  sha256: Sha256Schema,
});
export const AulaAssetEvidenceV1Schema = z.strictObject({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/u),
  kind: z.enum(['icon', 'scene']),
  sha256: Sha256Schema,
  source: z.enum(['core', 'bank']),
  catalogSha256: Sha256Schema,
});
export const aulaBuildFieldsV1 = {
  buildDependencies: z.array(AulaDependencyV1Schema).max(1024).optional(),
  assetEvidence: z.array(AulaAssetEvidenceV1Schema).max(416).optional(),
  profile: z
    .strictObject({id: z.enum(['metodologia', 'white-label']), sha256: Sha256Schema})
    .optional(),
  engineVersion: z.literal('1.1.0').optional(),
};
export const AulaBuildBindingV1Schema = z
  .strictObject({...aulaBuildFieldsV1, bankRef: Ref.optional()})
  .superRefine((binding, ctx) => {
    const fields = ['buildDependencies', 'assetEvidence', 'profile', 'engineVersion'] as const;
    if (
      fields.some((key) => binding[key] !== undefined) &&
      fields.some((key) => binding[key] === undefined)
    )
      ctx.addIssue({code: 'custom', message: 'AULA_BUILD_BINDING_INCOMPLETE'});
    const refs = binding.buildDependencies?.map((dep) => dep.ref) ?? [];
    if (new Set(refs).size !== refs.length)
      ctx.addIssue({code: 'custom', message: 'AULA_BUILD_DEPENDENCY_DUPLICATE'});
    const ids = binding.assetEvidence?.map((asset) => `${asset.kind}/${asset.id}`) ?? [];
    if (new Set(ids).size !== ids.length)
      ctx.addIssue({code: 'custom', message: 'AULA_ASSET_EVIDENCE_DUPLICATE'});
    if (binding.bankRef && !binding.engineVersion)
      ctx.addIssue({code: 'custom', message: 'AULA_BANK_NOT_SUPPORTED'});
    const deps = binding.buildDependencies ?? [];
    if (
      binding.engineVersion &&
      (!deps.some((dep) => dep.role === 'profile' && dep.sha256 === binding.profile?.sha256) ||
        (binding.profile?.id === 'metodologia' && !deps.some((dep) => dep.role === 'font')) ||
        !deps.some((dep) => dep.role === 'core-catalog'))
    )
      ctx.addIssue({code: 'custom', message: 'AULA_PROFILE_DEPENDENCIES_INCOMPLETE'});
    for (const asset of binding.assetEvidence ?? [])
      if (
        !deps.some((dep) => dep.role === 'asset' && dep.sha256 === asset.sha256) ||
        !deps.some(
          (dep) =>
            dep.role === (asset.source === 'core' ? 'core-catalog' : 'bank-catalog') &&
            dep.sha256 === asset.catalogSha256,
        )
      )
        ctx.addIssue({code: 'custom', message: 'AULA_ASSET_EVIDENCE_UNBOUND'});
  });
export const AulaBuildPlanV1Schema = z
  .strictObject({
    outputs: z
      .array(z.string().regex(/^[a-z][a-z0-9-]*\.(html|md|json)$/u))
      .min(2)
      .max(12),
    ...aulaBuildFieldsV1,
  })
  .superRefine((plan, ctx) => {
    const imported = new Set(
      (plan.buildDependencies ?? [])
        .filter((dep) => dep.role === 'linked-piece' && dep.ref.startsWith('input/'))
        .map((dep) => dep.ref.slice(6)),
    );
    if (imported.size > 20 || plan.outputs.filter((name) => !imported.has(name)).length > 10)
      ctx.addIssue({code: 'custom', message: 'AULA_PLAN_LIMIT'});
  });
export type AulaBuildBindingV1 = z.infer<typeof AulaBuildBindingV1Schema>;
export const aulaBuildBindingV1 = (value: Record<string, unknown>, bankRef?: string) =>
  AulaBuildBindingV1Schema.parse({
    ...Object.fromEntries(
      Object.keys(aulaBuildFieldsV1)
        .filter((key) => value[key] !== undefined)
        .map((key) => [key, value[key]]),
    ),
    ...(bankRef ? {bankRef} : {}),
  });
