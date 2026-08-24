import {linkSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import ts from 'typescript';
import {parse as parseYaml} from 'yaml';
import {
  CheckError,
  fail,
  packageRoot,
  parseOutput,
  readRegularContained,
  repoRoot,
} from './check-core.mjs';

// prettier-ignore
export const dependencyAttackCases = ['dependency-integrity-drift', 'regular-file-symlink', 'regular-file-hardlink'];

// prettier-ignore
export const dependencyPins = new Map([
  ['typescript', {version: '6.0.3', integrity: 'sha512-y2TvuxSZPDyQakkFRPZHKFm+KKVqIisdg9/CZwm9ftvKXLP8NRWj38/ODjNbr43SsoXqNuAisEf1GdCxqWcdBw=='}],
  ['zod', {version: '4.3.6', integrity: 'sha512-rftlrkhHZOcjDwkGlnUtZZkvaPHCsDATp4pGpuOOMDaTdDDXF91wuVDJoWoPsKX/3YPQ5fHuF3STjcYyKr+Qhg=='}],
  ['tsx', {version: '4.23.1', integrity: 'sha512-GQHnkIfxyx1wYCOS/wonik5MVRZU9hi1TEZmzGZSCJB1y9YgoZ8H6itNE/u4suE+yLmOzuE4E5S4TZ/ZX2wcWQ=='}],
  ['yaml', {version: '2.9.0', integrity: 'sha512-2AvhNX3mb8zd6Zy7INTtSpl1F15HW6Wnqj0srWlkKLcpYl/gMIMJiyuGq2KeI2YFxUPjdlB+3Lc10seMLtL4cA=='}],
]);

export const assertDependencyPins = (pins = dependencyPins) => {
  const manifest = parseOutput(
    readRegularContained(repoRoot, join(repoRoot, 'package.json')).toString('utf8'),
    'CHECK_TOOLCHAIN_AUTHORITY',
  );
  let lockfile;
  try {
    lockfile = parseYaml(
      readRegularContained(repoRoot, join(repoRoot, 'pnpm-lock.yaml')).toString('utf8'),
    );
  } catch {
    fail('CHECK_TOOLCHAIN_LOCK_INVALID');
  }
  const importer = lockfile?.importers?.['.'];
  for (const [name, pin] of pins) {
    const declared = manifest.devDependencies?.[name] ?? manifest.dependencies?.[name];
    const locked = importer?.devDependencies?.[name] ?? importer?.dependencies?.[name];
    const lockedPackage = lockfile?.packages?.[`${name}@${pin.version}`];
    const installed = parseOutput(
      readFileSync(join(repoRoot, 'node_modules', name, 'package.json'), 'utf8'),
      'CHECK_DEPENDENCY_PACKAGE_INVALID',
    );
    if (
      declared !== pin.version ||
      locked?.specifier !== pin.version ||
      locked?.version !== pin.version ||
      installed.version !== pin.version ||
      !/^sha512-[A-Za-z0-9+/]{86}==$/u.test(pin.integrity) ||
      lockedPackage?.resolution?.integrity !== pin.integrity
    )
      fail('CHECK_DEPENDENCY_PIN_MISMATCH');
  }
  if (ts.version !== pins.get('typescript').version) fail('CHECK_TYPESCRIPT_VERSION');
};

export const assertDependencyPinAttack = () => {
  const driftedPins = new Map(dependencyPins);
  const zodPin = dependencyPins.get('zod');
  driftedPins.set('zod', {...zodPin, integrity: `${zodPin.integrity.slice(0, -3)}A==`});
  try {
    assertDependencyPins(driftedPins);
    fail('CHECK_DEPENDENCY_INTEGRITY_DRIFT_ACCEPTED');
  } catch (error) {
    if (!(error instanceof CheckError) || error.code !== 'CHECK_DEPENDENCY_PIN_MISMATCH')
      throw error;
  }
};

export const assertCandidateResources = () => {
  const skill = readRegularContained(packageRoot, join(packageRoot, 'SKILL.md')).toString('utf8');
  if (
    skill.includes(['TO', 'DO'].join('')) ||
    !skill.includes('UNREGISTERED_DRAFT') ||
    !skill.includes('CANDIDATE_PENDING_GATE')
  )
    fail('CHECK_CANDIDATE_ASSUMPTIONS');
  for (const ref of ['agents/openai.yaml', 'references/grammar-selection.md', 'tsconfig.json'])
    readRegularContained(packageRoot, join(packageRoot, ref), 'CHECK_REQUIRED_RESOURCE_MISSING');
};

export const assertRegularReaderAttacks = () => {
  const supplied = process.env.METODOLOGIA_REGULAR_ATTACK_ROOT;
  const root = supplied ? realpathSync(supplied) : mkdtempSync(join(tmpdir(), 'diagram-regular-reader-'));
  const source = join(root, 'source.json');
  const linked = join(root, 'linked.json');
  const symbolic = join(root, 'symbolic.json');
  const rejects = (file) => {
    try {
      readRegularContained(root, file);
      fail('CHECK_UNSAFE_RESOURCE_ACCEPTED');
    } catch (error) {
      if (!(error instanceof CheckError) || error.code !== 'CHECK_RESOURCE_NOT_REGULAR') throw error;
    }
  };
  try {
    if (!supplied) {
      writeFileSync(source, '{}');
      linkSync(source, linked);
      symlinkSync('source.json', symbolic);
    }
    rejects(linked);
    rejects(symbolic);
  } finally {
    if (!supplied) rmSync(root, {recursive: true, force: true});
  }
};

export const assertTypeScriptGate = () => {
  const configPath = join(packageRoot, 'tsconfig.json');
  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
  if (configFile.error) fail('CHECK_TYPESCRIPT_CONFIG');
  const parsed = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    packageRoot,
    {noEmit: true},
    configPath,
  );
  if (parsed.errors.length > 0) fail('CHECK_TYPESCRIPT_CONFIG');
  const program = ts.createProgram({rootNames: parsed.fileNames, options: parsed.options});
  if (
    ts.getPreEmitDiagnostics(program).some(({category}) => category === ts.DiagnosticCategory.Error)
  )
    fail('CHECK_TYPESCRIPT_GATE');
};
