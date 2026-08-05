import {JsonValueSchema, type JsonValue} from '../contracts/index.ts';

export class CanonicalizationError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'CanonicalizationError';
  }
}

function encodeString(value: string): string {
  const encoded = JSON.stringify(value);
  if (encoded === undefined) {
    throw new CanonicalizationError('Unable to encode string');
  }
  return encoded;
}

function encodeValue(value: JsonValue): string {
  if (value === null) {
    return 'null';
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new CanonicalizationError('Non-finite numbers are not JSON values');
    }
    return Object.is(value, -0) ? '0' : String(value);
  }
  if (typeof value === 'string') {
    return encodeString(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => encodeValue(item)).join(',')}]`;
  }

  const entries = Object.entries(value).sort(([left], [right]) => {
    if (left === right) {
      return 0;
    }
    return left < right ? -1 : 1;
  });
  return `{${entries.map(([key, item]) => `${encodeString(key)}:${encodeValue(item)}`).join(',')}}`;
}

export function canonicalize(input: unknown): string {
  const value = JsonValueSchema.parse(input);
  return encodeValue(value);
}
