import {spawnSync} from 'node:child_process';
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import {tmpdir} from 'node:os';
import {relative, resolve} from 'node:path';

import {expect, test} from 'vitest';

import {hashModel} from '../../../02_proceso/workflows/trainer-os/common.ts';
import {executeTrainer} from '../../../02_proceso/workflows/trainer-os/runner.ts';
import {prepareContinuity} from '../../../02_proceso/workflows/trainer-os/runtime-guards.ts';
import {TrainerIntakeV1Schema} from '../../../02_proceso/workflows/trainer-os/trainer-intake-v1.schema.ts';
import {TrainerRunManifestV1Schema} from '../../../02_proceso/workflows/trainer-os/trainer-run-manifest-v1.schema.ts';

test('keeps Trainer intake/spec deterministic, contained and fail-closed', () => {
  const root = process.cwd();
  const fixtures = resolve(root, '03_artefactos/projects/trainer-os/fixtures');
  const runtime = resolve(root, '02_proceso/workflows/trainer-os/runner.ts');
  const errors: string[] = [];
  const read = (path: string): unknown => JSON.parse(readFileSync(path, 'utf8'));
  const write = (path: string, value: unknown) =>
    writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
  const message = (result: ReturnType<typeof spawnSync>) =>
    `${String(result.stdout ?? '')}${String(result.stderr ?? '')}`;
  const execute = (directory: string, mode: string) =>
    spawnSync(
      process.execPath,
      ['--import', 'tsx', runtime, '--mode', mode, '--run', resolve(directory, 'run.json')],
      {encoding: 'utf8'},
    );
  const clone = (label: string): string => {
    const directory = mkdtempSync(resolve(tmpdir(), `trainer-${label}-`));
    cpSync(resolve(fixtures, 'positive'), directory, {recursive: true});
    return directory;
  };

  const intake = read(resolve(fixtures, 'positive/intake.json'));
  const run = read(resolve(fixtures, 'positive/run.json'));
  if (!TrainerIntakeV1Schema.safeParse(intake).success) errors.push('POSITIVE_INTAKE_REJECTED');
  if (!TrainerRunManifestV1Schema.safeParse(run).success) errors.push('POSITIVE_RUN_REJECTED');
  if (
    TrainerRunManifestV1Schema.safeParse(read(resolve(fixtures, 'negative/invalid-run.json')))
      .success
  )
    errors.push('NEGATIVE_RUN_ACCEPTED');

  const badRounds = structuredClone(intake) as Record<string, unknown>;
  Reflect.set(Reflect.get(badRounds, 'discovery') as object, 'promptRounds', [
    {round: 1, prompt: 'Insuficiente', blocking: true},
  ]);
  badRounds.intakeSha256 = hashModel(badRounds, 'intakeSha256');
  if (TrainerIntakeV1Schema.safeParse(badRounds).success) errors.push('SHORT_DISCOVERY_ACCEPTED');

  const first = clone('replay-a');
  const second = clone('replay-b');
  const temporary = [first, second];
  for (const directory of [first, second])
    for (const mode of ['intake', 'spec']) {
      const result = execute(directory, mode);
      if (result.status !== 0) errors.push(`EXEC_${mode}:${message(result)}`);
    }
  for (const path of [
    'run.json',
    'outputs/intake.json',
    'outputs/route-spec.json',
    'continuity/state.json',
    'continuity/resume.md',
    'continuity/handoff.json',
  ])
    if (readFileSync(resolve(first, path)).compare(readFileSync(resolve(second, path))) !== 0)
      errors.push(`NON_DETERMINISTIC:${path}`);

  const packageResult = execute(first, 'package');
  if (
    packageResult.status === 0 ||
    !message(packageResult).includes('TRAINER_PACKAGE_REQUIRES_RENDERED_DRAFT')
  )
    errors.push('PACKAGE_NOT_REVIEW_GATED');
  const benchmarkResult = execute(first, 'benchmark');
  if (
    benchmarkResult.status === 0 ||
    !message(benchmarkResult).includes('TRAINER_MODE_NOT_IMPLEMENTED_FAIL_CLOSED')
  )
    errors.push('MODE_NOT_FAIL_CLOSED:benchmark');
  if (execute(first, 'spec').status !== 0) errors.push('SPEC_NOT_RESTARTABLE');

  const continuityDrift = clone('continuity-drift');
  temporary.push(continuityDrift);
  for (const mode of ['intake', 'spec']) execute(continuityDrift, mode);
  writeFileSync(resolve(continuityDrift, 'continuity/resume.md'), 'tampered\n');
  if (!message(execute(continuityDrift, 'spec')).includes('TRAINER_CONTINUITY_BYTES_CHANGED'))
    errors.push('CONTINUITY_DRIFT_ACCEPTED');

  const sourceDrift = clone('source-drift');
  temporary.push(sourceDrift);
  writeFileSync(resolve(sourceDrift, 'source.txt'), 'tampered\n');
  if (!message(execute(sourceDrift, 'intake')).includes('TRAINER_SOURCE_HASH_DRIFT'))
    errors.push('SOURCE_DRIFT_ACCEPTED');

  const manifestDrift = clone('manifest-drift');
  temporary.push(manifestDrift);
  const changedManifest = read(resolve(manifestDrift, 'run.json')) as Record<string, unknown>;
  changedManifest.state = 'CONTEXT_READY';
  write(resolve(manifestDrift, 'run.json'), changedManifest);
  if (!message(execute(manifestDrift, 'intake')).includes('TRAINER_MANIFEST_HASH_DRIFT'))
    errors.push('MANIFEST_DRIFT_ACCEPTED');

  const alias = clone('alias');
  temporary.push(alias);
  const aliasManifest = read(resolve(alias, 'run.json')) as Record<string, unknown>;
  aliasManifest.stateRef = 'outputs/intake.json';
  aliasManifest.manifestSha256 = hashModel(aliasManifest, 'manifestSha256');
  write(resolve(alias, 'run.json'), aliasManifest);
  if (
    execute(alias, 'intake').status === 0 ||
    readFileSync(resolve(alias, 'intake.json')).compare(
      readFileSync(resolve(fixtures, 'positive/intake.json')),
    ) !== 0
  )
    errors.push('OUTPUT_ALIAS_OR_PARTIAL_WRITE_ACCEPTED');

  const sourceAlias = clone('source-alias');
  temporary.push(sourceAlias);
  const sourceAliasManifest = read(resolve(sourceAlias, 'run.json')) as Record<string, unknown>;
  sourceAliasManifest.stateRef = 'source.txt';
  sourceAliasManifest.manifestSha256 = hashModel(sourceAliasManifest, 'manifestSha256');
  write(resolve(sourceAlias, 'run.json'), sourceAliasManifest);
  const sourceBefore = readFileSync(resolve(sourceAlias, 'source.txt'));
  if (
    execute(sourceAlias, 'intake').status === 0 ||
    sourceBefore.compare(readFileSync(resolve(sourceAlias, 'source.txt'))) !== 0
  )
    errors.push('SOURCE_ALIAS_OR_PARTIAL_WRITE_ACCEPTED');

  const generatedAlias = clone('generated-alias');
  temporary.push(generatedAlias);
  const generatedIntake = read(resolve(generatedAlias, 'intake.json')) as Record<string, unknown>;
  generatedIntake.sourceRefs = [{ref: 'outputs/intake.json', sha256: 'a'.repeat(64)}];
  generatedIntake.intakeSha256 = hashModel(generatedIntake, 'intakeSha256');
  write(resolve(generatedAlias, 'intake.json'), generatedIntake);
  mkdirSync(resolve(generatedAlias, 'outputs'));
  writeFileSync(resolve(generatedAlias, 'outputs/intake.json'), 'protected source bytes\n', {
    flag: 'wx',
  });
  const generatedBefore = readFileSync(resolve(generatedAlias, 'outputs/intake.json'));
  if (
    execute(generatedAlias, 'intake').status === 0 ||
    generatedBefore.compare(readFileSync(resolve(generatedAlias, 'outputs/intake.json'))) !== 0
  )
    errors.push('GENERATED_OUTPUT_SOURCE_ALIAS_ACCEPTED');

  const relativeAlias = clone('relative-alias');
  temporary.push(relativeAlias);
  const relativeRun = resolve(relativeAlias, 'run.json');
  const relativeManifest = read(relativeRun) as Record<string, unknown>;
  relativeManifest.stateRef = 'run.json';
  relativeManifest.manifestSha256 = hashModel(relativeManifest, 'manifestSha256');
  write(relativeRun, relativeManifest);
  const relativeBefore = readFileSync(relativeRun);
  const relativeFromCwd = relative(relativeAlias, relativeRun);
  const originalCwd = process.cwd();
  process.chdir(relativeAlias);
  try {
    executeTrainer('intake', relativeFromCwd);
    errors.push('RELATIVE_MANIFEST_ALIAS_ACCEPTED');
  } catch {
    if (relativeBefore.compare(readFileSync(relativeRun)) !== 0)
      errors.push('RELATIVE_MANIFEST_ALIAS_OVERWROTE_RUN');
  } finally {
    process.chdir(originalCwd);
  }

  const symlinkAlias = clone('symlink-alias');
  const outside = mkdtempSync(resolve(tmpdir(), 'trainer-outside-'));
  temporary.push(symlinkAlias, outside);
  symlinkSync(outside, resolve(symlinkAlias, 'escape'));
  const symlinkManifest = read(resolve(symlinkAlias, 'run.json')) as Record<string, unknown>;
  symlinkManifest.stateRef = 'escape/state.json';
  symlinkManifest.manifestSha256 = hashModel(symlinkManifest, 'manifestSha256');
  write(resolve(symlinkAlias, 'run.json'), symlinkManifest);
  if (execute(symlinkAlias, 'intake').status === 0 || readdirSync(outside).length !== 0)
    errors.push('SYMLINK_ESCAPE_OR_OUTSIDE_WRITE_ACCEPTED');

  const invalidation = clone('invalidation');
  temporary.push(invalidation);
  for (const mode of ['intake', 'spec']) execute(invalidation, mode);
  const advanced = read(resolve(invalidation, 'run.json')) as Record<string, unknown>;
  advanced.state = 'DESIGN_LOCKED';
  advanced.designLock = {ref: 'design/lock.json', sha256: 'a'.repeat(64)};
  advanced.invalidated = [];
  advanced.manifestSha256 = hashModel(advanced, 'manifestSha256');
  write(resolve(invalidation, 'run.json'), advanced);
  const changedIntake = read(resolve(invalidation, 'outputs/intake.json')) as Record<
    string,
    unknown
  >;
  changedIntake.purpose = 'Propósito sintético modificado';
  changedIntake.intakeSha256 = hashModel(changedIntake, 'intakeSha256');
  write(resolve(invalidation, 'outputs/intake.json'), changedIntake);
  const invalidationResult = execute(invalidation, 'intake');
  const invalidated = read(resolve(invalidation, 'run.json')) as {
    state?: string;
    designLock?: unknown;
    invalidated?: string[];
  };
  if (
    invalidationResult.status !== 0 ||
    invalidated.state !== 'CONTEXT_READY' ||
    invalidated.designLock ||
    !invalidated.invalidated?.includes('designLock')
  )
    errors.push('DESCENDANT_INVALIDATION_FAILED');

  const advancedResume = clone('advanced-resume');
  temporary.push(advancedResume);
  for (const mode of ['intake', 'spec']) execute(advancedResume, mode);
  const advancedRun = read(resolve(advancedResume, 'run.json')) as Record<string, unknown>;
  advancedRun.state = 'DESIGN_LOCKED';
  advancedRun.designLock = {ref: 'design/lock.json', sha256: 'a'.repeat(64)};
  advancedRun.invalidated = [];
  const prepared = prepareContinuity(
    TrainerRunManifestV1Schema.parse({
      ...advancedRun,
      manifestSha256: hashModel(advancedRun, 'manifestSha256'),
    }),
    'spec',
  );
  Object.assign(advancedRun, prepared.outputs);
  advancedRun.manifestSha256 = hashModel(advancedRun, 'manifestSha256');
  for (const [ref, value] of prepared.writes) writeFileSync(resolve(advancedResume, ref), value);
  write(resolve(advancedResume, 'run.json'), advancedRun);
  const advancedResult = execute(advancedResume, 'intake');
  const advancedAfter = read(resolve(advancedResume, 'run.json')) as {state?: string};
  const advancedHandoff = read(resolve(advancedResume, 'continuity/handoff.json')) as {
    nextGate?: string;
  };
  if (
    advancedResult.status !== 0 ||
    advancedAfter.state !== 'DESIGN_LOCKED' ||
    advancedHandoff.nextGate !== 'build'
  )
    errors.push('ADVANCED_RESUME_STATE_OR_NEXT_GATE_DRIFT');

  for (const directory of temporary) rmSync(directory, {recursive: true, force: true});
  expect(errors).toEqual([]);
}, 30_000);
