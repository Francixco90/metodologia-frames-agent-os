import {readFile, readdir} from 'node:fs/promises';
import path from 'node:path';

import {parse} from 'yaml';

import {PinnedRepositorySourceEntryV2Schema} from '../../../../core/contracts/source-governance-v2.ts';
import {ImportReceiptSchema} from './receipt-schemas.ts';
import {SourceLifecycleContractSchema} from './lifecycle-contract.ts';
import {SourceRegistrySchema} from './registry-schema.ts';
import {readYamlFile} from './helpers.ts';

export const SOURCE_NOTEBOOK_ROOT = process.cwd();
const RECEIPT_DIRECTORY = 'receipts/imports';

export const EXPECTED_SOURCE_IDS = [
  'SRC-LEGACY-STITCH-REMOTION-001',
  'SRC-MAO-BRAND-BUNDLE-001',
  'SRC-MAO-BRAND-VOICE-001',
  'SRC-MAO-PUBLIC-SEMANTICS-001',
  'SRC-METH-IMAGE-001',
  'SRC-METH-JVC-SKOOL-001',
  'SRC-METH-JVC-YT-001',
  'SRC-PROMPT-MAESTRO-V6',
  'SRC-PROPOSAL-MEASURE-E0D6BA4',
  'SRC-REMOTION-DOCS-001',
  'SRC-REMOTION-SKILLS-001',
  'SRC-SYNTH-VS001',
  'SRC-TECHNICAL-DEFENSE-78FD383',
] as const;

export const EXPECTED_REFERENCE_STATES = new Map([
  ['SRC-LEGACY-STITCH-REMOTION-001', 'quarantined'],
  ['SRC-METH-IMAGE-001', 'candidate'],
  ['SRC-METH-JVC-SKOOL-001', 'candidate'],
  ['SRC-METH-JVC-YT-001', 'candidate'],
  ['SRC-REMOTION-DOCS-001', 'candidate'],
  ['SRC-REMOTION-SKILLS-001', 'candidate'],
] as const);

export const PROMPT_HASHES = {
  raw: '19803669c1ae8dacf62af64936060235cb7d15b870c7f0abc23962159be5bde2',
  sourceNormalized: '00de50b02d9cf393a5376781938fd0ba01c3bd8b7460e4b379ef9c31b148e505',
  historicalProjection: '02153ec2c50808ae1b91c8dff0bf0f11840ac8237948580b5e0ee6d36cbdf48f',
  projection: 'b75c9baa1afc8a893743e96adfddf09a2580cd9f527abdf91d108ee19d6f50f5',
} as const;

export const PROMPT_HISTORICAL_RECEIPTS = [
  ['001', 'candidate', '52493223df5fbe96a95ab75e195ce632bad7319e55fb3dfc7dce44f606c47d84'],
  ['002', 'quarantined', '9851ddb94f379ae6000be31fea0e955e9b50e2e359e0ab2a462e2fd6cbf58660'],
  ['003', 'evaluated', 'c30d699c9ef29dcdee0887fe4d28ccc007a1b88eaaa6e9a416fd3923f3d7c89a'],
  ['004', 'active', 'e27ef1dff0277e0c08a0fe9ce524010f0156218b8ca9bfa0c404931c950a4cbd'],
].map(([order, state, sha256]) => ({
  receipt_id: `RCP-IMP-SRC-PROMPT-MAESTRO-V6-${order}`,
  path: `receipts/imports/20260719-SRC-PROMPT-MAESTRO-V6-${state}.yml`,
  sha256,
}));

export const EXPECTED_PINNED_SOURCES = new Map([
  [
    'SRC-PROPOSAL-MEASURE-E0D6BA4',
    {
      commit: 'e0d6ba4576b23c83a6b22dbad53e23a8795b26d0',
      tree: '457920d64756549eb4862b2653e2bf293d332ab9',
    },
  ],
  [
    'SRC-TECHNICAL-DEFENSE-78FD383',
    {
      commit: '78fd3834acd38cf4b6ace7f7f1ed9c06893300f3',
      tree: '467691b625de2590171290d2dff779a791749f8c',
    },
  ],
] as const);

export const loadPinnedEvidence = async (
  entry: ReturnType<typeof PinnedRepositorySourceEntryV2Schema.parse>,
) => {
  const paths = new Set([
    entry.repository_lock.repository_descriptor.locator,
    entry.repository_lock.selected_paths_manifest.locator,
    entry.repository_lock.selected_paths_projection.locator,
    entry.repository_lock.rights_authorization_projection.locator,
    ...entry.receipt_bindings.map(({path: receiptPath}) => receiptPath),
  ]);
  return Promise.all(
    [...paths].map(async (relativePath) => ({
      path: relativePath,
      bytes: await readFile(path.resolve(SOURCE_NOTEBOOK_ROOT, relativePath)),
    })),
  );
};

export const loadImportReceipts = async () => {
  const names = (
    await readdir(path.resolve(SOURCE_NOTEBOOK_ROOT, RECEIPT_DIRECTORY), {
      recursive: true,
    })
  )
    .filter((name) => name.endsWith('.yml'))
    .sort();
  return Promise.all(
    names.map(async (name) => {
      const relativePath = `${RECEIPT_DIRECTORY}/${name.replaceAll(path.sep, '/')}`;
      const raw = await readFile(path.resolve(SOURCE_NOTEBOOK_ROOT, relativePath), 'utf8');
      return {path: relativePath, receipt: ImportReceiptSchema.parse(parse(raw) as unknown)};
    }),
  );
};

export const loadSourceSystem = async () => {
  const [lifecycle, registry, receipts] = await Promise.all([
    readYamlFile('registries/sources/lifecycle-contract.yml', SourceLifecycleContractSchema),
    readYamlFile('registries/sources/source-registry.yml', SourceRegistrySchema),
    loadImportReceipts(),
  ]);
  return {lifecycle, registry, receipts};
};

export const loadPinnedAuditFixture = async (sourceId = 'SRC-PROPOSAL-MEASURE-E0D6BA4') => {
  const registry = await readYamlFile(
    'registries/sources/source-registry.yml',
    SourceRegistrySchema,
  );
  const entry = PinnedRepositorySourceEntryV2Schema.parse(
    registry.entries.find(({source_id}) => source_id === sourceId),
  );
  return {entry, evidence: await loadPinnedEvidence(entry)};
};
