import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {expect, it} from 'vitest';

import {renderPlannedArtifact} from '../../../02_proceso/workflows/trainer-os/adapter-renderers.ts';
import {
  HashRefSchema,
  canonicalJson,
  hashModel,
} from '../../../02_proceso/workflows/trainer-os/common.ts';
import {EffectiveTrainerCompilerAuthorityFiles} from '../../../02_proceso/workflows/trainer-os/compiler-authority.ts';
import {executeTrainer} from '../../../02_proceso/workflows/trainer-os/runner.ts';

type Fixture = {root: string; run: unknown; runPath: string};
const sha = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');
const write = (path: string, value: unknown) =>
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
const model = (value: Record<string, unknown>, field: string) => ({
  ...value,
  [field]: hashModel(value, field),
});

export const configureAdapterFixture = (item: Fixture) => {
  const run = item.run as Record<string, unknown> & {
    intake: {ref: string; sha256: string};
    routeSpec: {ref: string; sha256: string};
    designLock: {ref: string; sha256: string};
  };
  const intake = JSON.parse(readFileSync(resolve(item.root, run.intake.ref), 'utf8')) as {
    sourceRefs: Array<{ref: string; sha256: string}>;
  };
  const source = intake.sourceRefs[0];
  if (!source) throw new Error('synthetic intake source missing');
  writeFileSync(
    resolve(item.root, 'tokens.json'),
    readFileSync(resolve('03_artefactos/projects/trainer-os/design/tokens.authority.json')),
  );
  const lock = JSON.parse(readFileSync(resolve(item.root, 'lock.json'), 'utf8')) as Record<
    string,
    unknown
  > & {tokens: {sha256: string}; decisionReceipt: {sha256: string}};
  lock.tokens.sha256 = sha(resolve(item.root, 'tokens.json'));
  const projection = structuredClone(lock) as Record<string, unknown>;
  delete projection.designLockSha256;
  delete projection.decisionReceipt;
  const decision = JSON.parse(readFileSync(resolve(item.root, 'decision.json'), 'utf8')) as Record<
    string,
    unknown
  >;
  decision.lockContextSha256 = createHash('sha256').update(canonicalJson(projection)).digest('hex');
  write(resolve(item.root, 'decision.json'), decision);
  lock.decisionReceipt.sha256 = sha(resolve(item.root, 'decision.json'));
  lock.designLockSha256 = hashModel(lock, 'designLockSha256');
  write(resolve(item.root, 'lock.json'), lock);
  run.designLock = {ref: 'lock.json', sha256: sha(resolve(item.root, 'lock.json'))};
  const locale = {
    landing: {
      kind: 'landing',
      title: 'Synthetic route',
      lede: 'Synthetic evidence',
      evidenceIds: ['source-one'],
      cta: {label: 'Open route', href: '#section-1'},
      sections: Array.from({length: 8}, (_, index) => ({
        id: `section-${index + 1}`,
        title: `Synthetic capacity ${index + 1}`,
        body: `Synthetic evidence ${index + 1}`,
        evidenceIds: ['source-one'],
      })),
    },
    workbook: {
      kind: 'workbook',
      hero: {
        title: 'Synthetic practice',
        lede: 'Synthetic guided work',
        evidenceIds: ['source-one'],
        cta: {label: 'Start practice', href: '#route-1'},
      },
      preparation: [
        {id: 'prepare', title: 'Inputs', body: 'Synthetic inputs', evidenceIds: ['source-one']},
      ],
      routes: Array.from({length: 3}, (_, index) => ({
        id: `route-${index + 1}`,
        title: `Route ${index + 1}`,
        purpose: `Transfer ${index + 1}`,
        evidenceIds: ['source-one'],
        steps: [
          {
            id: `step-${index + 1}`,
            prompt: `Produce evidence ${index + 1}`,
            evidenceIds: ['source-one'],
          },
        ],
      })),
    },
  };
  write(resolve(item.root, 'authority.json'), {
    schemaVersion: 'trainer-evidence-authority-receipt-v1',
    evidenceId: 'source-one',
    source,
    authority: 'authored',
    actor: 'source-registry',
    verdict: 'approved',
    publicationAuthority: false,
  });
  const authorityReceipt = {
    ref: 'authority.json',
    sha256: sha(resolve(item.root, 'authority.json')),
  };
  const content = model(
    {
      schemaVersion: 'trainer-adapter-content-v1',
      contentId: 'synthetic-content',
      contentSha256: '',
      routeSpec: run.routeSpec,
      designLock: run.designLock,
      evidence: [{evidenceId: 'source-one', source, authority: 'authored', authorityReceipt}],
      locales: {es: locale},
      requestedLocales: ['es'],
      brandId: 'metodologia',
      publicationAuthority: false,
    },
    'contentSha256',
  );
  write(resolve(item.root, 'adapter-content.json'), content);
  const contentBinding = {
    ref: 'adapter-content.json',
    sha256: sha(resolve(item.root, 'adapter-content.json')),
  };
  write(resolve(item.root, 'adapter-rights.json'), {
    schemaVersion: 'trainer-asset-rights-receipt-v1',
    asset: contentBinding,
    rights: 'authored',
    publicationAuthority: false,
  });
  const assets = JSON.parse(readFileSync(resolve(item.root, 'assets.json'), 'utf8')) as {
    assets: unknown[];
  };
  assets.assets = [
    ...assets.assets.filter((asset) => (asset as {ref?: string}).ref !== 'adapter-content.json'),
    {
      ...contentBinding,
      rights: 'authored',
      rightsReceipt: {
        ref: 'adapter-rights.json',
        sha256: sha(resolve(item.root, 'adapter-rights.json')),
      },
    },
  ];
  write(resolve(item.root, 'assets.json'), assets);
  const plan = JSON.parse(readFileSync(resolve(item.root, 'artifact-plan.json'), 'utf8')) as Record<
    string,
    unknown
  >;
  plan.designLock = run.designLock;
  plan.artifacts = ['landing', 'workbook'].map((kind) => ({
    artifactId: `${kind}-es`,
    kind,
    outputRef: `dist/${kind}/es/index.html`,
    acceptanceCriteria: ['Synthetic bytes'],
  }));
  Object.assign(plan, model(plan, 'planSha256'));
  write(resolve(item.root, 'artifact-plan.json'), plan);
  write(item.runPath, model(run, 'manifestSha256'));
  return item;
};

export const verifyAdapterReplay = (factory: () => Fixture) => {
  const first = configureAdapterFixture(factory());
  executeTrainer('build', first.runPath);
  executeTrainer('verify', first.runPath);
  const second = configureAdapterFixture(factory());
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
  if (replay.status !== 0) throw new Error(replay.stderr);
  for (const ref of ['dist/landing/es/index.html', 'dist/workbook/es/index.html'])
    if (
      readFileSync(resolve(second.root, ref), 'utf8') !==
      readFileSync(resolve(first.root, ref), 'utf8')
    )
      throw new Error(`TRAINER_ADAPTER_REPLAY_DRIFT:${ref}`);
};

it('fails closed when the base fixture is incomplete', () => {
  const root = mkdtempSync(resolve(tmpdir(), 'trainer-adapter-helper-'));
  try {
    expect(() =>
      configureAdapterFixture({root, run: {}, runPath: resolve(root, 'run.json')}),
    ).toThrow();
  } finally {
    rmSync(root, {recursive: true, force: true});
  }
});

it.each(['./adapter-content.json', 'x//y.json', 'x/./y.json'])(
  'rejects noncanonical HashRef alias %s',
  (ref) => expect(HashRefSchema.safeParse({ref, sha256: 'a'.repeat(64)}).success).toBe(false),
);

it('binds intake authority and blocks noncanonical extended adapter paths', () => {
  expect(EffectiveTrainerCompilerAuthorityFiles).toContain('trainer-intake-v1.schema.ts');
  for (const kind of ['playbook', 'prompt-library'] as const)
    expect(() =>
      renderPlannedArtifact(
        {
          artifactId: `${kind}-es`,
          kind,
          outputRef: `dist/${kind}-es.html`,
          acceptanceCriteria: ['Synthetic bytes'],
        },
        undefined,
        {} as never,
        {} as never,
        {} as never,
        undefined,
      ),
    ).toThrow('CANONICAL_PATH_REQUIRED');
  expect(() =>
    renderPlannedArtifact(
      {
        artifactId: 'masterclass-es',
        kind: 'masterclass',
        outputRef: 'dist/masterclass/es/not-official.pdf',
        acceptanceCriteria: ['Synthetic bytes'],
      },
      undefined,
      {} as never,
      {} as never,
      {} as never,
      undefined,
    ),
  ).toThrow('CANONICAL_PATH_REQUIRED');
});
