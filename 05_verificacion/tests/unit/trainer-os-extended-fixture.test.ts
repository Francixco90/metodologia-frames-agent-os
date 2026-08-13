import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {readFileSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {expect, it} from 'vitest';

import {TrainerExtendedContentSchema} from '../../../02_proceso/workflows/trainer-os/adapter-extended-contracts.ts';
import {hashModel} from '../../../02_proceso/workflows/trainer-os/common.ts';
import {executeTrainer} from '../../../02_proceso/workflows/trainer-os/runner.ts';
import {configureAdapterFixture} from './trainer-os-adapter-fixture.test.ts';

type Binding = {ref: string; sha256: string};
type Fixture = {root: string; run: unknown; runPath: string};
const sha = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');
const write = (path: string, value: unknown) =>
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
const model = (value: Record<string, unknown>, field: string) => ({
  ...value,
  [field]: hashModel(value, field),
});
const localized = (language: 'es' | 'en' | 'pt') => {
  const chapters = Array.from({length: 12}, (_, index) => ({
    id: `${language}-chapter-${index + 1}`,
    title: `${language} Chapter ${index + 1}`,
    purpose: `${language} Purpose ${index + 1}`,
    steps: [
      {
        id: `${language}-step-${index + 1}`,
        title: `${language} Step ${index + 1}`,
        instruction: `${language} Produce evidence ${index + 1}`,
      },
    ],
  }));
  const optionalChapters = Array.from({length: 2}, (_, index) => ({
    id: `${language}-optional-${index + 1}`,
    title: `${language} Optional ${index + 1}`,
    purpose: `${language} Optional purpose ${index + 1}`,
    steps: [
      {
        id: `${language}-optional-step-${index + 1}`,
        title: `${language} Optional step ${index + 1}`,
        instruction: `${language} Extend evidence ${index + 1}`,
      },
    ],
  }));
  const steps = [...chapters, ...optionalChapters].flatMap(({steps: items}) => items);
  return {
    playbook: {
      kind: 'playbook',
      hero: {
        title: `${language} Playbook`,
        lede: `${language} Reusable process`,
        cta: {label: language === 'es' ? 'Abrir guía' : 'Open guide', href: '/guide'},
      },
      essentialChapters: chapters,
      optionalChapters,
    },
    promptLibrary: {
      kind: 'prompt-library',
      hero: {
        title: `${language} Prompts`,
        lede: `${language} Four levels`,
        cta: {label: language === 'es' ? 'Usar prompts' : 'Use prompts', href: '/prompts'},
      },
      prompts: steps.map(({id}, index) => ({
        id: `${language}-prompt-${index + 1}`,
        stepId: id,
        title: `${language} Prompt ${index + 1}`,
        levels: [1, 2, 3, 4].map((level) => ({
          level,
          body: `${language} Level ${level} for ${id}`,
        })),
      })),
    },
  };
};

export const makeExtendedContent = (
  routeSpec: Binding,
  designLock: Binding,
  locales: Array<'es' | 'en' | 'pt'> = ['es'],
) => {
  const draft = {
    schemaVersion: 'trainer-extended-content-v1',
    contentId: 'synthetic-extended',
    contentSha256: '',
    routeSpec,
    designLock,
    locales: {
      es: localized('es'),
      ...(locales.includes('en') ? {en: localized('en')} : {}),
      ...(locales.includes('pt') ? {pt: localized('pt')} : {}),
    },
    requestedLocales: locales,
    brandId: 'metodologia',
    publicationAuthority: false,
  };
  return model(draft, 'contentSha256');
};

export const configureExtendedFixture = (base: Fixture) => {
  const item = configureAdapterFixture(base);
  const run = item.run as {routeSpec: Binding; designLock: Binding};
  write(
    resolve(item.root, 'adapter-content.json'),
    makeExtendedContent(run.routeSpec, run.designLock),
  );
  const contentHash = sha(resolve(item.root, 'adapter-content.json'));
  const rights = JSON.parse(readFileSync(resolve(item.root, 'adapter-rights.json'), 'utf8')) as {
    asset: Binding;
  };
  rights.asset.sha256 = contentHash;
  write(resolve(item.root, 'adapter-rights.json'), rights);
  const assets = JSON.parse(readFileSync(resolve(item.root, 'assets.json'), 'utf8')) as {
    assets: Array<{ref: string; sha256: string; rightsReceipt: Binding}>;
  };
  const contentAsset = assets.assets.find(({ref}) => ref === 'adapter-content.json');
  if (!contentAsset) throw new Error('synthetic adapter content asset missing');
  contentAsset.sha256 = contentHash;
  contentAsset.rightsReceipt.sha256 = sha(resolve(item.root, 'adapter-rights.json'));
  write(resolve(item.root, 'assets.json'), assets);
  const plan = JSON.parse(readFileSync(resolve(item.root, 'artifact-plan.json'), 'utf8')) as Record<
    string,
    unknown
  >;
  plan.artifacts = [
    {
      artifactId: 'playbook-es',
      kind: 'playbook',
      outputRef: 'dist/playbook/es/index.html',
      acceptanceCriteria: ['Synthetic bytes'],
      materializedContentIds: ['es-optional-1', 'es-optional-2'],
    },
    {
      artifactId: 'prompt-library-es',
      kind: 'prompt-library',
      outputRef: 'dist/prompt-library/es/index.html',
      acceptanceCriteria: ['Synthetic bytes'],
    },
  ];
  Object.assign(plan, model(plan, 'planSha256'));
  write(resolve(item.root, 'artifact-plan.json'), plan);
  return item;
};

export const verifyExtendedReplay = (factory: () => Fixture) => {
  const first = configureExtendedFixture(factory());
  executeTrainer('build', first.runPath);
  executeTrainer('verify', first.runPath);
  const second = configureExtendedFixture(factory());
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
  for (const ref of ['dist/playbook/es/index.html', 'dist/prompt-library/es/index.html'])
    if (
      readFileSync(resolve(first.root, ref), 'utf8') !==
      readFileSync(resolve(second.root, ref), 'utf8')
    )
      throw new Error(`TRAINER_EXTENDED_REPLAY_DRIFT:${ref}`);
};

it('materializes a strict synthetic extended content model', () => {
  const binding = {ref: 'synthetic.json', sha256: 'a'.repeat(64)};
  expect(
    TrainerExtendedContentSchema.parse(makeExtendedContent(binding, binding)).requestedLocales,
  ).toEqual(['es']);
});
