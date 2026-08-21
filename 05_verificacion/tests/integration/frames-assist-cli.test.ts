import {mkdtempSync, readdirSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

import {afterEach, beforeAll, describe, expect, it} from 'vitest';

type Runner = (input: {
  argv: string[];
  stdin: string;
  cwd?: string;
}) => Promise<{exitCode: number; stdout: string}>;

let runFramesAssist: Runner;
const roots: string[] = [];

beforeAll(async () => {
  const module = (await import(
    pathToFileURL(resolve('05_verificacion/scripts/frames-assist.mjs')).href
  )) as {runFramesAssist: Runner};
  runFramesAssist = module.runFramesAssist;
});

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, {recursive: true, force: true});
});

const workspace = (): string => {
  const root = mkdtempSync(resolve(tmpdir(), 'frames-assist-'));
  roots.push(root);
  return root;
};

describe('frames:assist', () => {
  it.each(['¡Hola!', '/menu', '/ruta Ayúdame a generar una pieza'])(
    'keeps %s read-only by default',
    async (request) => {
      const root = workspace();
      const output = await runFramesAssist({argv: [], stdin: request, cwd: root});
      const result = JSON.parse(output.stdout) as {experience_envelope: {effects: string[]}};
      expect(output.exitCode).toBe(0);
      expect(result.experience_envelope.effects).toEqual([]);
      expect(readdirSync(root)).toEqual([]);
    },
  );

  it('keeps --apply at zero writes until the router transports the selected decision', async () => {
    const root = workspace();
    const inputPath = resolve(root, 'request.json');
    writeFileSync(
      inputPath,
      JSON.stringify({
        request: 'Ayúdame a generar una pieza',
        intent_domain: 'content',
        audience: 'Líderes de producto',
        outcome: 'Comprender una decisión responsable',
        source: {type: 'brief', authority: 'verified', ref: 'source://synthetic'},
        workspace_root: root,
        output_directory_ref: 'work/private/experience/content',
        started_at: '2026-08-09T12:00:00.000Z',
        completed_at: '2026-08-09T12:00:01.000Z',
      }),
    );
    const output = await runFramesAssist({
      argv: ['--input', 'request.json', '--apply'],
      stdin: '',
      cwd: root,
    });
    const result = JSON.parse(output.stdout) as {
      local_execution: {status: string; materialized: boolean};
    };
    expect(result.local_execution).toMatchObject({
      status: 'NEEDS_INPUT',
      materialized: false,
    });
    expect(readdirSync(root)).toEqual(['request.json']);
  });

  it('rejects unsupported options instead of passing them to a shell', async () => {
    await expect(runFramesAssist({argv: ['--command', 'echo unsafe'], stdin: ''})).rejects.toThrow(
      'FRAMES-ASSIST-ARG002',
    );
  });
});
