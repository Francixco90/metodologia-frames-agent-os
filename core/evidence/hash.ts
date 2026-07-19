import {createHash, timingSafeEqual} from 'node:crypto';

import {Sha256Schema} from '../contracts/index.ts';
import {canonicalize} from './canonical-json.ts';

export function sha256Text(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

export function hashCanonical(value: unknown): string {
  return sha256Text(canonicalize(value));
}

export function verifyCanonicalHash(value: unknown, expectedDigest: string): boolean {
  const expected = Buffer.from(Sha256Schema.parse(expectedDigest), 'hex');
  const actual = Buffer.from(hashCanonical(value), 'hex');
  return timingSafeEqual(actual, expected);
}
