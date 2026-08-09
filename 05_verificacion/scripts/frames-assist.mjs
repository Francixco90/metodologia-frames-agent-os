#!/usr/bin/env node
import {readFileSync} from 'node:fs';

import {
  dispatchIntent,
  dispatchIntentLocal,
} from '../../03_artefactos/skills/content-os-router/scripts/route-intent.mjs';
import {assertContainedInputFileV1} from '../../02_proceso/workflows/core/safe-local-path-v1.ts';

const usage = `Usage: pnpm frames:assist -- [--input request.json] [--apply]

Without --input, read a JSON object or plain-language request from stdin.
Default mode is read-only. --apply may materialize a local brief when intake is sufficient.`;

export const parseAssistArgs = (argv) => {
  let inputPath;
  let apply = false;
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--') {
      continue;
    } else if (argument === '--apply') {
      apply = true;
    } else if (argument === '--input') {
      inputPath = argv[index + 1];
      if (!inputPath || inputPath.startsWith('-')) throw new Error('FRAMES-ASSIST-ARG001');
      index += 1;
    } else if (argument === '--help') {
      return {help: true, apply: false};
    } else {
      throw new Error(`FRAMES-ASSIST-ARG002 unsupported option: ${argument}`);
    }
  }
  return {help: false, apply, ...(inputPath ? {inputPath} : {})};
};

const parseInput = (value) => {
  const normalized = value.normalize('NFKC').trim();
  if (!normalized) throw new Error('FRAMES-ASSIST-INPUT001 empty input');
  if (!normalized.startsWith('{')) return {request: normalized};
  const parsed = JSON.parse(normalized);
  if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
    throw new Error('FRAMES-ASSIST-INPUT002 expected an object');
  }
  return parsed;
};

export const runFramesAssist = async ({argv, stdin, cwd = process.cwd()}) => {
  const options = parseAssistArgs(argv);
  if (options.help) return {exitCode: 0, stdout: `${usage}\n`};
  const raw = options.inputPath
    ? readFileSync(assertContainedInputFileV1(cwd, options.inputPath), 'utf8')
    : stdin;
  const input = parseInput(raw);
  const result = options.apply
    ? await dispatchIntentLocal(input, {authorizedRoot: cwd})
    : dispatchIntent(input);
  return {exitCode: 0, stdout: `${JSON.stringify(result, null, 2)}\n`};
};

if (process.argv[1]?.endsWith('frames-assist.mjs')) {
  try {
    const output = await runFramesAssist({
      argv: process.argv.slice(2),
      stdin: readFileSync(0, 'utf8'),
    });
    process.stdout.write(output.stdout);
    process.exitCode = output.exitCode;
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n${usage}\n`);
    process.exitCode = 1;
  }
}
