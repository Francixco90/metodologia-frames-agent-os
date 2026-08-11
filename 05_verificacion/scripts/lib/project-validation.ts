import {z} from 'zod';

export const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/u);
export const RelativeRefSchema = z
  .string()
  .min(1)
  .refine(
    (value) =>
      !value.startsWith('/') &&
      !value.includes('..') &&
      !value.includes('\\') &&
      !value.startsWith('file:'),
    'Expected a portable repository-relative path',
  );

const TechnicalStateSchema = z.enum(['IN_PROGRESS', 'BUILD_VALIDATED', 'RENDER_VALIDATED']);
const WorkProductStateSchema = z.strictObject({
  artifact_id: z.string().regex(/^[a-z0-9-]+$/u),
  kind: z.enum(['content', 'web', 'video']),
  technical_state: TechnicalStateSchema,
});

const ManifestWorkProductSchema = WorkProductStateSchema.extend({
  planned_ref: RelativeRefSchema.optional(),
  artifact_ref: RelativeRefSchema.optional(),
  receipt_ref: RelativeRefSchema.optional(),
}).superRefine((product, ctx) => {
  if (product.technical_state === 'IN_PROGRESS') {
    if (product.planned_ref === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'IN_PROGRESS work products require planned_ref',
        path: ['planned_ref'],
      });
    }
    if (product.artifact_ref !== undefined || product.receipt_ref !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'IN_PROGRESS work products cannot declare materialized evidence',
      });
    }
    return;
  }
  if (product.artifact_ref === undefined || product.receipt_ref === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Validated work products require artifact_ref and receipt_ref',
    });
  }
});

const lockedProjectIds = new Set(['vs-001-source-to-campaign']);
const enforceReleaseGates = (
  entry: {
    project_id: string;
    source_locked: boolean;
    guardian_passed: boolean;
    human_approved: boolean;
    ready: boolean;
    published: boolean;
  },
  ctx: z.RefinementCtx,
): void => {
  if (lockedProjectIds.has(entry.project_id)) {
    for (const field of [
      'source_locked',
      'guardian_passed',
      'human_approved',
      'ready',
      'published',
    ] as const) {
      if (entry[field]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Tier A locked: ${field} must remain false for ${entry.project_id}`,
          path: [field],
        });
      }
    }
  }
  const chain = [
    ['guardian_passed', 'source_locked'],
    ['human_approved', 'guardian_passed'],
    ['ready', 'human_approved'],
    ['published', 'ready'],
  ] as const;
  for (const [later, earlier] of chain) {
    if (entry[later] && !entry[earlier]) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${later} requires ${earlier}`,
        path: [later],
      });
    }
  }
};

export const registrySchema = z.strictObject({
  schema_version: z.literal(1),
  registry_id: z.literal('project-registry-v1'),
  mutation_policy: z.literal('append-only-records-and-events'),
  entries: z
    .array(
      z
        .strictObject({
          project_id: z.string().regex(/^[a-z0-9-]+$/u),
          manifest_ref: RelativeRefSchema,
          source_bundle_ref: RelativeRefSchema,
          claims_ledger_ref: RelativeRefSchema,
          current_state: z.literal('PARTIAL_CONTROLLED'),
          governed_workflow_state: z.literal('BLOCKED_BEFORE_SOURCE_LOCK'),
          technical_validation_state: TechnicalStateSchema,
          work_products: z.array(WorkProductStateSchema).min(1),
          source_locked: z.boolean(),
          guardian_passed: z.boolean(),
          human_approved: z.boolean(),
          ready: z.boolean(),
          published: z.boolean(),
          coverage_gaps: z.array(z.string().min(1)).min(1),
        })
        .superRefine(enforceReleaseGates),
    )
    .min(1),
});

export const projectManifestSchema = z
  .strictObject({
    schema_version: z.literal(1),
    project_id: z.string().regex(/^[a-z0-9-]+$/u),
    title: z.string().min(1),
    current_state: z.literal('PARTIAL_CONTROLLED'),
    governed_workflow_state: z.literal('BLOCKED_BEFORE_SOURCE_LOCK'),
    technical_validation_state: TechnicalStateSchema,
    visible_state: z.enum(['NOT_RENDERED', 'RENDERED_DRAFT']),
    source_snapshot_id: z.string().min(1),
    source_locked: z.boolean(),
    source_bundle: RelativeRefSchema.optional(),
    claims_ledger: RelativeRefSchema,
    work_products: z.array(ManifestWorkProductSchema).min(1),
    approvals: z.array(z.unknown()),
    guardian_passed: z.boolean(),
    human_approved: z.boolean(),
    ready: z.boolean(),
    published: z.boolean(),
    coverage_gaps: z.array(z.string().min(1)).min(1),
  })
  .superRefine(enforceReleaseGates);

export const validateProductParity = (
  projectId: string,
  registryProducts: Array<z.infer<typeof WorkProductStateSchema>>,
  manifestProducts: Array<z.infer<typeof ManifestWorkProductSchema>>,
): string[] => {
  const errors: string[] = [];
  const registered = new Map(registryProducts.map((product) => [product.artifact_id, product]));
  if (registered.size !== manifestProducts.length) {
    errors.push(`${projectId}: registry y manifest deben declarar los mismos productos`);
  }
  for (const product of manifestProducts) {
    const match = registered.get(product.artifact_id);
    if (match?.kind !== product.kind || match.technical_state !== product.technical_state) {
      errors.push(`${projectId}: drift en work product ${product.artifact_id}`);
    }
  }
  return errors;
};
