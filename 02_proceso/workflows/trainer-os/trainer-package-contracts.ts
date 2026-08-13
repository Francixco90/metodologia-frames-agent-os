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
import {privacyGate} from './compiler-authority.ts';
import type {TrainerRunManifestV1} from './trainer-run-manifest-v1.schema.ts';

const SyntheticProjectSnapshotSchema = z.strictObject({
  schema_version: z.literal('trainer-project-v1'),
  project_id: z.literal('trainer-os'),
  title: z.literal('Trainer OS'),
  current_state: z.literal('INTAKE'),
  maximum_state: z.literal('RENDERED_DRAFT'),
  workflow_ref: z.literal('workflows/trainer-os/README.md'),
  schemas: z.array(z.string()).min(6),
  effects: z.strictObject({
    network: z.literal(false),
    connectors: z.literal(false),
    publication: z.literal(false),
  }),
  human_review_required: z.literal(true),
  guardian_required: z.literal(true),
  ledger_ref: z.literal('projects/trainer-os/lifecycle-ledger.yml'),
  coverage_gaps: z.array(z.string()).min(3),
  benchmark_ref: z.literal('projects/trainer-os/evals/benchmark.pending.json'),
  benchmark_state: z.literal('not_executed'),
});

export const SyntheticPackageAuthoritySchema = z.strictObject({
  schemaVersion: z.literal('trainer-synthetic-package-authority-v1'),
  scope: z.literal('synthetic-fixture-only'),
  runId: z.literal('synthetic-run'),
  runManifestSha256: Sha256Schema,
  buildManifest: HashRefSchema,
  verificationReceipt: HashRefSchema,
  humanReviewReceipt: HashRefSchema,
  projectSnapshot: HashRefSchema,
  externalAuthority: z.literal(false),
  productionAuthority: z.literal(false),
  publicationAuthority: z.literal(false),
});

export const syntheticPackageAuthority = SyntheticPackageAuthoritySchema.parse({
  schemaVersion: 'trainer-synthetic-package-authority-v1',
  scope: 'synthetic-fixture-only',
  runId: 'synthetic-run',
  runManifestSha256: 'bfb4057445b3192a0cf74c940178f96828d791b96da846b07738c0ca3910d59f',
  buildManifest: {
    ref: 'outputs/build-manifest.json',
    sha256: 'ef3a6437f7c64e9358e895e401b7d45e354d8b9bbb7a788dc990c18df77445fa',
  },
  verificationReceipt: {
    ref: 'verification.json',
    sha256: 'aec1e9ccb3934ab943d5a387b55d93778bb4529ede6be129f957afa78fdef627',
  },
  humanReviewReceipt: {
    ref: 'human-review.json',
    sha256: 'f22b1addd9145dd6690856a3217d12b73bc74c67f38dab344d924041ad6598fb',
  },
  projectSnapshot: {
    ref: 'package/authority/project-snapshot.yml',
    sha256: '659a501c7146b161ea5485fd4c345522758a8fa134dabdb044b6f177e3a95443',
  },
  externalAuthority: false,
  productionAuthority: false,
  publicationAuthority: false,
});

export const parseSyntheticProjectSnapshot = (bytes: Uint8Array) => {
  const text = Buffer.from(bytes).toString();
  privacyGate(text);
  return SyntheticProjectSnapshotSchema.parse(parse(text));
};

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
