#!/usr/bin/env node
import {createHash} from 'node:crypto';
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';

import {stringify as stringifyYaml} from 'yaml';

import {
  createLocalActivationReceipt,
  discoverLocalExtensions,
  routeLocalExtensionIntent,
} from '../../02_proceso/workflows/local-extensions/index.ts';
import {assertContainedWorkspaceV1} from '../../02_proceso/workflows/core/safe-local-path-v1.ts';

const sha256 = (value: string): string => createHash('sha256').update(value).digest('hex');
const stableJson = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;

const prepareSafeDirectory = (root: string, segments: string[]): string => {
  const physicalRoot = realpathSync(root);
  let cursor = physicalRoot;
  for (const segment of segments) {
    cursor = path.join(cursor, segment);
    if (existsSync(cursor)) {
      const stat = lstatSync(cursor);
      if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error('FRAMES-EXTEND-PATH001');
    } else {
      mkdirSync(cursor);
    }
    const relative = path.relative(physicalRoot, realpathSync(cursor));
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new Error('FRAMES-EXTEND-PATH001');
    }
  }
  return cursor;
};

type CliInput = {
  request: string;
  extension_kind?: 'skill' | 'workflow' | 'bundle';
  scope?: 'PROJECT_LOCAL' | 'USER_LOCAL';
  desired_capability?: string;
  extension_id?: string;
};

export const runFramesExtend = ({
  argv,
  stdin,
  cwd = process.cwd(),
  env = process.env,
}: {
  argv: string[];
  stdin: string;
  cwd?: string;
  env?: Readonly<Record<string, string | undefined>>;
}): {exitCode: number; stdout: string} => {
  const apply = argv.includes('--apply');
  const approvalIndex = argv.indexOf('--approval-hash');
  const approvalHash = approvalIndex >= 0 ? argv[approvalIndex + 1] : undefined;
  const unsupported = argv.filter(
    (item, index) =>
      item !== '--' &&
      item !== '--apply' &&
      item !== '--approval-hash' &&
      index !== approvalIndex + 1,
  );
  if (unsupported.length > 0) throw new Error(`FRAMES-EXTEND-ARG001:${unsupported.join(',')}`);
  const input = JSON.parse(stdin) as CliInput;
  const route = routeLocalExtensionIntent(input);
  if (!apply) return {exitCode: 0, stdout: stableJson({...route, mode: 'DRY_RUN', writes: []})};
  if (route.state !== 'READY_FOR_BRIEF_APPROVAL') throw new Error('FRAMES-EXTEND-INPUT001');
  if (approvalHash !== route.request_hash) throw new Error('FRAMES-EXTEND-GATE001');
  if (!input.extension_id?.match(/^local\.[a-z0-9][a-z0-9-]*\.[a-z0-9][a-z0-9-]*$/u)) {
    throw new Error('FRAMES-EXTEND-ID001');
  }
  const repository = assertContainedWorkspaceV1(cwd, cwd);
  const packageManifest = JSON.parse(
    readFileSync(path.join(repository, 'package.json'), 'utf8'),
  ) as {
    name?: string;
  };
  if (packageManifest.name !== 'metodologia-frames-agent-os') {
    throw new Error('FRAMES-EXTEND-WORKSPACE001');
  }
  const userRoot = env.FRAMES_USER_EXTENSIONS_ROOT;
  let selectedRoot: string;
  if (input.scope === 'USER_LOCAL') {
    if (!userRoot) throw new Error('FRAMES-EXTEND-USER-ROOT001');
    if (!existsSync(userRoot)) throw new Error('FRAMES-EXTEND-USER-ROOT002');
    const stat = lstatSync(userRoot);
    if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error('FRAMES-EXTEND-PATH001');
    selectedRoot = realpathSync(userRoot);
  } else {
    selectedRoot = prepareSafeDirectory(repository, ['04_estado', 'local', 'extensions']);
  }
  const segments = input.extension_id.split('.').slice(1);
  const packageRoot = path.join(selectedRoot, ...segments);
  if (existsSync(packageRoot)) throw new Error('FRAMES-EXTEND-COLLISION001');
  const documentation = `# ${input.extension_id}\n\n${route.desired_capability}\n\nEstado local; no sustituye capacidades canónicas.\n`;
  const sequence = `# Secuencia\n\n1. Recibir intención.\n2. Validar inputs.\n3. Producir dentro del write set.\n4. Verificar y detener.\n`;
  const positive = stableJson({request: input.request, expected: 'VALID'});
  const adversarial = stableJson({request: '../escape', expected: 'BLOCKED'});
  const files = new Map([
    ['documentation.md', documentation],
    ['sequence.md', sequence],
    ['fixtures/positive.json', positive],
    ['fixtures/adversarial.json', adversarial],
  ]);
  const manifest = {
    schema_version: 'frames-local-extension-v1',
    extension_id: input.extension_id,
    version: '0.1.0',
    scope: input.scope,
    kind: input.extension_kind,
    lifecycle: 'READY',
    enabled: true,
    override_policy: 'never',
    description: route.desired_capability,
    triggers: [input.request.trim().toLowerCase()],
    capabilities: [
      route.desired_capability
        .toLowerCase()
        .replace(/[^a-z0-9]+/gu, '-')
        .replace(/^-|-$/gu, ''),
    ],
    inputs: [],
    outputs: [],
    dependencies: [],
    effect_class: 'read_only',
    tools: [],
    read_set: [],
    write_set: [],
    routing: {priority: 'after_canonical', complements: []},
    execution: {mode: 'declarative'},
    content: [...files].map(([ref, content]) => ({ref, sha256: sha256(content)})),
    documentation: ['documentation.md', 'sequence.md'],
    fixtures: {positive: 'fixtures/positive.json', adversarial: 'fixtures/adversarial.json'},
    budgets: {max_files: 8, max_context_files: 6},
  };
  try {
    for (const [ref, content] of files) {
      const target = path.join(packageRoot, ref);
      mkdirSync(path.dirname(target), {recursive: true});
      writeFileSync(target, content, {encoding: 'utf8', flag: 'wx'});
    }
    const manifestPath = path.join(packageRoot, 'extension.yml');
    writeFileSync(manifestPath, stringifyYaml(manifest), {encoding: 'utf8', flag: 'wx'});
    const discovery = discoverLocalExtensions({
      repository_root: repository,
      ...(userRoot ? {user_root: userRoot} : {}),
    });
    const record = discovery.records.find((item) => item.extension_id === input.extension_id);
    if (!record || record.state !== 'ACTIVE_LOCAL') throw new Error('FRAMES-EXTEND-ACTIVATION001');
    const receipt = createLocalActivationReceipt(record);
    writeFileSync(path.join(packageRoot, 'activation-receipt.json'), stableJson(receipt), {
      encoding: 'utf8',
      flag: 'wx',
    });
    return {exitCode: 0, stdout: stableJson({route, record, receipt})};
  } catch (error) {
    rmSync(packageRoot, {recursive: true, force: true});
    throw error;
  }
};

if (process.argv[1]?.endsWith('frames-extend.ts')) {
  try {
    const result = runFramesExtend({argv: process.argv.slice(2), stdin: readFileSync(0, 'utf8')});
    process.stdout.write(result.stdout);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
