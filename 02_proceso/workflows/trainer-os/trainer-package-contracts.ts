import {readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

import {parse} from 'yaml';
import {z} from 'zod';

import {
  HashRefSchema,
  IdSchema,
  PortableRefSchema,
  Sha256Schema,
  hashModel,
  sha256,
} from './common.ts';
import type {TrainerRunManifestV1} from './trainer-run-manifest-v1.schema.ts';

const AuthorityStateSchema = z.enum(['INTAKE', 'RENDERED_DRAFT']);
const PackageAuthorityEventSchema = z
  .strictObject({
    event_id: z.string().regex(/^TRAINER-OS-PACKAGE-AUTHORITY-[0-9]{3}$/u),
    event_order: z.number().int().positive(),
    from: AuthorityStateSchema,
    to: AuthorityStateSchema,
    actor_id: z.literal('TRAINER-OS-GUARDIAN'),
    manifest_ref: z.literal('projects/trainer-os/project.yml'),
    manifest_sha256: Sha256Schema,
    decision: z.enum([
      'authorize_synthetic_package_fixture_without_advancing_project_state',
      'authorize_production_package_after_independent_review',
    ]),
    scope: z.enum(['synthetic-fixture-only', 'production-run']),
    run_id: IdSchema,
    run_manifest_sha256: Sha256Schema,
    build_manifest: HashRefSchema,
    verification_receipt: HashRefSchema,
    human_review_receipt: HashRefSchema,
    verifier_actor: z.literal('trainer-verifier'),
    guardian_actor: z.literal('trainer-guardian'),
    human_actor: z.literal('H01'),
    verdict: z.literal('PASS'),
    publication_authority: z.literal(false),
  })
  .superRefine((value, context) => {
    const synthetic = value.scope === 'synthetic-fixture-only';
    const valid = synthetic
      ? value.from === 'INTAKE' &&
        value.to === 'INTAKE' &&
        value.decision === 'authorize_synthetic_package_fixture_without_advancing_project_state'
      : value.from === 'RENDERED_DRAFT' &&
        value.to === 'RENDERED_DRAFT' &&
        value.decision === 'authorize_production_package_after_independent_review';
    if (!valid) context.addIssue({code: 'custom', message: 'authority scope and transition drift'});
  });

const sourceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
export const packageAuthorityLedgerPath = resolve(
  sourceRoot,
  '03_artefactos/projects/trainer-os/lifecycle-ledger.yml',
);
const projectPath = resolve(sourceRoot, '03_artefactos/projects/trainer-os/project.yml');

export const resolvePackageAuthority = (manifest: TrainerRunManifestV1) => {
  const ledger = z
    .object({
      mutation_policy: z.literal('append-only-events'),
      events: z.array(z.record(z.string(), z.unknown())).min(2),
    })
    .parse(parse(readFileSync(packageAuthorityLedgerPath, 'utf8')));
  const events = ledger.events.flatMap((candidate) => {
    const parsed = PackageAuthorityEventSchema.safeParse(candidate);
    return parsed.success ? [parsed.data] : [];
  });
  const event = events.find(
    ({run_id: runId, run_manifest_sha256: runHash}) =>
      runId === manifest.runId && runHash === manifest.manifestSha256,
  );
  const project = z
    .object({
      current_state: z.string(),
      package_authority_ledger_ref: z.literal('projects/trainer-os/lifecycle-ledger.yml'),
    })
    .parse(parse(readFileSync(projectPath, 'utf8')));
  if (
    ledger.events.some(({event_order: order}, index) => order !== index + 1) ||
    new Set(ledger.events.map(({event_id: eventId}) => eventId)).size !== ledger.events.length ||
    events.some(
      ({manifest_sha256: projectHash}) => projectHash !== sha256(readFileSync(projectPath)),
    )
  )
    throw new Error('TRAINER_PACKAGE_AUTHORITY_LEDGER_DRIFT');
  if (!event) throw new Error('TRAINER_PACKAGE_EXTERNAL_AUTHORITY_MISSING');
  if (event.scope === 'synthetic-fixture-only' && !manifest.runId.startsWith('synthetic-'))
    throw new Error('TRAINER_PACKAGE_SYNTHETIC_AUTHORITY_SCOPE_DRIFT');
  if (event.scope === 'production-run' && project.current_state !== event.to)
    throw new Error(`TRAINER_PACKAGE_PROJECT_STATE_BLOCKED:${project.current_state}`);
  if (
    event.build_manifest.ref !== manifest.buildManifest?.ref ||
    event.build_manifest.sha256 !== manifest.buildManifest.sha256 ||
    event.verification_receipt.ref !== manifest.verificationReceipt?.ref ||
    event.verification_receipt.sha256 !== manifest.verificationReceipt.sha256 ||
    event.human_review_receipt.ref !== manifest.humanReviewReceipt?.ref ||
    event.human_review_receipt.sha256 !== manifest.humanReviewReceipt.sha256
  )
    throw new Error('TRAINER_PACKAGE_EXTERNAL_AUTHORITY_BINDING_DRIFT');
  return event;
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
    authorityLedger: HashRefSchema,
    authorizationEventId: IdSchema,
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
