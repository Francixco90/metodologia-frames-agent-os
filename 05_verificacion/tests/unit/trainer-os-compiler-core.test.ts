import {createHash} from 'node:crypto';
import {
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import {tmpdir} from 'node:os';
import {relative, resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {afterEach, describe, expect, it} from 'vitest';

import {canonicalJson, hashModel} from '../../../02_proceso/workflows/trainer-os/common.ts';
import {compileTrainer} from '../../../02_proceso/workflows/trainer-os/compiler.ts';
import {executeTrainer} from '../../../02_proceso/workflows/trainer-os/runner.ts';

const temporary: string[] = [];
const sha = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');
const write = (path: string, value: unknown) =>
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
const model = (value: Record<string, unknown>, field: string) => ({
  ...value,
  [field]: hashModel(value, field),
});
const tree = (root: string): string[] =>
  readdirSync(root, {withFileTypes: true})
    .flatMap((entry) => {
      const path = resolve(root, entry.name);
      if (entry.isSymbolicLink()) return [`L ${relative(root, path)}`];
      return entry.isDirectory()
        ? tree(path).map((item) => `${entry.name}/${item}`)
        : [`${entry.name} ${sha(path)}`];
    })
    .sort();

const fixture = () => {
  const root = mkdtempSync(resolve(tmpdir(), 'trainer-compiler-'));
  temporary.push(root);
  mkdirSync(resolve(root, 'continuity'), {recursive: true});
  writeFileSync(resolve(root, 'source.txt'), 'Synthetic authored source.');
  writeFileSync(resolve(root, 'tokens.json'), '{"brand":"metodologia"}\n');
  const assetBinding = {ref: 'source.txt', sha256: sha(resolve(root, 'source.txt'))};
  write(resolve(root, 'rights.json'), {
    schemaVersion: 'trainer-asset-rights-receipt-v1',
    asset: assetBinding,
    rights: 'authored',
    publicationAuthority: false,
  });
  const intake = {
    schemaVersion: 'trainer-intake-v1',
    intakeId: 'synthetic-intake',
    locale: 'es',
    purpose: 'Probar el compilador',
    audience: 'Synthetic learners',
    sourceRefs: [{ref: 'source.txt', sha256: sha(resolve(root, 'source.txt'))}],
    constraints: ['Offline'],
    observableOutcomes: ['Artifact exists'],
    promptRounds: [
      {round: 1, prompt: 'Purpose?', response: 'Compile'},
      {round: 2, prompt: 'Audience?', response: 'Synthetic'},
      {round: 3, prompt: 'Evidence?', response: 'Bytes'},
    ],
    blockingQuestions: [],
    progressiveDisclosure: 'focused',
    decisions: [{label: '[SUPUESTO]', statement: 'Synthetic fixture only'}],
    tokenBudget: {maximum: 1000, estimated: 100, measured: 100, measurementStatus: 'synthetic'},
  };
  write(resolve(root, 'intake.json'), intake);
  const intakeRef = {ref: 'intake.json', sha256: sha(resolve(root, 'intake.json'))};
  const route = model(
    {
      schemaVersion: 'trainer-route-spec-v1',
      routeId: 'synthetic-route',
      specSha256: '',
      intake: intakeRef,
      locale: 'es',
      purpose: 'Probar el compilador',
      outcomes: ['Artifact exists'],
      modules: [
        {
          moduleId: 'module-one',
          title: 'Compiler',
          outcome: 'Artifact exists',
          evidence: 'Hashed bytes',
        },
      ],
      acceptanceCriteria: ['Artifact exists'],
      decisions: [{label: '[SUPUESTO]', statement: 'Synthetic fixture only'}],
    },
    'specSha256',
  );
  write(resolve(root, 'route.json'), route);
  const routeRef = {ref: 'route.json', sha256: sha(resolve(root, 'route.json'))};
  const lock = {
    schemaVersion: 'trainer-design-lock-v1',
    lockId: 'synthetic-lock',
    designLockSha256: '',
    routeSpec: routeRef,
    decision: 'human-selected',
    selectedDirectionId: 'direction-a',
    directions: [
      {directionId: 'direction-a', summary: 'Synthetic A'},
      {directionId: 'direction-b', summary: 'Synthetic B'},
    ],
    decisionReceipt: {ref: 'decision.json', sha256: '0'.repeat(64)},
    decisionActor: 'H01',
    tokens: {ref: 'tokens.json', sha256: sha(resolve(root, 'tokens.json'))},
    components: ['shell'],
    accessibility: {contrast: 'AA', reducedMotion: true},
    publicationAuthority: false,
  };
  const lockProjection = structuredClone(lock) as Record<string, unknown>;
  delete lockProjection.designLockSha256;
  delete lockProjection.decisionReceipt;
  const lockContextSha256 = createHash('sha256')
    .update(canonicalJson(lockProjection))
    .digest('hex');
  write(resolve(root, 'decision.json'), {
    schemaVersion: 'trainer-design-decision-receipt-v1',
    actor: 'H01',
    verdict: 'select',
    selectedDirectionId: 'direction-a',
    routeSpec: routeRef,
    context: intakeRef,
    lockContextSha256,
    publicationAuthority: false,
  });
  lock.decisionReceipt.sha256 = sha(resolve(root, 'decision.json'));
  lock.designLockSha256 = hashModel(lock, 'designLockSha256');
  write(resolve(root, 'lock.json'), lock);
  const lockRef = {ref: 'lock.json', sha256: sha(resolve(root, 'lock.json'))};
  const plan = model(
    {
      schemaVersion: 'trainer-artifact-plan-v1',
      planId: 'synthetic-plan',
      planSha256: '',
      routeSpec: routeRef,
      designLock: lockRef,
      artifacts: [
        {
          artifactId: 'compiler-smoke',
          kind: 'landing',
          outputRef: 'dist/index.html',
          acceptanceCriteria: ['Material bytes'],
        },
      ],
      maximumState: 'RENDERED_DRAFT',
      publicationAuthority: false,
      progressiveDisclosure: 'focused',
      tokenBudget: {maximum: 1000, estimated: 100, measured: 100},
    },
    'planSha256',
  );
  write(resolve(root, 'artifact-plan.json'), plan);
  write(resolve(root, 'assets.json'), {
    schemaVersion: 'trainer-asset-manifest-v1',
    manifestId: 'synthetic-assets',
    locale: 'es',
    assets: [
      {
        ...assetBinding,
        rights: 'authored',
        rightsReceipt: {ref: 'rights.json', sha256: sha(resolve(root, 'rights.json'))},
      },
    ],
    networkRequired: false,
    publicationAuthority: false,
  });
  for (const name of ['state.json', 'resume.md', 'handoff.json'])
    writeFileSync(resolve(root, 'continuity', name), `${name}\n`);
  const run = model(
    {
      schemaVersion: 'trainer-run-manifest-v1',
      runId: 'synthetic-run',
      manifestSha256: '',
      projectId: 'trainer-os',
      state: 'DESIGN_LOCKED',
      intakeRef: 'intake.json',
      intake: intakeRef,
      routeSpec: routeRef,
      designLock: lockRef,
      stateOutput: {
        ref: 'continuity/state.json',
        sha256: sha(resolve(root, 'continuity/state.json')),
      },
      resumeOutput: {
        ref: 'continuity/resume.md',
        sha256: sha(resolve(root, 'continuity/resume.md')),
      },
      handoffOutput: {
        ref: 'continuity/handoff.json',
        sha256: sha(resolve(root, 'continuity/handoff.json')),
      },
      stateRef: 'continuity/state.json',
      resumeRef: 'continuity/resume.md',
      handoffRef: 'continuity/handoff.json',
      invalidated: [],
      maximumState: 'RENDERED_DRAFT',
      effects: {network: false, connectors: false, publication: false},
      tokenBudget: {maximum: 1000, estimated: 100, measured: 100},
    },
    'manifestSha256',
  );
  write(resolve(root, 'run.json'), run);
  return {root, run, runPath: resolve(root, 'run.json')};
};
afterEach(() => {
  for (const path of temporary.splice(0)) rmSync(path, {recursive: true, force: true});
});

describe('trainer compiler core', () => {
  it('builds deterministically and verifies without writes', () => {
    const item = fixture();
    const first = executeTrainer('build', item.runPath);
    const bytes = readFileSync(resolve(item.root, 'dist/index.html'), 'utf8');
    compileTrainer(item.runPath, item.run as never);
    expect(readFileSync(resolve(item.root, 'dist/index.html'), 'utf8')).toBe(bytes);
    const before = tree(item.root);
    executeTrainer('verify', item.runPath);
    expect(tree(item.root)).toEqual(before);
    expect(first.state).toBe('COMPILED');
    const second = fixture();
    const replay = spawnSync(
      process.execPath,
      [
        '--import',
        'tsx',
        '02_proceso/workflows/trainer-os/runner.ts',
        '--mode',
        'build',
        '--run',
        second.runPath,
      ],
      {cwd: process.cwd(), encoding: 'utf8'},
    );
    expect(replay.status, replay.stderr).toBe(0);
    expect(readFileSync(resolve(second.root, 'dist/index.html'), 'utf8')).toBe(bytes);
    expect(readFileSync(resolve(second.root, 'outputs/build-manifest.json'), 'utf8')).toBe(
      readFileSync(resolve(item.root, 'outputs/build-manifest.json'), 'utf8'),
    );
  });

  it.each([
    'missing-lock',
    'stale-lock',
    'missing-asset',
    'private-ref',
    'rights-mismatch',
    'output-alias',
    'residual-stage',
    'forged-decision',
    'stale-decision',
  ] as const)('blocks %s input', (mode) => {
    const item = fixture();
    const run = structuredClone(item.run) as Record<string, unknown>;
    if (mode === 'missing-lock') delete run.designLock;
    if (mode === 'stale-lock')
      run.designLock = {...(run.designLock as Record<string, unknown>), sha256: 'a'.repeat(64)};
    if (mode === 'missing-asset') unlinkSync(resolve(item.root, 'source.txt'));
    if (mode === 'private-ref') {
      const assets = JSON.parse(readFileSync(resolve(item.root, 'assets.json'), 'utf8')) as {
        assets: Array<{ref: string}>;
      };
      const first = assets.assets[0];
      if (!first) throw new Error('synthetic asset missing');
      first.ref = 'private/source.txt';
      write(resolve(item.root, 'assets.json'), assets);
    }
    if (mode === 'rights-mismatch') {
      const receipt = JSON.parse(readFileSync(resolve(item.root, 'rights.json'), 'utf8')) as {
        rights: string;
      };
      receipt.rights = 'MIT';
      write(resolve(item.root, 'rights.json'), receipt);
      const assets = JSON.parse(readFileSync(resolve(item.root, 'assets.json'), 'utf8')) as {
        assets: Array<{rightsReceipt: {sha256: string}}>;
      };
      const first = assets.assets[0];
      if (!first) throw new Error('synthetic asset missing');
      first.rightsReceipt.sha256 = sha(resolve(item.root, 'rights.json'));
      write(resolve(item.root, 'assets.json'), assets);
    }
    if (mode === 'output-alias') {
      const plan = JSON.parse(
        readFileSync(resolve(item.root, 'artifact-plan.json'), 'utf8'),
      ) as Record<string, unknown> & {artifacts: Array<{outputRef: string}>};
      const first = plan.artifacts[0];
      if (!first) throw new Error('synthetic artifact missing');
      first.outputRef = 'dist/./index.html';
      Object.assign(plan, model(plan, 'planSha256'));
      write(resolve(item.root, 'artifact-plan.json'), plan);
    }
    if (mode === 'residual-stage') {
      mkdirSync(resolve(item.root, '.trainer-stage'));
      writeFileSync(resolve(item.root, '.trainer-stage/owned.txt'), 'preserve');
    }
    if (mode === 'forged-decision' || mode === 'stale-decision') {
      const decision = JSON.parse(
        readFileSync(resolve(item.root, 'decision.json'), 'utf8'),
      ) as Record<string, unknown>;
      if (mode === 'forged-decision') decision.actor = 'producer';
      else decision.selectedDirectionId = 'direction-b';
      write(resolve(item.root, 'decision.json'), decision);
      const lock = JSON.parse(readFileSync(resolve(item.root, 'lock.json'), 'utf8')) as Record<
        string,
        unknown
      > & {decisionReceipt: {sha256: string}};
      lock.decisionReceipt.sha256 = sha(resolve(item.root, 'decision.json'));
      Object.assign(lock, model(lock, 'designLockSha256'));
      write(resolve(item.root, 'lock.json'), lock);
      run.designLock = {ref: 'lock.json', sha256: sha(resolve(item.root, 'lock.json'))};
      const plan = JSON.parse(
        readFileSync(resolve(item.root, 'artifact-plan.json'), 'utf8'),
      ) as Record<string, unknown>;
      plan.designLock = run.designLock;
      Object.assign(plan, model(plan, 'planSha256'));
      write(resolve(item.root, 'artifact-plan.json'), plan);
      write(item.runPath, model(run, 'manifestSha256'));
    }
    if (mode === 'missing-lock' || mode === 'stale-lock')
      write(item.runPath, model(run, 'manifestSha256'));
    expect(() => executeTrainer('build', item.runPath)).toThrow();
  });

  it('rejects missing, mutated, residual and symlink outputs', () => {
    for (const mode of ['missing', 'mutated', 'residual', 'symlink'] as const) {
      const item = fixture();
      executeTrainer('build', item.runPath);
      const output = resolve(item.root, 'dist/index.html');
      if (mode === 'missing') unlinkSync(output);
      if (mode === 'mutated') writeFileSync(output, 'changed');
      if (mode === 'residual') writeFileSync(resolve(item.root, 'dist/residual.txt'), 'extra');
      if (mode === 'symlink') {
        unlinkSync(output);
        symlinkSync(resolve(item.root, 'source.txt'), output);
        expect(lstatSync(output).isSymbolicLink()).toBe(true);
      }
      expect(() => executeTrainer('verify', item.runPath)).toThrow();
    }
  });
});
