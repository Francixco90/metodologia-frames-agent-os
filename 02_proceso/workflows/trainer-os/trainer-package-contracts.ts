import {z} from 'zod';

import {
  HashRefSchema,
  IdSchema,
  PortableRefSchema,
  Sha256Schema,
  hashModel,
  sha256,
} from './common.ts';

export const TrainerVerificationReceiptSchema = z
  .strictObject({
    schemaVersion: z.literal('trainer-verification-receipt-v1'),
    receiptId: IdSchema,
    receiptSha256: Sha256Schema,
    actorId: z.literal('trainer-verifier'),
    verdict: z.literal('PASS'),
    buildManifest: HashRefSchema,
    treeSha256: Sha256Schema,
    publicationAuthority: z.literal(false),
  })
  .superRefine((value, context) => {
    if (hashModel(value, 'receiptSha256') !== value.receiptSha256)
      context.addIssue({code: 'custom', path: ['receiptSha256'], message: 'receipt hash drift'});
  });

export const TrainerHumanReviewReceiptSchema = z
  .strictObject({
    schemaVersion: z.literal('trainer-human-review-receipt-v1'),
    receiptId: IdSchema,
    receiptSha256: Sha256Schema,
    actorId: z.literal('H01'),
    verdict: z.literal('APPROVED'),
    buildManifest: HashRefSchema,
    verificationReceipt: HashRefSchema,
    publicationAuthority: z.literal(false),
  })
  .superRefine((value, context) => {
    if (hashModel(value, 'receiptSha256') !== value.receiptSha256)
      context.addIssue({code: 'custom', path: ['receiptSha256'], message: 'receipt hash drift'});
  });

const PackageFileSchema = z.strictObject({
  ref: PortableRefSchema.refine((ref) => ref.startsWith('package/'), 'package ref required'),
  sha256: Sha256Schema,
});

export const TrainerPackageManifestSchema = z
  .strictObject({
    schemaVersion: z.literal('trainer-package-manifest-v1'),
    packageId: IdSchema,
    packageManifestSha256: Sha256Schema,
    state: z.literal('RENDERED_DRAFT'),
    runManifest: HashRefSchema,
    buildManifest: HashRefSchema,
    verificationReceipt: HashRefSchema,
    humanReviewReceipt: HashRefSchema,
    packagerSourceTreeSha256: Sha256Schema,
    files: z.array(PackageFileSchema).min(9),
    artifactCount: z.number().int().positive(),
    treeSha256: Sha256Schema,
    effects: z.strictObject({
      network: z.literal(false),
      connectors: z.literal(false),
      publication: z.literal(false),
    }),
    maximumState: z.literal('RENDERED_DRAFT'),
    publicationAuthority: z.literal(false),
  })
  .superRefine((value, context) => {
    const refs = value.files.map(({ref}) => ref);
    if (new Set(refs).size !== refs.length)
      context.addIssue({code: 'custom', path: ['files'], message: 'package refs must be unique'});
    if (
      value.files.filter(({ref}) => ref.startsWith('package/artifacts/')).length !==
      value.artifactCount
    )
      context.addIssue({code: 'custom', path: ['artifactCount'], message: 'artifact count drift'});
    if (sha256(JSON.stringify(value.files)) !== value.treeSha256)
      context.addIssue({code: 'custom', path: ['treeSha256'], message: 'package tree hash drift'});
    if (hashModel(value, 'packageManifestSha256') !== value.packageManifestSha256)
      context.addIssue({
        code: 'custom',
        path: ['packageManifestSha256'],
        message: 'package manifest hash drift',
      });
  });

export type TrainerPackageManifest = z.infer<typeof TrainerPackageManifestSchema>;
