import {createHash} from 'node:crypto';
import {cp, mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';

import {parse, stringify} from 'yaml';

import {SOURCE_NOTEBOOK_ROOT} from './test-support.ts';

const COPY_ROOTS = [
  ['04_estado/registries', 'registries'],
  ['04_estado/receipts', 'receipts'],
  ['00_inbox', 'inbox'],
  [
    '03_artefactos/projects/agentic-workflow-adoption-v1/sources',
    '03_artefactos/projects/agentic-workflow-adoption-v1/sources',
  ],
] as const;

export type SourceGovernanceWorkspace = Readonly<{
  root: string;
  readBytes: (locator: string) => Promise<Buffer>;
  readText: (locator: string) => Promise<string>;
  readYaml: <Value = unknown>(locator: string) => Promise<Value>;
  writeText: (locator: string, value: string) => Promise<void>;
  writeYaml: (locator: string, value: unknown) => Promise<void>;
}>;

const sha256 = (value: Uint8Array | string): string =>
  createHash('sha256').update(value).digest('hex');

export const createSourceGovernanceWorkspace = async (): Promise<
  SourceGovernanceWorkspace & {dispose: () => Promise<void>}
> => {
  const root = await mkdtemp(path.join(tmpdir(), 'frames-source-governance-'));
  for (const [source, target] of COPY_ROOTS) {
    await cp(path.resolve(SOURCE_NOTEBOOK_ROOT, source), path.resolve(root, target), {
      recursive: true,
    });
  }
  const resolveLocator = (locator: string): string => path.resolve(root, locator);
  const readText = async (locator: string): Promise<string> =>
    readFile(resolveLocator(locator), 'utf8');
  return {
    root,
    readBytes: async (locator) => readFile(resolveLocator(locator)),
    readText,
    readYaml: async <Value>(locator: string): Promise<Value> =>
      parse(await readText(locator)) as Value,
    writeText: async (locator, value) => writeFile(resolveLocator(locator), value, 'utf8'),
    writeYaml: async (locator, value) =>
      writeFile(resolveLocator(locator), stringify(value, {lineWidth: 0}), 'utf8'),
    dispose: async () => rm(root, {recursive: true, force: true}),
  };
};

export const sha256Fixture = sha256;
