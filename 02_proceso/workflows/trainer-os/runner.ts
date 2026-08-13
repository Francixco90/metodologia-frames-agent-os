import {resolve} from 'node:path';

import {compileTrainer, verifyTrainerBuild} from './compiler.ts';
import {hashModel} from './common.ts';
import {prepareContinuity, verifyContinuity, verifyWriteIsolation} from './runtime-guards.ts';
import {atomicWrite, hashFile, portableResolve, readJson, writeJson} from './runtime-io.ts';
import {invalidateFromIntake, invalidateFromSpec} from './state-machine.ts';
import {TrainerIntakeV1Schema} from './trainer-intake-v1.schema.ts';
import {TrainerRouteSpecV1Schema} from './trainer-route-spec-v1.schema.ts';
import {
  TrainerRunManifestV1Schema,
  type TrainerRunManifestV1,
} from './trainer-run-manifest-v1.schema.ts';

export type TrainerMode = 'intake' | 'spec' | 'build' | 'verify' | 'package' | 'benchmark';
const modes: TrainerMode[] = ['intake', 'spec', 'build', 'verify', 'package', 'benchmark'];
const runIntake = (runPath: string, manifest: TrainerRunManifestV1): TrainerRunManifestV1 => {
  const source = TrainerIntakeV1Schema.parse(
    readJson(portableResolve(runPath, manifest.intakeRef)),
  );
  verifyWriteIsolation(
    runPath,
    manifest,
    [
      ...(manifest.intake?.ref === manifest.intakeRef ? [] : [manifest.intakeRef]),
      ...source.sourceRefs.map(({ref}) => ref),
    ],
    ['outputs/intake.json'],
  );
  for (const sourceRef of source.sourceRefs)
    if (hashFile(portableResolve(runPath, sourceRef.ref)) !== sourceRef.sha256)
      throw new Error(`TRAINER_SOURCE_HASH_DRIFT:${sourceRef.ref}`);
  const outputRef = 'outputs/intake.json';
  const outputPath = portableResolve(runPath, outputRef);
  writeJson(outputPath, source);
  const nextHash = hashFile(outputPath);
  const changed = manifest.intake?.sha256 !== nextHash;
  return {
    ...manifest,
    state: changed || manifest.state === 'INTAKE' ? 'CONTEXT_READY' : manifest.state,
    intakeRef: outputRef,
    intake: {ref: outputRef, sha256: nextHash},
    routeSpec: changed ? undefined : manifest.routeSpec,
    designLock: changed ? undefined : manifest.designLock,
    artifactPlan: changed ? undefined : manifest.artifactPlan,
    buildManifest: changed ? undefined : manifest.buildManifest,
    verificationReceipt: changed ? undefined : manifest.verificationReceipt,
    invalidated: changed ? [...invalidateFromIntake()] : manifest.invalidated,
  };
};

const runSpec = (runPath: string, manifest: TrainerRunManifestV1): TrainerRunManifestV1 => {
  if (!['CONTEXT_READY', 'SPEC_READY'].includes(manifest.state) || !manifest.intake)
    throw new Error(`TRAINER_SPEC_REQUIRES_CONTEXT_READY:${manifest.state}`);
  const intakePath = portableResolve(runPath, manifest.intake.ref);
  if (hashFile(intakePath) !== manifest.intake.sha256)
    throw new Error('TRAINER_INTAKE_BYTES_CHANGED');
  const intake = TrainerIntakeV1Schema.parse(readJson(intakePath));
  verifyWriteIsolation(
    runPath,
    manifest,
    [manifest.intakeRef, manifest.intake.ref, ...intake.sourceRefs.map(({ref}) => ref)],
    ['outputs/route-spec.json'],
  );
  const draft = {
    schemaVersion: 'trainer-route-spec-v1',
    routeId: `${intake.intakeId}-route`,
    specSha256: '',
    intake: manifest.intake,
    locale: intake.locale,
    purpose: intake.purpose,
    outcomes: intake.observableOutcomes,
    modules: intake.observableOutcomes.map((outcome, index) => ({
      moduleId: `module-${index + 1}`,
      title: outcome,
      outcome,
      evidence: outcome,
    })),
    acceptanceCriteria: intake.observableOutcomes,
    decisions: [
      {
        label: '[INFERENCIA]' as const,
        statement:
          'Cada resultado observable se proyecta como un módulo inicial; requiere revisión humana.',
      },
    ],
  };
  draft.specSha256 = hashModel(draft, 'specSha256');
  const spec = TrainerRouteSpecV1Schema.parse(draft);
  const outputRef = 'outputs/route-spec.json';
  const outputPath = portableResolve(runPath, outputRef);
  writeJson(outputPath, spec);
  const outputHash = hashFile(outputPath);
  const changed = manifest.routeSpec?.sha256 !== outputHash;
  return {
    ...manifest,
    state: changed || manifest.state === 'CONTEXT_READY' ? 'SPEC_READY' : manifest.state,
    routeSpec: {ref: outputRef, sha256: outputHash},
    designLock: changed ? undefined : manifest.designLock,
    artifactPlan: changed ? undefined : manifest.artifactPlan,
    buildManifest: changed ? undefined : manifest.buildManifest,
    verificationReceipt: changed ? undefined : manifest.verificationReceipt,
    invalidated: changed ? [...invalidateFromSpec()] : manifest.invalidated,
  };
};

export const executeTrainer = (
  mode: TrainerMode,
  selectedRunPath: string,
): TrainerRunManifestV1 => {
  const runPath = resolve(selectedRunPath);
  if (!['intake', 'spec', 'build', 'verify'].includes(mode))
    throw new Error(`TRAINER_MODE_NOT_IMPLEMENTED_FAIL_CLOSED:${mode}`);
  const raw = readJson(runPath);
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw))
    throw new Error('TRAINER_MANIFEST_HASH_DRIFT');
  const record: Record<string, unknown> = {...raw};
  if (hashModel(record, 'manifestSha256') !== record.manifestSha256)
    throw new Error('TRAINER_MANIFEST_HASH_DRIFT');
  const manifest = TrainerRunManifestV1Schema.parse(record);
  verifyContinuity(runPath, manifest);
  if (mode === 'verify') {
    verifyTrainerBuild(runPath, manifest);
    return manifest;
  }
  const next =
    mode === 'intake'
      ? runIntake(runPath, manifest)
      : mode === 'spec'
        ? runSpec(runPath, manifest)
        : (() => {
            const compiled = compileTrainer(runPath, manifest);
            return {
              ...manifest,
              state: 'COMPILED' as const,
              artifactPlan: {ref: 'artifact-plan.json', sha256: compiled.planHash},
              buildManifest: {ref: compiled.buildRef, sha256: compiled.buildSha256},
              verificationReceipt: undefined,
              humanReviewReceipt: undefined,
              invalidated: [],
            };
          })();
  const continuity = prepareContinuity(next, mode);
  const candidate = {...next, ...continuity.outputs, manifestSha256: ''};
  candidate.manifestSha256 = hashModel(candidate, 'manifestSha256');
  const bound = TrainerRunManifestV1Schema.parse(candidate);
  for (const [ref, value] of continuity.writes) atomicWrite(portableResolve(runPath, ref), value);
  writeJson(runPath, bound);
  return bound;
};

export const main = (): number => {
  const mode = process.argv[process.argv.indexOf('--mode') + 1] as TrainerMode;
  const run = process.argv[process.argv.indexOf('--run') + 1];
  if (!modes.includes(mode) || !run)
    throw new Error(
      'USAGE: trainer --mode intake|spec|build|verify|package|benchmark --run <manifest>',
    );
  const result = executeTrainer(mode, resolve(run));
  console.info(`PASS TRAINER ${mode}: ${result.runId} -> ${result.state}`);
  return 0;
};

if (process.argv[1]?.endsWith('runner.ts')) process.exitCode = main();
