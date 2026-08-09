import {canonicalize} from '../evidence/canonical-json.ts';
import {sha256Text} from '../evidence/hash.ts';
import {JsonValueSchema, type JsonValue} from './primitives.ts';

const DEFAULT_VOLATILE_KEYS = new Set([
  'canonicalSha256',
  'createdAt',
  'updatedAt',
  'startedAt',
  'completedAt',
  'durationMs',
]);

function withoutVolatileFields(value: JsonValue, excludedKeys: ReadonlySet<string>): JsonValue {
  if (Array.isArray(value)) {
    return value.map((item) => withoutVolatileFields(item, excludedKeys));
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !excludedKeys.has(key))
        .map(([key, item]) => [key, withoutVolatileFields(item, excludedKeys)]),
    );
  }
  return value;
}

export function normalizeExperienceValue(
  input: unknown,
  excludedKeys: ReadonlySet<string> = DEFAULT_VOLATILE_KEYS,
): JsonValue {
  return withoutVolatileFields(JsonValueSchema.parse(input), excludedKeys);
}

export function canonicalExperienceJson(input: unknown): string {
  return canonicalize(normalizeExperienceValue(input));
}

export function hashExperienceValue(input: unknown): string {
  return sha256Text(canonicalExperienceJson(input));
}
