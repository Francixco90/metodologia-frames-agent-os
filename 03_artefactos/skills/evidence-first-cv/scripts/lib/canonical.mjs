import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

export const normalize = (value) => {
  if (Array.isArray(value)) return value.map(normalize);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right, 'en'))
        .map(([key, item]) => [key, normalize(item)]),
    );
  }
  return value;
};

export const sha256 = (value) => createHash('sha256').update(value).digest('hex');
export const sha256File = (path) => sha256(readFileSync(path));
export const canonicalHash = (value, excluded = []) => {
  const material = Object.fromEntries(
    Object.entries(value).filter(([key]) => !excluded.includes(key)),
  );
  return sha256(JSON.stringify(normalize(material)));
};

export const packageHash = (pkg) => canonicalHash(pkg, ['package_sha256']);
export const specHash = (spec) => canonicalHash(spec, ['spec_sha256', 'approval', 'state']);
