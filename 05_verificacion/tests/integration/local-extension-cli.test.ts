import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

import {afterEach, describe, expect, it} from 'vitest';

import {runFramesExtend} from 'scripts/frames-extend.ts';

const roots: string[] = [];
const workspace = (marked = false): string => {
  const root = mkdtempSync(join(tmpdir(), 'frames-extend-cli-'));
  roots.push(root);
  if (marked) {
    const manifest = {name: 'metodologia-frames-agent-os', private: true};
    writeFileSync(join(root, 'package.json'), `${JSON.stringify(manifest)}\n`);
  }
  return root;
};
const input = {
  request: 'Crea una skill local para revisar presentaciones en este proyecto.',
  extension_kind: 'skill',
  scope: 'PROJECT_LOCAL',
  desired_capability: 'Revisar presentaciones ejecutivas',
  extension_id: 'local.frames.review-deck',
};

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, {recursive: true, force: true});
});

describe('frames:extend CLI', () => {
  it('is zero-write by default and returns an inspectable plan', () => {
    const root = workspace();
    const result = runFramesExtend({argv: [], stdin: JSON.stringify(input), cwd: root});
    const output = JSON.parse(result.stdout) as {
      route_id: string;
      mode: string;
      writes: string[];
      request_hash: string;
    };
    expect(result.exitCode).toBe(0);
    expect(output).toMatchObject({route_id: 'R8', mode: 'DRY_RUN', writes: []});
    expect(output.request_hash).toMatch(/^[a-f0-9]{64}$/u);
    expect(readdirSync(root)).toEqual([]);
  });

  it('requires the exact brief approval hash before materializing', () => {
    const root = workspace(true);
    expect(() =>
      runFramesExtend({
        argv: ['--apply', '--approval-hash', '0'.repeat(64)],
        stdin: JSON.stringify(input),
        cwd: root,
      }),
    ).toThrow('FRAMES-EXTEND-GATE001');
    expect(readdirSync(root)).toEqual(['package.json']);
  });

  it('materializes and activates a complete private package after approval', () => {
    const root = workspace(true);
    const dryRun = JSON.parse(
      runFramesExtend({argv: [], stdin: JSON.stringify(input), cwd: root}).stdout,
    ) as {request_hash: string};
    const result = runFramesExtend({
      argv: ['--apply', '--approval-hash', dryRun.request_hash],
      stdin: JSON.stringify(input),
      cwd: root,
    });
    const output = JSON.parse(result.stdout) as {
      record: {state: string; source_root: string};
      receipt: {state: string; receipt_sha256: string};
    };
    expect(output.record.state).toBe('ACTIVE_LOCAL');
    expect(output.receipt).toMatchObject({state: 'ACTIVE_LOCAL'});
    expect(output.receipt.receipt_sha256).toMatch(/^[a-f0-9]{64}$/u);
    const packageRoot = join(root, '04_estado/local/extensions/frames/review-deck');
    expect(readFileSync(join(packageRoot, 'documentation.md'), 'utf8')).toContain(
      'no sustituye capacidades canónicas',
    );
    expect(readFileSync(join(packageRoot, 'activation-receipt.json'), 'utf8')).toContain(
      output.receipt.receipt_sha256,
    );
  });

  it('preserves an existing package on collision', () => {
    const root = workspace(true);
    const dryRun = JSON.parse(
      runFramesExtend({argv: [], stdin: JSON.stringify(input), cwd: root}).stdout,
    ) as {request_hash: string};
    const argv = ['--apply', '--approval-hash', dryRun.request_hash];
    runFramesExtend({argv, stdin: JSON.stringify(input), cwd: root});
    const documentation = join(
      root,
      '04_estado/local/extensions/frames/review-deck/documentation.md',
    );
    const before = readFileSync(documentation, 'utf8');
    expect(() => runFramesExtend({argv, stdin: JSON.stringify(input), cwd: root})).toThrow(
      'FRAMES-EXTEND-COLLISION001',
    );
    expect(readFileSync(documentation, 'utf8')).toBe(before);
  });

  it('blocks a symlinked project extension root without touching the target', () => {
    const root = workspace(true);
    const outside = workspace();
    mkdirSync(join(root, '04_estado/local'), {recursive: true});
    symlinkSync(outside, join(root, '04_estado/local/extensions'));
    const dryRun = JSON.parse(
      runFramesExtend({argv: [], stdin: JSON.stringify(input), cwd: root}).stdout,
    ) as {request_hash: string};
    expect(() =>
      runFramesExtend({
        argv: ['--apply', '--approval-hash', dryRun.request_hash],
        stdin: JSON.stringify(input),
        cwd: root,
      }),
    ).toThrow('FRAMES-EXTEND-PATH001');
    expect(readdirSync(outside)).toEqual([]);
  });

  it('keeps USER_LOCAL output outside the repository and inside the explicit root', () => {
    const root = workspace(true);
    const userRoot = workspace();
    const userInput = {...input, scope: 'USER_LOCAL' as const};
    const dryRun = JSON.parse(
      runFramesExtend({argv: [], stdin: JSON.stringify(userInput), cwd: root}).stdout,
    ) as {request_hash: string};
    const output = JSON.parse(
      runFramesExtend({
        argv: ['--apply', '--approval-hash', dryRun.request_hash],
        stdin: JSON.stringify(userInput),
        cwd: root,
        env: {FRAMES_USER_EXTENSIONS_ROOT: userRoot},
      }).stdout,
    ) as {record: {scope: string; state: string}};
    expect(output.record).toMatchObject({scope: 'USER_LOCAL', state: 'ACTIVE_LOCAL'});
    expect(readdirSync(root)).toEqual(['package.json']);
    expect(
      readFileSync(join(userRoot, 'frames/review-deck/activation-receipt.json'), 'utf8'),
    ).toContain('ACTIVE_LOCAL');
  });
});
