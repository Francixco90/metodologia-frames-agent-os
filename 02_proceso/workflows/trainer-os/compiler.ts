import {readFileSync} from 'node:fs';
import {posix} from 'node:path';
import {TrainerExtendedContentSchema} from './adapter-extended-contracts.ts';
import {validateAdapterPlan} from './adapter-renderers.ts';
import {renderCompilerArtifact, validateExtendedCompilerPlan} from './compiler-extended.ts';
import {TrainerTokenAuthoritySchema} from './design-assets.schemas.ts';
import {canonicalJson, hashModel, sha256} from './common.ts';
import {
  assertEvidenceAuthorized,
  compilerTreeSha256,
  lockContextSha256,
  privacyGate,
  readBoundJson,
  readEvidenceReceipts,
  resolveBoundRef,
} from './compiler-authority.ts';
import {
  TrainerAssetManifestSchema,
  TrainerBuildManifestSchema,
  TrainerDesignDecisionReceiptSchema,
  TrainerRightsReceiptSchema,
} from './compiler-contracts.ts';
import {assertCleanCompilerPaths, exactTree, promoteTree} from './compiler-io.ts';
import {TrainerArtifactPlanV1Schema} from './trainer-artifact-plan-v1.schema.ts';
import {TrainerDesignLockV1Schema} from './trainer-design-lock-v1.schema.ts';
import {TrainerIntakeV1Schema} from './trainer-intake-v1.schema.ts';
import {TrainerRouteSpecV1Schema} from './trainer-route-spec-v1.schema.ts';
import type {TrainerRunManifestV1} from './trainer-run-manifest-v1.schema.ts';
import {hashFile, portableResolve, readJson, writeJson} from './runtime-io.ts';
const loadInputs = (runPath: string, manifest: TrainerRunManifestV1) => {
  if (!manifest.routeSpec || !manifest.designLock) throw new Error('TRAINER_BUILD_INPUT_MISSING');
  const route = TrainerRouteSpecV1Schema.parse(readBoundJson(runPath, manifest.routeSpec));
  if (!manifest.intake || canonicalJson(route.intake) !== canonicalJson(manifest.intake))
    throw new Error('TRAINER_INTAKE_BINDING_DRIFT');
  const intake = TrainerIntakeV1Schema.parse(readBoundJson(runPath, route.intake));
  const lock = TrainerDesignLockV1Schema.parse(readBoundJson(runPath, manifest.designLock));
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
    resolveBoundRef(runPath, binding);
  }
  for (const asset of assets.assets) {
    const receipt = TrainerRightsReceiptSchema.parse(readBoundJson(runPath, asset.rightsReceipt));
    if (
      receipt.asset.ref !== asset.ref ||
      receipt.asset.sha256 !== asset.sha256 ||
      receipt.rights !== asset.rights
    )
      throw new Error(`TRAINER_RIGHTS_RECEIPT_MISMATCH:${asset.ref}`);
  }
  const decision = TrainerDesignDecisionReceiptSchema.parse(
    readBoundJson(runPath, lock.decisionReceipt),
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
  const adapterSource = contentAsset ? readBoundJson(runPath, contentAsset) : undefined;
  if (adapterSource) privacyGate(JSON.stringify(adapterSource));
  const adapterContent = validateAdapterPlan(plan, adapterSource);
  validateExtendedCompilerPlan(plan, adapterSource, assets.assets, (binding) =>
    readBoundJson(runPath, binding),
  );
  const extended = TrainerExtendedContentSchema.safeParse(adapterSource);
  const evidenceContent = adapterContent ?? (extended.success ? extended.data : undefined);
  // prettier-ignore
  const forbidden = [contentAsset?.ref, manifest.routeSpec.ref, manifest.designLock.ref, route.intake.ref, 'artifact-plan.json', 'assets.json', lock.tokens.ref, lock.decisionReceipt.ref, ...assets.assets.map(({rightsReceipt}) => rightsReceipt.ref), ...(evidenceContent?.evidence ?? []).map(({authorityReceipt}) => authorityReceipt.ref)].filter((value): value is string => Boolean(value));
  const evidence = evidenceContent?.evidence ?? [];
  const receipts = readEvidenceReceipts(runPath, evidence);
  assertEvidenceAuthorized(evidence, assets.assets, intake.sourceRefs, receipts, forbidden);
  const theme = adapterSource
    ? TrainerTokenAuthoritySchema.parse(readBoundJson(runPath, lock.tokens))
    : undefined;
  return {route, lock, plan, assets, planPath, assetsPath, adapterSource, theme};
};
export const compileTrainer = (runPath: string, manifest: TrainerRunManifestV1) => {
  if (manifest.state !== 'DESIGN_LOCKED' || !manifest.routeSpec || !manifest.designLock)
    throw new Error(`TRAINER_BUILD_REQUIRES_DESIGN_LOCKED:${manifest.state}`);
  const bindings = {routeSpec: manifest.routeSpec, designLock: manifest.designLock};
  const {route, lock, plan, planPath, assetsPath, adapterSource, theme} = loadInputs(
    runPath,
    manifest,
  );
  const planHash = hashFile(planPath);
  const assetsHash = hashFile(assetsPath);
  // prettier-ignore
  if (plan.artifacts.some(({outputRef}) => !/^dist\/[a-z0-9][a-z0-9./-]*$/u.test(outputRef) || posix.normalize(outputRef) !== outputRef || outputRef.includes('//')))
    throw new Error('TRAINER_PLAN_OUTPUT_REF_INVALID');
  const files = plan.artifacts.map((artifact) => {
    const html = renderCompilerArtifact(artifact, adapterSource, route, lock, bindings, theme);
    if (typeof html === 'string') privacyGate(html);
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
  const build = TrainerBuildManifestSchema.parse(readBoundJson(runPath, manifest.buildManifest));
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
    const bytes = readFileSync(portableResolve(runPath, output.ref));
    if (output.ref.endsWith('.html')) privacyGate(bytes.toString('utf8'));
    const artifact = inputs.plan.artifacts.find(({outputRef}) => outputRef === output.ref);
    const expected =
      artifact &&
      renderCompilerArtifact(
        artifact,
        inputs.adapterSource,
        inputs.route,
        inputs.lock,
        {
          routeSpec: manifest.routeSpec,
          designLock: manifest.designLock,
        },
        inputs.theme,
      );
    if (!expected || !bytes.equals(typeof expected === 'string' ? Buffer.from(expected) : expected))
      throw new Error('TRAINER_ADAPTER_OUTPUT_DRIFT');
  }
  if (canonicalJson(actual) !== canonicalJson(build.outputs))
    throw new Error('TRAINER_OUTPUT_TREE_DRIFT');
  if (sha256(canonicalJson(actual)) !== build.treeSha256)
    throw new Error('TRAINER_OUTPUT_TREE_HASH_DRIFT');
  return build;
};
