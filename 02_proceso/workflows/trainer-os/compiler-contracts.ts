import {z} from 'zod';

import {HashRefSchema, IdSchema, PortableRefSchema, Sha256Schema, hashModel} from './common.ts';

export const TrainerCompilerAuthorityFiles = [
  'common.ts',
  'compiler.ts',
  'compiler-contracts.ts',
  'compiler-io.ts',
  'runtime-io.ts',
  'trainer-artifact-plan-v1.schema.ts',
  'trainer-design-lock-v1.schema.ts',
  'trainer-route-spec-v1.schema.ts',
  'trainer-run-manifest-v1.schema.ts',
] as const;

export const TrainerAssetManifestSchema = z.strictObject({
  schemaVersion: z.literal('trainer-asset-manifest-v1'),
  manifestId: IdSchema,
  locale: z.enum(['es', 'en', 'pt']),
  assets: z
    .array(
      z.strictObject({
        ref: PortableRefSchema,
        sha256: Sha256Schema,
        rights: z.enum(['authored', 'OFL-1.1', 'MIT', 'CC-BY-4.0']),
        rightsReceipt: HashRefSchema,
      }),
    )
    .min(1)
    .refine((items) => new Set(items.map(({ref}) => ref)).size === items.length),
  networkRequired: z.literal(false),
  publicationAuthority: z.literal(false),
});
export const TrainerRightsReceiptSchema = z.strictObject({
  schemaVersion: z.literal('trainer-asset-rights-receipt-v1'),
  asset: HashRefSchema,
  rights: z.enum(['authored', 'OFL-1.1', 'MIT', 'CC-BY-4.0']),
  publicationAuthority: z.literal(false),
});
export const TrainerDesignDecisionReceiptSchema = z.strictObject({
  schemaVersion: z.literal('trainer-design-decision-receipt-v1'),
  actor: z.literal('H01'),
  verdict: z.literal('select'),
  selectedDirectionId: IdSchema,
  routeSpec: HashRefSchema,
  context: HashRefSchema,
  lockContextSha256: Sha256Schema,
  publicationAuthority: z.literal(false),
});

const TreeEntrySchema = z.strictObject({ref: PortableRefSchema, sha256: Sha256Schema});
export const TrainerBuildManifestSchema = z
  .strictObject({
    schemaVersion: z.literal('trainer-build-manifest-v1'),
    manifestId: IdSchema,
    buildManifestSha256: Sha256Schema,
    compiler: z.strictObject({
      name: z.literal('trainer-core'),
      version: z.literal('1.0.0'),
      sourceTreeSha256: Sha256Schema,
    }),
    routeSpec: HashRefSchema,
    designLock: HashRefSchema,
    artifactPlan: HashRefSchema,
    assetManifest: HashRefSchema,
    locale: z.enum(['es', 'en', 'pt']),
    outputRoot: z.literal('dist'),
    outputs: z.array(TreeEntrySchema).min(1),
    treeSha256: Sha256Schema,
    receipt: z.strictObject({
      receiptId: IdSchema,
      treeSha256: Sha256Schema,
      outputCount: z.number().int().positive(),
    }),
    maximumState: z.literal('RENDERED_DRAFT'),
    publicationAuthority: z.literal(false),
  })
  .superRefine((value, context) => {
    const refs = value.outputs.map(({ref}) => ref);
    if (new Set(refs).size !== refs.length || refs.some((ref) => !ref.startsWith('dist/')))
      context.addIssue({
        code: 'custom',
        path: ['outputs'],
        message: 'outputs must be unique under dist',
      });
    if (
      value.receipt.treeSha256 !== value.treeSha256 ||
      value.receipt.outputCount !== value.outputs.length
    )
      context.addIssue({
        code: 'custom',
        path: ['receipt'],
        message: 'receipt must bind exact tree',
      });
    if (hashModel(value, 'buildManifestSha256') !== value.buildManifestSha256)
      context.addIssue({
        code: 'custom',
        path: ['buildManifestSha256'],
        message: 'build hash drift',
      });
  });

export type TrainerBuildManifest = z.infer<typeof TrainerBuildManifestSchema>;
