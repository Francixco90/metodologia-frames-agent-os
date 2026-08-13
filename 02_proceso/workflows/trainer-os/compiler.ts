import {readFileSync} from 'node:fs';
import {posix} from 'node:path';

import {validateAdapterPlan} from './adapter-renderers.ts';
import {renderCompilerArtifact, validateExtendedCompilerPlan} from './compiler-extended.ts';
import {TrainerTokenAuthoritySchema} from './design-assets.schemas.ts';
import {canonicalJson, hashModel, sha256} from './common.ts';
import {compilerTreeSha256, lockContextSha256, privacyGate} from './compiler-authority.ts';
import {
  TrainerAssetManifestSchema,
  TrainerBuildManifestSchema,
  TrainerDesignDecisionReceiptSchema,
  TrainerRightsReceiptSchema,
} from './compiler-contracts.ts';
import {assertCleanCompilerPaths, exactTree, promoteTree} from './compiler-io.ts';
import {TrainerArtifactPlanV1Schema} from './trainer-artifact-plan-v1.schema.ts';
import {TrainerDesignLockV1Schema} from './trainer-design-lock-v1.schema.ts';
import {TrainerRouteSpecV1Schema} from './trainer-route-spec-v1.schema.ts';
import type {TrainerRunManifestV1} from './trainer-run-manifest-v1.schema.ts';
import {hashFile, portableResolve, readJson, writeJson} from './runtime-io.ts';

const ref = (runPath: string, binding: {ref: string; sha256: string}) => {
  const path = portableResolve(runPath, binding.ref);
  if (hashFile(path) !== binding.sha256) throw new Error(`TRAINER_INPUT_HASH_DRIFT:${binding.ref}`);
  return path;
};
const loadInputs = (runPath: string, manifest: TrainerRunManifestV1) => {
  if (!manifest.routeSpec || !manifest.designLock) throw new Error('TRAINER_BUILD_INPUT_MISSING');
  const route = TrainerRouteSpecV1Schema.parse(readJson(ref(runPath, manifest.routeSpec)));
  const lock = TrainerDesignLockV1Schema.parse(readJson(ref(runPath, manifest.designLock)));
  const planPath = portableResolve(runPath, 'artifact-plan.json');
  const plan = TrainerArtifactPlanV1Schema.parse(readJson(planPath));
  const assetsPath = portableResolve(runPath, 'assets.json');
  const assets = TrainerAssetManifestSchema.parse(readJson(assetsPath));
  if (
    lock.routeSpec.sha256 !== manifest.routeSpec.sha256 ||
    plan.routeSpec.sha256 !== manifest.routeSpec.sha256 ||
    plan.designLock.sha256 !== manifest.designLock.sha256
  )
    throw new Error('TRAINER_BUILD_BINDING_DRIFT');
  for (const binding of [
    manifest.routeSpec,
    manifest.designLock,
    lock.decisionReceipt,
    lock.tokens,
    ...assets.assets.flatMap((asset) => [asset, asset.rightsReceipt]),
  ]) {
    if (binding.ref.startsWith('dist/'))
      throw new Error(`TRAINER_INPUT_OVERLAPS_OUTPUT:${binding.ref}`);
    ref(runPath, binding);
  }
  for (const asset of assets.assets) {
    const receipt = TrainerRightsReceiptSchema.parse(readJson(ref(runPath, asset.rightsReceipt)));
    if (
      receipt.asset.ref !== asset.ref ||
      receipt.asset.sha256 !== asset.sha256 ||
      receipt.rights !== asset.rights
    )
      throw new Error(`TRAINER_RIGHTS_RECEIPT_MISMATCH:${asset.ref}`);
  }
  const decision = TrainerDesignDecisionReceiptSchema.parse(
    readJson(ref(runPath, lock.decisionReceipt)),
  );
  if (
    decision.selectedDirectionId !== lock.selectedDirectionId ||
    !lock.directions.some(({directionId}) => directionId === decision.selectedDirectionId) ||
    canonicalJson(decision.routeSpec) !== canonicalJson(manifest.routeSpec) ||
    canonicalJson(decision.context) !== canonicalJson(route.intake) ||
    decision.lockContextSha256 !== lockContextSha256(lock)
  )
    throw new Error('TRAINER_H01_DECISION_BINDING_DRIFT');
  if (assets.locale !== route.locale) throw new Error('TRAINER_LOCALE_MISMATCH');
  if (assets.networkRequired || assets.publicationAuthority || plan.publicationAuthority)
    throw new Error('TRAINER_BUILD_EFFECT_FORBIDDEN');
  privacyGate(JSON.stringify({route, lock, plan, assets}));
  const contentAsset = assets.assets.find(({ref}) => ref === 'adapter-content.json');
  const adapterContent = contentAsset ? readJson(ref(runPath, contentAsset)) : undefined;
  validateAdapterPlan(plan, adapterContent);
  validateExtendedCompilerPlan(plan, adapterContent);
  const theme = adapterContent
    ? TrainerTokenAuthoritySchema.parse(readJson(ref(runPath, lock.tokens)))
    : undefined;
  return {route, lock, plan, assets, planPath, assetsPath, adapterContent, theme};
};

export const compileTrainer = (runPath: string, manifest: TrainerRunManifestV1) => {
  if (manifest.state !== 'DESIGN_LOCKED' || !manifest.routeSpec || !manifest.designLock)
    throw new Error(`TRAINER_BUILD_REQUIRES_DESIGN_LOCKED:${manifest.state}`);
  const routeBinding = manifest.routeSpec;
  const lockBinding = manifest.designLock;
  const {route, lock, plan, planPath, assetsPath, adapterContent, theme} = loadInputs(
    runPath,
    manifest,
  );
  const planHash = hashFile(planPath);
  const assetsHash = hashFile(assetsPath);
  if (
    plan.artifacts.some(
      ({outputRef}) =>
        !/^dist\/[a-z0-9][a-z0-9./-]*$/u.test(outputRef) ||
        posix.normalize(outputRef) !== outputRef ||
        outputRef.includes('//'),
    )
  )
    throw new Error('TRAINER_PLAN_OUTPUT_REF_INVALID');
  const files = plan.artifacts.map((artifact) => {
    const html = renderCompilerArtifact(
      artifact,
      adapterContent,
      route,
      lock,
      {
        routeSpec: routeBinding,
        designLock: lockBinding,
      },
      theme,
    );
    privacyGate(html);
    return [artifact.outputRef, html] as const;
  });
  promoteTree(runPath, files);
  const outputs = exactTree(portableResolve(runPath, 'dist'), runPath);
  const treeSha256 = sha256(canonicalJson(outputs));
  const draft = {
    schemaVersion: 'trainer-build-manifest-v1',
    manifestId: `${manifest.runId}-build`,
    buildManifestSha256: '',
    compiler: {name: 'trainer-core', version: '1.0.0', sourceTreeSha256: compilerTreeSha256()},
    routeSpec: manifest.routeSpec,
    designLock: manifest.designLock,
    artifactPlan: {ref: 'artifact-plan.json', sha256: planHash},
    assetManifest: {ref: 'assets.json', sha256: assetsHash},
    locale: route.locale,
    outputRoot: 'dist',
    outputs,
    treeSha256,
    receipt: {
      receiptId: `${manifest.runId}-build-receipt`,
      treeSha256,
      outputCount: outputs.length,
    },
    maximumState: 'RENDERED_DRAFT',
    publicationAuthority: false,
  };
  draft.buildManifestSha256 = hashModel(draft, 'buildManifestSha256');
  const build = TrainerBuildManifestSchema.parse(draft);
  const buildRef = 'outputs/build-manifest.json';
  writeJson(portableResolve(runPath, buildRef), build);
  assertCleanCompilerPaths(runPath);
  return {build, buildRef, buildSha256: hashFile(portableResolve(runPath, buildRef)), planHash};
};

export const verifyTrainerBuild = (runPath: string, manifest: TrainerRunManifestV1) => {
  if (!manifest.buildManifest) throw new Error('TRAINER_BUILD_MANIFEST_MISSING');
  const build = TrainerBuildManifestSchema.parse(readJson(ref(runPath, manifest.buildManifest)));
  if (build.compiler.sourceTreeSha256 !== compilerTreeSha256())
    throw new Error('TRAINER_COMPILER_SOURCE_DRIFT');
  if (
    !manifest.routeSpec ||
    !manifest.designLock ||
    canonicalJson(build.routeSpec) !== canonicalJson(manifest.routeSpec) ||
    canonicalJson(build.designLock) !== canonicalJson(manifest.designLock)
  )
    throw new Error('TRAINER_BUILD_MANIFEST_REBOUND');
  const inputs = loadInputs(runPath, manifest);
  if (
    build.artifactPlan.sha256 !== hashFile(inputs.planPath) ||
    build.assetManifest.sha256 !== hashFile(inputs.assetsPath)
  )
    throw new Error('TRAINER_BUILD_INPUT_BINDING_DRIFT');
  assertCleanCompilerPaths(runPath);
  const actual = exactTree(portableResolve(runPath, build.outputRoot), runPath);
  if (
    canonicalJson(actual.map(({ref}) => ref)) !==
    canonicalJson(inputs.plan.artifacts.map(({outputRef}) => outputRef).sort())
  )
    throw new Error('TRAINER_PLANNED_OUTPUT_MISMATCH');
  for (const output of actual) {
    const bytes = readFileSync(portableResolve(runPath, output.ref), 'utf8');
    privacyGate(bytes);
    const artifact = inputs.plan.artifacts.find(({outputRef}) => outputRef === output.ref);
    const expected =
      artifact &&
      renderCompilerArtifact(
        artifact,
        inputs.adapterContent,
        inputs.route,
        inputs.lock,
        {routeSpec: manifest.routeSpec, designLock: manifest.designLock},
        inputs.theme,
      );
    if (bytes !== expected) throw new Error('TRAINER_ADAPTER_OUTPUT_DRIFT');
  }
  if (canonicalJson(actual) !== canonicalJson(build.outputs))
    throw new Error('TRAINER_OUTPUT_TREE_DRIFT');
  if (sha256(canonicalJson(actual)) !== build.treeSha256)
    throw new Error('TRAINER_OUTPUT_TREE_HASH_DRIFT');
  return build;
};
