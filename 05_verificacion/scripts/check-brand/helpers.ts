// check-brand/helpers.ts — shared fs/crypto helpers for brand validation. [CÓDIGO]
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {parse} from 'yaml';

export const readYaml = (root: string, relativePath: string): unknown =>
  parse(readFileSync(resolve(root, relativePath), 'utf8')) as unknown;

export const sha256 = (bytes: Buffer): string => createHash('sha256').update(bytes).digest('hex');
