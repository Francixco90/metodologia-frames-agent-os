import {readFile} from 'node:fs/promises';
import path from 'node:path';

import {stableStringify} from '../../02_proceso/workflows/multimedia/_runner/brief-model.ts';

export const canonicalCliJson = (value: unknown): string => `${stableStringify(value)}\n`;

const readStdin = async (): Promise<string> => {
  process.stdin.setEncoding('utf8');
  const chunks: string[] = [];
  for await (const chunk of process.stdin) {
    if (typeof chunk !== 'string') throw new Error('SSS_INPUT_ENCODING001');
    chunks.push(chunk);
  }
  return chunks.join('');
};

export const skillSystemInputFromArgs = async (args: string[]): Promise<unknown> => {
  const index = args.indexOf('--input');
  if (index >= 0) {
    const ref = args[index + 1];
    if (!ref || path.isAbsolute(ref) || ref.includes('..') || ref.includes('\\'))
      throw new Error('SSS_INPUT_PATH001');
    return JSON.parse(await readFile(path.resolve(ref), 'utf8'));
  }
  if (args.includes('--stdin')) {
    const body = await readStdin();
    if (body.trim()) return JSON.parse(body);
  }
  return null;
};
