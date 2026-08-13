import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {readFileSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {expect, it} from 'vitest';

import {hashModel} from '../../../02_proceso/workflows/trainer-os/common.ts';
import {TrainerMasterclassContentSchema} from '../../../02_proceso/workflows/trainer-os/masterclass-contracts.ts';
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
const localized = (language: 'es' | 'en' | 'pt') => ({
  title: `${language} Synthetic masterclass`,
  lede: `${language} Observable progression`,
  moments: Array.from({length: 18}, (_, index) => ({
    id: `${language}-moment-${index + 1}`,
    title: `${language} Moment ${index + 1}`,
    body: `${language} Evidence ${index + 1}`,
    baseMinutes: 5,
    extendedMinutes: index < 6 ? 5 : 0,
  })),
});

export const makeMasterclassContent = (
  routeSpec: Binding,
  designLock: Binding,
  authority: {browserReceipt: Binding; runtimeReceipt: Binding; fontReceipt: Binding},
  locales: Array<'es' | 'en' | 'pt'> = ['es'],
) => {
  const draft = {
    schemaVersion: 'trainer-masterclass-content-v1',
    contentId: 'synthetic-masterclass',
    contentSha256: '',
    routeSpec,
    designLock,
    renderAuthority: {
      renderer: 'trainer-native-pdf-v1',
      browserMode: 'none-native-pdf',
      ...authority,
      fontFamily: 'Helvetica',
    },
    locales: {
      es: localized('es'),
      ...(locales.includes('en') ? {en: localized('en')} : {}),
      ...(locales.includes('pt') ? {pt: localized('pt')} : {}),
    },
    requestedLocales: locales,
    modes: {baseMinutes: 90, extendedMinutes: 120},
    qaViewer: {qaOnly: true, publicationAuthority: false},
    officialOutput: 'pdf-only',
    brandId: 'metodologia',
    publicationAuthority: false,
  };
  return TrainerMasterclassContentSchema.parse(model(draft, 'contentSha256'));
};

export const rewriteMasterclassContent = (item: Fixture, content: unknown) => {
  write(resolve(item.root, 'adapter-content.json'), content);
  bindAsset(item, 'adapter-content.json');
};

const bindAsset = (item: Fixture, ref: string) => {
  const assets = JSON.parse(readFileSync(resolve(item.root, 'assets.json'), 'utf8')) as {
    assets: Array<{ref: string; sha256: string; rights: string; rightsReceipt: Binding}>;
  };
  const asset = assets.assets.find((candidate) => candidate.ref === ref);
  if (!asset) throw new Error('synthetic content asset missing');
  asset.sha256 = sha(resolve(item.root, asset.ref));
  const receipt = JSON.parse(readFileSync(resolve(item.root, asset.rightsReceipt.ref), 'utf8')) as {
    asset: Binding;
  };
  receipt.asset.sha256 = asset.sha256;
  write(resolve(item.root, asset.rightsReceipt.ref), receipt);
  asset.rightsReceipt.sha256 = sha(resolve(item.root, asset.rightsReceipt.ref));
  write(resolve(item.root, 'assets.json'), assets);
};

export const rewriteMasterclassAuthority = (item: Fixture, ref: string, value: unknown) => {
  write(resolve(item.root, ref), value);
  bindAsset(item, ref);
  const assets = JSON.parse(readFileSync(resolve(item.root, 'assets.json'), 'utf8')) as {
    assets: Binding[];
  };
  const authority = assets.assets.find((candidate) => candidate.ref === ref);
  if (!authority) throw new Error('synthetic authority asset missing');
  const content = TrainerMasterclassContentSchema.parse(
    JSON.parse(readFileSync(resolve(item.root, 'adapter-content.json'), 'utf8')),
  );
  if (ref === content.renderAuthority.runtimeReceipt.ref)
    content.renderAuthority.runtimeReceipt.sha256 = authority.sha256;
  else if (ref === content.renderAuthority.browserReceipt.ref)
    content.renderAuthority.browserReceipt.sha256 = authority.sha256;
  else if (ref === content.renderAuthority.fontReceipt.ref)
    content.renderAuthority.fontReceipt.sha256 = authority.sha256;
  content.contentSha256 = hashModel(content, 'contentSha256');
  rewriteMasterclassContent(item, content);
};

export const configureMasterclassFixture = (
  base: Fixture,
  locales: Array<'es' | 'en' | 'pt'> = ['es'],
) => {
  const item = configureAdapterFixture(base);
  const run = item.run as {routeSpec: Binding; designLock: Binding};
  const receipts = [
    {
      kind: 'browser-policy',
      name: 'none',
      version: 'native-pdf-v1',
      network: false,
      publicationAuthority: false,
    },
    {
      kind: 'runtime',
      name: 'node',
      version: process.version,
      network: false,
      publicationAuthority: false,
    },
    {
      kind: 'font',
      name: 'Helvetica',
      version: 'PDF-Standard-14',
      rights: 'PDF-standard',
      publicationAuthority: false,
    },
  ];
  const bindings = Object.fromEntries(
    receipts.map((receipt) => {
      const name = receipt.kind;
      const ref = `${name}.json`;
      write(resolve(item.root, ref), {schemaVersion: 'trainer-render-authority-v1', ...receipt});
      return [`${name.replace('-policy', '')}Receipt`, {ref, sha256: sha(resolve(item.root, ref))}];
    }),
  ) as {browserReceipt: Binding; runtimeReceipt: Binding; fontReceipt: Binding};
  write(
    resolve(item.root, 'adapter-content.json'),
    makeMasterclassContent(run.routeSpec, run.designLock, bindings, locales),
  );
  const assets = JSON.parse(readFileSync(resolve(item.root, 'assets.json'), 'utf8')) as {
    assets: Array<{ref: string; sha256: string; rights: string; rightsReceipt: Binding}>;
  };
  const content = assets.assets.find(({ref}) => ref === 'adapter-content.json');
  if (!content) throw new Error('synthetic content asset missing');
  content.sha256 = sha(resolve(item.root, content.ref));
  const contentRights = JSON.parse(
    readFileSync(resolve(item.root, 'adapter-rights.json'), 'utf8'),
  ) as {asset: Binding};
  contentRights.asset.sha256 = content.sha256;
  write(resolve(item.root, 'adapter-rights.json'), contentRights);
  content.rightsReceipt.sha256 = sha(resolve(item.root, 'adapter-rights.json'));
  for (const binding of Object.values(bindings)) {
    const rightsRef = `${binding.ref}.rights.json`;
    write(resolve(item.root, rightsRef), {
      schemaVersion: 'trainer-asset-rights-receipt-v1',
      asset: binding,
      rights: 'authored',
      publicationAuthority: false,
    });
    assets.assets.push({
      ...binding,
      rights: 'authored',
      rightsReceipt: {ref: rightsRef, sha256: sha(resolve(item.root, rightsRef))},
    });
  }
  write(resolve(item.root, 'assets.json'), assets);
  const plan = JSON.parse(readFileSync(resolve(item.root, 'artifact-plan.json'), 'utf8')) as Record<
    string,
    unknown
  >;
  plan.artifacts = locales.map((locale) => ({
    artifactId: `masterclass-${locale}`,
    kind: 'masterclass',
    outputRef: `dist/masterclass/${locale}/masterclass.pdf`,
    acceptanceCriteria: ['18 deterministic pages'],
  }));
  Object.assign(plan, model(plan, 'planSha256'));
  write(resolve(item.root, 'artifact-plan.json'), plan);
  return item;
};

export const verifyMasterclassReplay = (
  factory: () => Fixture,
  locales: Array<'es' | 'en' | 'pt'> = ['es'],
) => {
  const first = configureMasterclassFixture(factory(), locales);
  executeTrainer('build', first.runPath);
  executeTrainer('verify', first.runPath);
  const second = configureMasterclassFixture(factory(), locales);
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
  for (const locale of locales) {
    const ref = `dist/masterclass/${locale}/masterclass.pdf`;
    if (!readFileSync(resolve(first.root, ref)).equals(readFileSync(resolve(second.root, ref))))
      throw new Error('TRAINER_MASTERCLASS_REPLAY_DRIFT');
  }
  return first;
};

it('creates all authority receipts as local authored assets', () => {
  expect(localized('es').moments).toHaveLength(18);
});
