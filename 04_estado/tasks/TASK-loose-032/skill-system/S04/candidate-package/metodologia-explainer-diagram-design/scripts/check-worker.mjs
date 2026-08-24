import {spawnSync} from 'node:child_process';
import {realpathSync} from 'node:fs';
import {join} from 'node:path';
// prettier-ignore
import {CheckError, assertContainedCache, compiler, fail, localSourcePins, negatives, packageRoot, parseOutput, positives, readRegularContained, repoRoot, sha, snapshot, validator} from './check-core.mjs';
// prettier-ignore
import {assertCandidateResources, assertDependencyPinAttack, assertDependencyPins, assertRegularReaderAttacks, assertTypeScriptGate, dependencyAttackCases, dependencyPins} from './check-dependencies.mjs';
// prettier-ignore
import {assertMaterialAttacks, assertPositiveFixture, materialAttackCases, validatorInput} from './check-materials.mjs';
// prettier-ignore
import {assertOfflineCoverage, createOfflineRuntime, runtimeAttackCases} from './check-offline-runtime.mjs';
// prettier-ignore
import {assertAdversarialAudits, assertRuntimeSources, sourceAttackCases} from './check-source-security.mjs';

const createOuterRuntime = () => {
  const cacheRoot = realpathSync(process.env.TMPDIR ?? '');
  const runTsx = (script, input, args = []) => {
    const result = spawnSync(
      process.execPath,
      [
        '--permission',
        '--allow-worker',
        '--no-warnings',
        '--allow-fs-read=*',
        `--allow-fs-write=${cacheRoot}`,
        '--import',
        'tsx',
        script,
        ...args,
      ],
      {
        cwd: repoRoot,
        encoding: 'utf8',
        env: process.env,
        input,
        maxBuffer: 8 * 1024 * 1024,
      },
    );
    assertContainedCache(cacheRoot);
    return result;
  };
  return {
    assertCacheContained: () => assertContainedCache(cacheRoot),
    assertNetworkBlocked: () => undefined,
    cleanup: () => undefined,
    runTsx,
  };
};

const assertPositiveCases = (runTsx) => {
  for (const ref of positives) {
    const fixture = parseOutput(
      readRegularContained(packageRoot, join(packageRoot, 'fixtures', ref)).toString('utf8'),
      'CHECK_POSITIVE_FIXTURE_PARSE',
    );
    assertPositiveFixture(fixture, ref === positives[0] ? 'PASA' : 'PIVOTE');
    assertMaterialAttacks(fixture);
    const input = validatorInput(fixture);
    const validation = runTsx(validator, input);
    if (validation.status !== 0 || validation.stderr !== '') fail('CHECK_POSITIVE_VALIDATION');
    const result = parseOutput(validation.stdout, 'CHECK_VALIDATION_OUTPUT');
    if (result.status !== 'PASS' || result.diagram_sha256 !== sha(fixture.diagram))
      fail('CHECK_VALIDATION_RESULT');
    const first = runTsx(compiler, input);
    const second = runTsx(compiler, input);
    if (
      first.status !== 0 ||
      second.status !== 0 ||
      first.stderr !== '' ||
      second.stderr !== '' ||
      first.stdout !== second.stdout
    )
      fail('CHECK_COMPILE_DETERMINISM');
    if (
      JSON.stringify(parseOutput(first.stdout, 'CHECK_COMPILE_OUTPUT')) !==
      JSON.stringify(fixture.diagram)
    )
      fail('CHECK_COMPILE_PROJECTION');
  }
};

const assertNegativeCases = (runTsx) => {
  for (const [ref, expectedCode] of negatives) {
    const input = readRegularContained(packageRoot, join(packageRoot, 'fixtures', ref)).toString(
      'utf8',
    );
    const validation = runTsx(validator, input);
    if (validation.status !== 2 || validation.stdout !== '') fail('CHECK_NEGATIVE_STATUS');
    const result = parseOutput(validation.stderr, 'CHECK_NEGATIVE_OUTPUT');
    if (result.status !== 'BLOCKED' || result.error_code !== expectedCode)
      fail('CHECK_NEGATIVE_ERROR_CODE');
  }
};

const adversarialChecks = [
  ...sourceAttackCases,
  ...materialAttackCases,
  ...dependencyAttackCases,
  ...runtimeAttackCases,
];
const result = () => ({
  schema_version: 'explainer-diagram-skill-check-v1',
  status: 'PASS',
  positive_cases: positives.length,
  negative_cases: negatives.length,
  adversarial_cases: adversarialChecks.length,
  adversarial_checks: adversarialChecks,
  deterministic: true,
  permissions: 'read-all_write-temp-only',
  network_isolation: 'darwin-sandbox-exec-deny-network',
  relation_kind_binding: 'grammar-constrained_edge-kind-not-represented',
  h03_external: 'DEFERRED',
  pinned_local_source_files: localSourcePins.size,
  declared_runtime_dependencies: dependencyPins.size,
  installed_dependency_bytes: 'COVERAGE_GAP',
  synthetic_materials_unknown_fields: 'COVERAGE_GAP',
  writes: 0,
});

const main = () => {
  assertOfflineCoverage();
  const before = snapshot();
  const runtime =
    process.env.METODOLOGIA_OUTER_SANDBOX === 'verified'
      ? createOuterRuntime()
      : createOfflineRuntime();
  try {
    assertRuntimeSources();
    assertAdversarialAudits();
    assertDependencyPins();
    assertDependencyPinAttack();
    assertRegularReaderAttacks();
    runtime.assertNetworkBlocked();
    assertCandidateResources();
    assertPositiveCases(runtime.runTsx);
    assertNegativeCases(runtime.runTsx);
    assertTypeScriptGate();
    runtime.assertCacheContained();
    if (JSON.stringify(before) !== JSON.stringify(snapshot())) fail('CHECK_UNEXPECTED_WRITE');
    process.stdout.write(`${JSON.stringify(result())}\n`);
  } finally {
    runtime.cleanup();
  }
};

try {
  main();
} catch (error) {
  const errorCode =
    error instanceof CheckError && /^CHECK_[A-Z0-9_]+$/u.test(error.code)
      ? error.code
      : 'CHECK_UNEXPECTED_FAILURE';
  process.stderr.write(
    `${JSON.stringify({schema_version: 'explainer-diagram-skill-check-v1', status: 'BLOCKED', error_code: errorCode})}\n`,
  );
  process.exitCode = 2;
}
