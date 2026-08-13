import {createHash} from 'node:crypto';
import {z} from 'zod';

export const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/u);
export const IdSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u);
export const PortableRefSchema = z
  .string()
  .min(1)
  .max(300)
  .refine(
    (value) =>
      !value.startsWith('/') &&
      !value.includes('\\') &&
      !value.split('/').includes('..') &&
      !/^[a-z]+:/iu.test(value) &&
      !/(?:private|privado|secret|secrets)/iu.test(value),
    'Expected a portable public-safe relative reference',
  );

export const HashRefSchema = z.strictObject({ref: PortableRefSchema, sha256: Sha256Schema});

export const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, canonicalize(item)]),
    );
  }
  return value;
};

export const canonicalJson = (value: unknown): string => JSON.stringify(canonicalize(value));
export const sha256 = (value: string | Uint8Array): string =>
  createHash('sha256').update(value).digest('hex');
export const hashModel = (value: Record<string, unknown>, hashField: string): string => {
  const copy = structuredClone(value);
  delete copy[hashField];
  return sha256(canonicalJson(copy));
};
