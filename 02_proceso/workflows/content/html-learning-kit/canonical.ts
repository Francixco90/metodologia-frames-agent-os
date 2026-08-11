import {createHash} from 'node:crypto';

const sortValue = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, sortValue(child)]),
    );
  }
  return value;
};

export const canonicalJson = (value: unknown): string =>
  `${JSON.stringify(sortValue(value), null, 2)}\n`;

export const sha256 = (value: Uint8Array | string): string =>
  createHash('sha256').update(value).digest('hex');

export const calculateSpecSha256 = (spec: object): string => {
  const unsigned: Record<string, unknown> = {...spec};
  delete unsigned.specSha256;
  return sha256(canonicalJson(unsigned));
};
