import {createHash} from 'node:crypto';

export const normalizeObject = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(normalizeObject);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right, 'en'))
        .map(([key, item]) => [key, normalizeObject(item)]),
    );
  }
  return value;
};

export const stableStringify = (value: unknown): string => JSON.stringify(normalizeObject(value));
export const sha256Text = (value: string): string =>
  createHash('sha256').update(value, 'utf8').digest('hex');
export const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
export const safeJson = (value: unknown): string =>
  stableStringify(value).replaceAll('<', '\\u003c').replaceAll('&', '\\u0026');
