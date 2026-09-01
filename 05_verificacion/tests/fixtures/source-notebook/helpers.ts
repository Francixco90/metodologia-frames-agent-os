import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import path from 'node:path';

import {parse} from 'yaml';
import type {z} from 'zod';

export const readYamlFile = async <Schema extends z.ZodType>(
  relativePath: string,
  schema: Schema,
): Promise<z.output<Schema>> => {
  const raw = await readFile(path.resolve(process.cwd(), relativePath), 'utf8');
  return schema.parse(parse(raw) as unknown);
};

export const sha256 = (value: Uint8Array | string): string =>
  createHash('sha256').update(value).digest('hex');

export const normalizeSourceBytes = (bytes: Uint8Array): Uint8Array => {
  const decoded = new TextDecoder('utf-8', {fatal: true}).decode(bytes);
  const withoutBom = decoded.startsWith('\uFEFF') ? decoded.slice(1) : decoded;
  const normalized = withoutBom
    .normalize('NFC')
    .replaceAll('\r\n', '\n')
    .replaceAll('\r', '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/u, ''))
    .join('\n')
    .replace(/\n*$/u, '\n');
  return new TextEncoder().encode(normalized);
};

export const hasAbsoluteLocalLocator = (value: unknown): boolean => {
  if (typeof value === 'string') {
    return (
      /(?:^|[\s"'=])\/(?:Users|home|private|tmp|var)\//u.test(value) ||
      /[A-Za-z]:[\\/](?:Users|private)[\\/]/u.test(value) ||
      /file:\/\//u.test(value)
    );
  }
  if (Array.isArray(value)) return value.some((item) => hasAbsoluteLocalLocator(item));
  if (value !== null && typeof value === 'object') {
    return Object.values(value).some((item) => hasAbsoluteLocalLocator(item));
  }
  return false;
};
