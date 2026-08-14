import {createHash} from 'node:crypto';
import {mkdirSync, readFileSync, readdirSync, writeFileSync} from 'node:fs';
import {relative, resolve} from 'node:path';

import {describe, expect, it} from 'vitest';

import {hashModel, sha256} from '../../../02_proceso/workflows/trainer-os/common.ts';
import {prepareContinuity} from '../../../02_proceso/workflows/trainer-os/runtime-guards.ts';
import {executeTrainer} from '../../../02_proceso/workflows/trainer-os/runner.ts';
import {
  TrainerPackageManifestSchema,
  TrainerVerificationReceiptSchema,
  TrainerHumanReviewReceiptSchema,
} from '../../../02_proceso/workflows/trainer-os/trainer-package-contracts.ts';
import {verifyTrainerPackage} from '../../../02_proceso/workflows/trainer-os/trainer-package.ts';
import {TrainerRunManifestV1Schema} from '../../../02_proceso/workflows/trainer-os/trainer-run-manifest-v1.schema.ts';
import {fixture} from './trainer-os-compiler-core.test.ts';

const sha = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');
const write = (path: string, value: unknown) =>
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
const snapshot = (root: string): string[] =>
  readdirSync(root, {withFileTypes: true})
    .flatMap((entry) => {
      const path = resolve(root, entry.name);
      return entry.isDirectory()
        ? snapshot(path).map((item) => `${entry.name}/${item}`)
        : [`${relative(root, path)} ${sha(path)}`];
    })
    .sort();

const renderedFixture = () => {
  const item = fixture();
  const compiled = executeTrainer('build', item.runPath);
  if (!compiled.buildManifest) throw new Error('synthetic build missing');
  const build = JSON.parse(
    readFileSync(resolve(item.root, compiled.buildManifest.ref), 'utf8'),
  ) as {treeSha256: string};
  const verification = {
    schemaVersion: 'trainer-verification-receipt-v1',
    receiptId: 'synthetic-verification',
    receiptSha256: '',
    actorId: 'trainer-verifier',
    verdict: 'PASS',
    buildManifest: compiled.buildManifest,
    treeSha256: build.treeSha256,
    publicationAuthority: false,
  };
  verification.receiptSha256 = hashModel(verification, 'receiptSha256');
  TrainerVerificationReceiptSchema.parse(verification);
  write(resolve(item.root, 'verification.json'), verification);
  const verificationRef = {
    ref: 'verification.json',
    sha256: sha(resolve(item.root, 'verification.json')),
  };
  const human = {
    schemaVersion: 'trainer-human-review-receipt-v1',
    receiptId: 'synthetic-human-review',
    receiptSha256: '',
    actorId: 'H01',
    verdict: 'APPROVED',
    buildManifest: compiled.buildManifest,
    verificationReceipt: verificationRef,
    publicationAuthority: false,
  };
  human.receiptSha256 = hashModel(human, 'receiptSha256');
  TrainerHumanReviewReceiptSchema.parse(human);
  write(resolve(item.root, 'human-review.json'), human);
  const humanRef = {ref: 'human-review.json', sha256: sha(resolve(item.root, 'human-review.json'))};
  const advanced = {
    ...compiled,
    state: 'RENDERED_DRAFT' as const,
    verificationReceipt: verificationRef,
    humanReviewReceipt: {
      ...humanRef,
      actorId: 'H01' as const,
      verdict: 'APPROVED' as const,
      buildManifestSha256: compiled.buildManifest.sha256,
      verificationReceiptSha256: verificationRef.sha256,
    },
  };
  const continuity = prepareContinuity(advanced, 'human-review');
  for (const [ref, value] of continuity.writes) {
    mkdirSync(resolve(item.root, ref, '..'), {recursive: true});
    writeFileSync(resolve(item.root, ref), value);
  }
  const run = {...advanced, ...continuity.outputs, manifestSha256: ''};
  run.manifestSha256 = hashModel(run, 'manifestSha256');
  TrainerRunManifestV1Schema.parse(run);
  write(item.runPath, run);
  return {...item, run};
};

describe('Trainer OS deterministic local package', () => {
  it('packages a reviewed build atomically and replays byte-identically', () => {
    const item = renderedFixture();
    expect(executeTrainer('package', item.runPath).state).toBe('RENDERED_DRAFT');
    const first = snapshot(resolve(item.root, 'package'));
    const manifest = verifyTrainerPackage(item.runPath);
    expect(TrainerPackageManifestSchema.parse(manifest)).toMatchObject({
      state: 'RENDERED_DRAFT',
      authorityScope: 'synthetic-fixture-only',
      projectState: 'INTAKE',
      artifactCount: 2,
      effects: {network: false, connectors: false, publication: false},
      publicationAuthority: false,
    });
    executeTrainer('package', item.runPath);
    expect(snapshot(resolve(item.root, 'package'))).toEqual(first);
  });

  it('requires the exact reviewed state and bound receipt bytes', () => {
    const unreviewed = fixture();
    executeTrainer('build', unreviewed.runPath);
    expect(() => executeTrainer('package', unreviewed.runPath)).toThrow(
      'TRAINER_PACKAGE_REQUIRES_RENDERED_DRAFT',
    );
    const reviewed = renderedFixture();
    writeFileSync(resolve(reviewed.root, 'verification.json'), '{}\n');
    expect(() => executeTrainer('package', reviewed.runPath)).toThrow();
  });

  it('rejects self-declared approvals without an external append-only authority event', () => {
    const forged = renderedFixture();
    const run = {...forged.run, runId: 'forged-run', manifestSha256: ''};
    run.manifestSha256 = hashModel(run, 'manifestSha256');
    write(forged.runPath, run);
    expect(() => executeTrainer('package', forged.runPath)).toThrow(
      'TRAINER_PACKAGE_PRODUCTION_AUTHORITY_UNAVAILABLE',
    );
  });

  it('rejects receipt reference aliases even when their internal hashes are recomputed', () => {
    const forged = renderedFixture();
    const verificationPath = resolve(forged.root, 'verification.json');
    const verification = JSON.parse(readFileSync(verificationPath, 'utf8')) as {
      receiptSha256: string;
      buildManifest: {ref: string; sha256: string};
    };
    verification.buildManifest.ref = 'other-build.json';
    verification.receiptSha256 = hashModel(verification, 'receiptSha256');
    write(verificationPath, verification);
    const verificationSha = sha(verificationPath);
    const run = {
      ...forged.run,
      verificationReceipt: {...forged.run.verificationReceipt, sha256: verificationSha},
      humanReviewReceipt: {
        ...forged.run.humanReviewReceipt,
        verificationReceiptSha256: verificationSha,
      },
      manifestSha256: '',
    };
    run.manifestSha256 = hashModel(run, 'manifestSha256');
    write(forged.runPath, run);
    expect(() => executeTrainer('package', forged.runPath)).toThrow(
      'TRAINER_PACKAGE_SYNTHETIC_AUTHORITY_BINDING_DRIFT',
    );
  });

  it('rejects artifact mutation and residual package paths', () => {
    const mutated = renderedFixture();
    writeFileSync(resolve(mutated.root, 'dist/landing/es/index.html'), 'changed');
    expect(() => executeTrainer('package', mutated.runPath)).toThrow(
      'TRAINER_ADAPTER_OUTPUT_DRIFT',
    );
    const residual = renderedFixture();
    mkdirSync(resolve(residual.root, '.trainer-package-stage'));
    expect(() => executeTrainer('package', residual.runPath)).toThrow(
      'TRAINER_PACKAGE_RESIDUAL_PATH',
    );
  });

  it('detects package mutation and unmanifested extras', () => {
    const item = renderedFixture();
    executeTrainer('package', item.runPath);
    writeFileSync(resolve(item.root, 'package/artifacts/extra.txt'), 'unexpected');
    expect(() => verifyTrainerPackage(item.runPath)).toThrow('TRAINER_PACKAGE_TREE_DRIFT');
  });

  it('rejects a rehashed project snapshot with injected authority claims', () => {
    const item = renderedFixture();
    executeTrainer('package', item.runPath);
    const snapshotPath = resolve(item.root, 'package/authority/project-snapshot.yml');
    writeFileSync(snapshotPath, 'current_state: INTAKE\nproduction_authority: true\n');
    const manifestPath = resolve(item.root, 'package/package-manifest.json');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
      packageManifestSha256: string;
      projectSnapshot: {ref: string; sha256: string};
      files: Array<{ref: string; sha256: string}>;
      treeSha256: string;
    };
    manifest.projectSnapshot.sha256 = sha(snapshotPath);
    const binding = manifest.files.find(({ref}) => ref === manifest.projectSnapshot.ref);
    if (!binding) throw new Error('synthetic project snapshot binding missing');
    binding.sha256 = manifest.projectSnapshot.sha256;
    manifest.treeSha256 = sha256(JSON.stringify(manifest.files));
    manifest.packageManifestSha256 = hashModel(manifest, 'packageManifestSha256');
    write(manifestPath, manifest);
    expect(() => verifyTrainerPackage(item.runPath)).toThrow();
  });
});
