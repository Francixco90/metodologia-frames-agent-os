import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {parse} from 'yaml';

export const repositoryRoot = process.cwd();

export function readRepositoryText(relativePath: string): string {
  return readFileSync(resolve(repositoryRoot, relativePath), 'utf8');
}

export function readRepositoryJson(relativePath: string): unknown {
  return JSON.parse(readRepositoryText(relativePath));
}

export function readRepositoryYaml(relativePath: string): unknown {
  return parse(readRepositoryText(relativePath)) as unknown;
}

export function sha256(value: string | Uint8Array): string {
  return createHash('sha256').update(value).digest('hex');
}
