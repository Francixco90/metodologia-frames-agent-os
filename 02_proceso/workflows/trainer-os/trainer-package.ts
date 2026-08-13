import {readFileSync} from 'node:fs';
import {basename, dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

import {canonicalJson, hashModel, sha256} from './common.ts';
import {verifyTrainerBuild} from './compiler.ts';
import {exactTree} from './compiler-io.ts';
import {hashFile, portableResolve, readJson} from './runtime-io.ts';
import {
  TrainerHumanReviewReceiptSchema,
  TrainerPackageManifestSchema,
  TrainerVerificationReceiptSchema,
  type TrainerPackageManifest,
} from './trainer-package-contracts.ts';
import {promotePackage} from './trainer-package-io.ts';
import {
  TrainerRunManifestV1Schema,
  type TrainerRunManifestV1,
} from './trainer-run-manifest-v1.schema.ts';

const sourceRoot = dirname(fileURLToPath(import.meta.url));
const sourceFiles = [
  'trainer-package-contracts.ts',
  'trainer-package-io.ts',
  'trainer-package.ts',
] as const;
export const packageSourceTreeSha256 = () =>
  sha256(
    canonicalJson(sourceFiles.map((ref) => ({ref, sha256: hashFile(resolve(sourceRoot, ref))}))),
  );

const authorityFiles = (
  runPath: string,
  manifest: TrainerRunManifestV1,
  build: ReturnType<typeof verifyTrainerBuild>,
) => {
  if (!manifest.verificationReceipt || !manifest.humanReviewReceipt)
    throw new Error('TRAINER_PACKAGE_RECEIPTS_MISSING');
  const verification = TrainerVerificationReceiptSchema.parse(
    readJson(portableResolve(runPath, manifest.verificationReceipt.ref)),
  );
  const human = TrainerHumanReviewReceiptSchema.parse(
    readJson(portableResolve(runPath, manifest.humanReviewReceipt.ref)),
  );
  if (
    hashFile(portableResolve(runPath, manifest.verificationReceipt.ref)) !==
      manifest.verificationReceipt.sha256 ||
    hashFile(portableResolve(runPath, manifest.humanReviewReceipt.ref)) !==
      manifest.humanReviewReceipt.sha256
  )
    throw new Error('TRAINER_PACKAGE_RECEIPT_BYTES_CHANGED');
  if (
    verification.buildManifest.ref !== manifest.buildManifest?.ref ||
    verification.buildManifest.sha256 !== manifest.buildManifest.sha256 ||
    verification.treeSha256 !== build.treeSha256 ||
    human.buildManifest.ref !== manifest.buildManifest.ref ||
    human.buildManifest.sha256 !== manifest.buildManifest.sha256 ||
    human.verificationReceipt.ref !== manifest.verificationReceipt.ref ||
    human.verificationReceipt.sha256 !== manifest.verificationReceipt.sha256 ||
    manifest.humanReviewReceipt.actorId !== human.actorId ||
    manifest.humanReviewReceipt.verdict !== human.verdict ||
    manifest.humanReviewReceipt.buildManifestSha256 !== manifest.buildManifest.sha256 ||
    manifest.humanReviewReceipt.verificationReceiptSha256 !== manifest.verificationReceipt.sha256
  )
    throw new Error('TRAINER_PACKAGE_RECEIPT_BINDING_DRIFT');
  return [
    ['package/authority/run-manifest.json', readFileSync(runPath)],
    [
      'package/authority/route-spec.json',
      readFileSync(portableResolve(runPath, build.routeSpec.ref)),
    ],
    [
      'package/authority/design-lock.json',
      readFileSync(portableResolve(runPath, build.designLock.ref)),
    ],
    [
      'package/authority/artifact-plan.json',
      readFileSync(portableResolve(runPath, build.artifactPlan.ref)),
    ],
    [
      'package/authority/asset-manifest.json',
      readFileSync(portableResolve(runPath, build.assetManifest.ref)),
    ],
    [
      'package/authority/build-manifest.json',
      readFileSync(portableResolve(runPath, manifest.buildManifest.ref)),
    ],
    [
      'package/authority/verification-receipt.json',
      readFileSync(portableResolve(runPath, manifest.verificationReceipt.ref)),
    ],
    [
      'package/authority/human-review-receipt.json',
      readFileSync(portableResolve(runPath, manifest.humanReviewReceipt.ref)),
    ],
  ] as const;
};

const packageFiles = (
  runPath: string,
  manifest: TrainerRunManifestV1,
  build: ReturnType<typeof verifyTrainerBuild>,
) =>
  [
    ...build.outputs.map(
      ({ref}) =>
        [
          `package/artifacts/${ref.replace(/^dist\//u, '')}`,
          readFileSync(portableResolve(runPath, ref)),
        ] as const,
    ),
    ...authorityFiles(runPath, manifest, build),
  ].sort(([left], [right]) => left.localeCompare(right));

export const packageTrainer = (
  runPath: string,
  manifest: TrainerRunManifestV1,
): TrainerPackageManifest => {
  if (manifest.state !== 'RENDERED_DRAFT')
    throw new Error(`TRAINER_PACKAGE_REQUIRES_RENDERED_DRAFT:${manifest.state}`);
  const build = verifyTrainerBuild(runPath, manifest);
  const files = packageFiles(runPath, manifest, build);
  const bindings = files.map(([ref, bytes]) => ({ref, sha256: sha256(bytes)}));
  const draft = {
    schemaVersion: 'trainer-package-manifest-v1',
    packageId: `${manifest.runId}-package`,
    packageManifestSha256: '',
    state: 'RENDERED_DRAFT' as const,
    runManifest: {ref: basename(runPath), sha256: hashFile(runPath)},
    buildManifest: manifest.buildManifest!,
    verificationReceipt: manifest.verificationReceipt!,
    humanReviewReceipt: {
      ref: manifest.humanReviewReceipt!.ref,
      sha256: manifest.humanReviewReceipt!.sha256,
    },
    packagerSourceTreeSha256: packageSourceTreeSha256(),
    files: bindings,
    artifactCount: build.outputs.length,
    treeSha256: sha256(JSON.stringify(bindings)),
    effects: {network: false as const, connectors: false as const, publication: false as const},
    maximumState: 'RENDERED_DRAFT' as const,
    publicationAuthority: false as const,
  };
  draft.packageManifestSha256 = hashModel(draft, 'packageManifestSha256');
  const packaged = TrainerPackageManifestSchema.parse(draft);
  const manifestBytes = Buffer.from(`${JSON.stringify(packaged, null, 2)}\n`);
  promotePackage(runPath, [...files, ['package/package-manifest.json', manifestBytes]]);
  verifyTrainerPackage(runPath);
  return packaged;
};

export const verifyTrainerPackage = (runPath: string) => {
  const ref = 'package/package-manifest.json';
  const manifest = TrainerPackageManifestSchema.parse(readJson(portableResolve(runPath, ref)));
  if (manifest.packagerSourceTreeSha256 !== packageSourceTreeSha256())
    throw new Error('TRAINER_PACKAGE_SOURCE_DRIFT');
  const run = TrainerRunManifestV1Schema.parse(readJson(runPath));
  if (!run.buildManifest || !run.verificationReceipt || !run.humanReviewReceipt)
    throw new Error('TRAINER_PACKAGE_RUN_RECEIPTS_MISSING');
  if (
    manifest.runManifest.ref !== basename(runPath) ||
    manifest.runManifest.sha256 !== hashFile(runPath) ||
    manifest.buildManifest.ref !== run.buildManifest.ref ||
    manifest.buildManifest.sha256 !== run.buildManifest.sha256 ||
    manifest.verificationReceipt.ref !== run.verificationReceipt.ref ||
    manifest.verificationReceipt.sha256 !== run.verificationReceipt.sha256 ||
    manifest.humanReviewReceipt.ref !== run.humanReviewReceipt.ref ||
    manifest.humanReviewReceipt.sha256 !== run.humanReviewReceipt.sha256
  )
    throw new Error('TRAINER_PACKAGE_RUN_BINDING_DRIFT');
  const build = verifyTrainerBuild(runPath, run);
  const expected = packageFiles(runPath, run, build).map(([fileRef, bytes]) => ({
    ref: fileRef,
    sha256: sha256(bytes),
  }));
  if (canonicalJson(expected) !== canonicalJson(manifest.files))
    throw new Error('TRAINER_PACKAGE_AUTHORITY_DRIFT');
  const actual = exactTree(portableResolve(runPath, 'package'), runPath).filter(
    ({ref: actualRef}) => actualRef !== ref,
  );
  if (canonicalJson(actual) !== canonicalJson(manifest.files))
    throw new Error('TRAINER_PACKAGE_TREE_DRIFT');
  return manifest;
};
