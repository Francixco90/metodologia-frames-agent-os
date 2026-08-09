import {createHash} from 'node:crypto';
import {
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, relative, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

import {afterEach, beforeAll, describe, expect, it} from 'vitest';

type Runner = (input: {
  argv: string[];
  stdin: string;
  cwd?: string;
}) => Promise<{exitCode: number; stdout: string}>;

let runFramesAssist: Runner;
const sandboxes: string[] = [];
const request = {
  request: 'Ayúdame a generar una pieza',
  intent_domain: 'content',
  audience: 'Líderes de producto',
  outcome: 'Comprender una decisión responsable',
  source: {type: 'brief', authority: 'verified', ref: 'source://synthetic'},
  output_directory_ref: 'work/private/experience/content',
  started_at: '2026-08-09T12:00:00.000Z',
  completed_at: '2026-08-09T12:00:01.000Z',
};

beforeAll(async () => {
  const module = (await import(
    pathToFileURL(resolve('05_verificacion/scripts/frames-assist.mjs')).href
  )) as {runFramesAssist: Runner};
  runFramesAssist = module.runFramesAssist;
});

afterEach(() => {
  for (const root of sandboxes.splice(0)) rmSync(root, {recursive: true, force: true});
});

const sandbox = () => {
  const root = mkdtempSync(resolve(tmpdir(), 'frames-assist-paths-'));
  sandboxes.push(root);
  const repository = join(root, 'repository');
  const outside = join(root, 'outside');
  mkdirSync(repository);
  mkdirSync(outside);
  return {root, repository, outside};
};

const snapshot = (root: string): string[] => {
  const entries: string[] = [];
  const visit = (directory: string) => {
    for (const name of readdirSync(directory).sort()) {
      const path = join(directory, name);
      const ref = relative(root, path);
      const stat = lstatSync(path);
      if (stat.isSymbolicLink()) entries.push(`link:${ref}:${readlinkSync(path)}`);
      else if (stat.isDirectory()) {
        entries.push(`dir:${ref}`);
        visit(path);
      } else {
        const digest = createHash('sha256').update(readFileSync(path)).digest('hex');
        entries.push(`file:${ref}:${digest}`);
      }
    }
  };
  visit(root);
  return entries;
};

const expectBlockedWithoutWrites = async (
  repository: string,
  invocation: {argv: string[]; stdin: string},
  code: string,
) => {
  const before = snapshot(repository);
  await expect(runFramesAssist({...invocation, cwd: repository})).rejects.toThrow(code);
  expect(snapshot(repository)).toEqual(before);
};

const expectWorkspaceBlockedWithoutWrites = async (
  repository: string,
  workspaceRoot: string,
  code: string,
) => {
  const before = snapshot(repository);
  const output = await runFramesAssist({
    argv: ['--apply'],
    stdin: JSON.stringify({...request, workspace_root: workspaceRoot}),
    cwd: repository,
  });
  const result = JSON.parse(output.stdout) as {
    local_execution: {status: string; materialized: boolean; coverage_gap: string};
  };
  expect(result.local_execution.status).toBe('BLOCKED');
  expect(result.local_execution.materialized).toBe(false);
  expect(result.local_execution.coverage_gap).toMatch(new RegExp(`^${code}(?:$| )`, 'u'));
  expect(snapshot(repository)).toEqual(before);
};

describe('frames:assist path containment', () => {
  it('rejects absolute, traversal and external --input paths without writes', async () => {
    const {repository, outside} = sandbox();
    const local = join(repository, 'request.json');
    const external = join(outside, 'request.json');
    writeFileSync(local, JSON.stringify(request));
    writeFileSync(external, JSON.stringify(request));

    for (const inputRef of [local, '../outside/request.json', external]) {
      await expectBlockedWithoutWrites(
        repository,
        {argv: ['--input', inputRef, '--apply'], stdin: ''},
        'FRAMES-ASSIST-PATH001',
      );
    }
  });

  it('rejects a final symlink and a symlink ancestor for --input', async () => {
    const {repository, outside} = sandbox();
    writeFileSync(join(repository, 'request.json'), JSON.stringify(request));
    writeFileSync(join(outside, 'request.json'), JSON.stringify(request));
    symlinkSync('request.json', join(repository, 'request-link.json'));
    symlinkSync(outside, join(repository, 'external'));

    for (const inputRef of ['request-link.json', 'external/request.json']) {
      await expectBlockedWithoutWrites(
        repository,
        {argv: ['--input', inputRef, '--apply'], stdin: ''},
        'FRAMES-ASSIST-PATH002',
      );
    }
  });

  it('rejects arbitrary, traversal and symlinked workspace roots without writes', async () => {
    const {repository, outside} = sandbox();
    const linkedWorkspace = join(repository, 'workspace-link');
    const linkedAncestor = join(repository, 'external');
    symlinkSync(repository, linkedWorkspace);
    symlinkSync(outside, linkedAncestor);

    for (const workspaceRoot of [outside, '../outside']) {
      await expectWorkspaceBlockedWithoutWrites(
        repository,
        workspaceRoot,
        'FRAMES-WORKSPACE-PATH001',
      );
    }
    for (const workspaceRoot of [linkedWorkspace, join(linkedAncestor, 'nested')]) {
      await expectWorkspaceBlockedWithoutWrites(
        repository,
        workspaceRoot,
        'FRAMES-WORKSPACE-PATH002',
      );
    }
  });

  it('accepts JSON from stdin with the authorized repository workspace', async () => {
    const {repository} = sandbox();
    const output = await runFramesAssist({
      argv: ['--apply'],
      stdin: JSON.stringify({...request, workspace_root: repository}),
      cwd: repository,
    });
    const result = JSON.parse(output.stdout) as {
      local_execution: {status: string; materialized: boolean; receiptRef: string};
    };
    expect(output.exitCode).toBe(0);
    expect(result.local_execution).toMatchObject({
      status: 'AWAITING_APPROVAL',
      materialized: true,
    });
    expect(readFileSync(join(repository, result.local_execution.receiptRef), 'utf8')).toContain(
      '"status": "PASS"',
    );
  });
});
