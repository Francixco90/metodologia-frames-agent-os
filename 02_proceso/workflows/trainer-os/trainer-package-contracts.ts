import {z} from 'zod';
import {parse} from 'yaml';

import {
  HashRefSchema,
  IdSchema,
  PortableRefSchema,
  Sha256Schema,
  hashModel,
  sha256,
} from './common.ts';
import type {TrainerRunManifestV1} from './trainer-run-manifest-v1.schema.ts';

export const SyntheticPackageAuthoritySchema = z.strictObject({
  schemaVersion: z.literal('trainer-synthetic-package-authority-v1'),
  scope: z.literal('synthetic-fixture-only'),
  runId: z.literal('synthetic-run'),
  runManifestSha256: Sha256Schema,
  buildManifest: HashRefSchema,
  verificationReceipt: HashRefSchema,
  humanReviewReceipt: HashRefSchema,
  externalAuthority: z.literal(false),
  productionAuthority: z.literal(false),
  publicationAuthority: z.literal(false),
});

export const syntheticPackageAuthority = SyntheticPackageAuthoritySchema.parse({
  schemaVersion: 'trainer-synthetic-package-authority-v1',
  scope: 'synthetic-fixture-only',
  runId: 'synthetic-run',
  runManifestSha256: 'a79c50ba3202aea087c639fb5be09a006ab54f7925fa3befc66c5e2fd129a31e',
  buildManifest: {
    ref: 'outputs/build-manifest.json',
    sha256: '8912acdd0d91ff8ef01b687e78395a227cb4b9f202d795cde9ef7e41eb24c337',
  },
  verificationReceipt: {
    ref: 'verification.json',
    sha256: 'dcf611fdcbeb5f55064fa49358c2910a4a193d9d8bce50dc635d02cd1c0ac1db',
  },
  humanReviewReceipt: {
    ref: 'human-review.json',
    sha256: '4a3c67f5b944298a2929ba12d7b2fb9e9e1a900ba929907912eaf19b6a6ccad8',
  },
  externalAuthority: false,
  productionAuthority: false,
  publicationAuthority: false,
});

export const parseSyntheticProjectSnapshot = (bytes: Uint8Array) =>
  z.object({current_state: z.literal('INTAKE')}).parse(parse(Buffer.from(bytes).toString()));

export const resolvePackageAuthority = (manifest: TrainerRunManifestV1) => {
  if (manifest.runId !== syntheticPackageAuthority.runId)
    throw new Error('TRAINER_PACKAGE_PRODUCTION_AUTHORITY_UNAVAILABLE');
  if (
    syntheticPackageAuthority.runManifestSha256 !== manifest.manifestSha256 ||
    syntheticPackageAuthority.buildManifest.ref !== manifest.buildManifest?.ref ||
    syntheticPackageAuthority.buildManifest.sha256 !== manifest.buildManifest.sha256 ||
    syntheticPackageAuthority.verificationReceipt.ref !== manifest.verificationReceipt?.ref ||
    syntheticPackageAuthority.verificationReceipt.sha256 !== manifest.verificationReceipt.sha256 ||
    syntheticPackageAuthority.humanReviewReceipt.ref !== manifest.humanReviewReceipt?.ref ||
    syntheticPackageAuthority.humanReviewReceipt.sha256 !== manifest.humanReviewReceipt.sha256
  )
    throw new Error('TRAINER_PACKAGE_SYNTHETIC_AUTHORITY_BINDING_DRIFT');
  return syntheticPackageAuthority;
};

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
    authorityReceipt: HashRefSchema,
    authorityScope: z.literal('synthetic-fixture-only'),
    projectSnapshot: HashRefSchema,
    projectState: z.literal('INTAKE'),
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
