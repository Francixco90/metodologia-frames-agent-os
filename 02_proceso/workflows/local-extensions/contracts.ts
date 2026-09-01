import {z} from 'zod';

const PortableRefSchema = z
  .string()
  .min(1)
  .max(300)
  .refine(
    (value) => !value.startsWith('/') && !value.includes('\\') && !value.split('/').includes('..'),
    {
      message: 'Expected a portable relative reference',
    },
  );

export const LocalExtensionIdSchema = z
  .string()
  .regex(/^local\.[a-z0-9][a-z0-9-]*\.[a-z0-9][a-z0-9-]*(?:\.[a-z0-9][a-z0-9-]*)*$/u);

export const LocalExtensionStateSchema = z.enum([
  'DRAFT',
  'VALIDATED',
  'ACTIVE_LOCAL',
  'VALIDATED_NOT_RUNNABLE',
  'BLOCKED',
  'RETIRED',
]);

export const LocalExtensionManifestSchema = z
  .object({
    schema_version: z.literal('frames-local-extension-v1'),
    extension_id: LocalExtensionIdSchema,
    version: z.string().regex(/^\d+\.\d+\.\d+$/u),
    scope: z.enum(['PROJECT_LOCAL', 'USER_LOCAL']),
    kind: z.enum(['skill', 'workflow', 'bundle']),
    lifecycle: z.enum(['DRAFT', 'READY', 'RETIRED']),
    enabled: z.boolean(),
    override_policy: z.literal('never'),
    description: z.string().min(1).max(500),
    triggers: z
      .array(
        z
          .string()
          .min(1)
          .max(120)
          .refine((value) => value === value.trim().toLowerCase(), 'Expected normalized trigger'),
      )
      .min(1),
    capabilities: z.array(z.string().regex(/^[a-z0-9][a-z0-9._-]*$/u)).min(1),
    inputs: z.array(z.string().min(1)).default([]),
    outputs: z.array(z.string().min(1)).default([]),
    dependencies: z.array(LocalExtensionIdSchema).default([]),
    effect_class: z.enum(['read_only', 'local_reversible']),
    tools: z.array(z.string().min(1)).default([]),
    read_set: z.array(PortableRefSchema).default([]),
    write_set: z.array(PortableRefSchema).default([]),
    routing: z.object({
      priority: z.literal('after_canonical'),
      complements: z.array(z.string()).default([]),
    }),
    execution: z.discriminatedUnion('mode', [
      z.object({mode: z.literal('declarative')}),
      z.object({
        mode: z.literal('code'),
        handler: PortableRefSchema,
        sandbox_probe: PortableRefSchema,
      }),
    ]),
    content: z
      .array(z.object({ref: PortableRefSchema, sha256: z.string().regex(/^[a-f0-9]{64}$/u)}))
      .min(1),
    documentation: z.array(PortableRefSchema).min(1),
    fixtures: z.object({positive: PortableRefSchema, adversarial: PortableRefSchema}),
    budgets: z.object({
      max_files: z.number().int().positive(),
      max_context_files: z.number().int().positive(),
    }),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.effect_class === 'read_only' && value.write_set.length > 0) {
      context.addIssue({code: 'custom', path: ['write_set'], message: 'read_only cannot write'});
    }
  });

export const SandboxProbeSchema = z
  .object({
    schema_version: z.literal('frames-local-sandbox-probe-v1'),
    extension_id: LocalExtensionIdSchema,
    manifest_sha256: z.string().regex(/^[a-f0-9]{64}$/u),
    runner_id: z.string().regex(/^[a-z0-9][a-z0-9._-]*$/u),
    runner_sha256: z.string().regex(/^[a-f0-9]{64}$/u),
    status: z.literal('PASS'),
    filesystem: z.literal('CONSTRAINED'),
    process: z.literal('CONTROLLED'),
    network: z.literal('DENIED'),
    deterministic_replay: z.literal('PASS'),
    write_set_check: z.literal('PASS'),
    evidence: z
      .array(z.object({ref: PortableRefSchema, sha256: z.string().regex(/^[a-f0-9]{64}$/u)}))
      .min(1),
  })
  .strict();

export const TechnicalDefenseReviewRoleV1Schema = z.enum(['REHEARSAL_OBSERVER', 'RED_TEAM']);
export type TechnicalDefenseReviewRoleV1 = z.infer<typeof TechnicalDefenseReviewRoleV1Schema>;
export const TechnicalDefenseReviewSessionV1Schema = z.strictObject({
  taskId: z.string().regex(/^[a-z0-9][a-z0-9._-]*$/u),
  actorInstanceId: z.string().regex(/^[a-z0-9][a-z0-9._-]*$/u),
  authoritySha256: z.string().regex(/^[a-f0-9]{64}$/u),
  actionSha256: z.string().regex(/^[a-f0-9]{64}$/u),
  environment: z.literal('LOCAL_SIMULATION'),
});
export type TechnicalDefenseReviewSessionV1 = z.infer<typeof TechnicalDefenseReviewSessionV1Schema>;
export const TechnicalDefenseReviewAuthorityVerdictV1Schema = z.strictObject({
  schemaVersion: z.literal('technical-defense-review-authority-verdict-v1'),
  status: z.enum(['VERIFIED', 'DENIED', 'CAPABILITY_GAP']),
  expectedRole: TechnicalDefenseReviewRoleV1Schema,
  taskId: z.string().regex(/^[a-z0-9][a-z0-9._-]*$/u),
  actorInstanceId: z.string().regex(/^[a-z0-9][a-z0-9._-]*$/u),
  authoritySha256: z.string().regex(/^[a-f0-9]{64}$/u),
  actionSha256: z.string().regex(/^[a-f0-9]{64}$/u),
  evidenceSha256: z.string().regex(/^[a-f0-9]{64}$/u),
  environment: z.literal('LOCAL_SIMULATION'),
  verifiedAt: z.iso.datetime({offset: true}),
  canonicalSha256: z.string().regex(/^[a-f0-9]{64}$/u),
});
export interface TechnicalDefenseReviewAuthorityPortV1 {
  verify(
    session: TechnicalDefenseReviewSessionV1,
    expectedRole: TechnicalDefenseReviewRoleV1,
  ): z.infer<typeof TechnicalDefenseReviewAuthorityVerdictV1Schema>;
}

export const TechnicalDefensePrivacyProvenanceSessionV1Schema = z.strictObject({
  taskId: z.string().regex(/^[a-z0-9][a-z0-9._-]*$/u),
  actorInstanceId: z.string().regex(/^[a-z0-9][a-z0-9._-]*$/u),
  authoritySha256: z.string().regex(/^[a-f0-9]{64}$/u),
  casePayloadSha256: z.string().regex(/^[a-f0-9]{64}$/u),
  caseFrozenAt: z.iso.datetime({offset: true}),
  classification: z.literal('SYNTHETIC_ONLY'),
  environment: z.literal('LOCAL_SIMULATION'),
});
export type TechnicalDefensePrivacyProvenanceSessionV1 = z.infer<
  typeof TechnicalDefensePrivacyProvenanceSessionV1Schema
>;
export const TechnicalDefensePrivacyProvenanceVerdictV1Schema =
  TechnicalDefensePrivacyProvenanceSessionV1Schema.extend({
    schemaVersion: z.literal('technical-defense-privacy-provenance-verdict-v1'),
    status: z.enum(['VERIFIED', 'DENIED', 'CAPABILITY_GAP']),
    evidenceSha256: z.string().regex(/^[a-f0-9]{64}$/u),
    verifiedAt: z.iso.datetime({offset: true}),
    canonicalSha256: z.string().regex(/^[a-f0-9]{64}$/u),
  });
export interface TechnicalDefensePrivacyAuthorityPortV1 {
  verify(
    session: TechnicalDefensePrivacyProvenanceSessionV1,
  ): z.infer<typeof TechnicalDefensePrivacyProvenanceVerdictV1Schema>;
}

export type LocalExtensionManifest = z.infer<typeof LocalExtensionManifestSchema>;
export type LocalExtensionState = z.infer<typeof LocalExtensionStateSchema>;

export interface LocalExtensionRecord {
  extension_id: string;
  scope: 'PROJECT_LOCAL' | 'USER_LOCAL' | 'UNKNOWN';
  source_root: string;
  manifest_ref: string;
  manifest_sha256?: string;
  sandbox_probe_sha256?: string;
  state: LocalExtensionState;
  reason_codes: string[];
  manifest?: LocalExtensionManifest;
}

export interface LocalExtensionDiscovery {
  schema_version: 'frames-local-extension-discovery-v1';
  project_root: string;
  user_root?: string;
  records: LocalExtensionRecord[];
}

export interface LocalActivationReceiptV1 {
  schema_version: 'frames-local-activation-receipt-v1';
  extension_id: string;
  manifest_sha256: string;
  sandbox_probe_sha256: string | null;
  state: LocalExtensionState;
  reason_codes: string[];
  source_scope: 'PROJECT_LOCAL' | 'USER_LOCAL' | 'UNKNOWN';
  receipt_sha256: string;
}
