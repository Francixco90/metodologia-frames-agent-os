import type {z} from 'zod';

import {JsonValueSchema} from './primitives.ts';

export function parseJsonRepresentation<Output>(
  schema: z.ZodType<Output>,
  serialized: string,
): Output {
  const decoded: unknown = JSON.parse(serialized);
  return schema.parse(decoded);
}

export function toJsonRepresentation<Output>(schema: z.ZodType<Output>, input: unknown): string {
  const parsed = schema.parse(input);
  JsonValueSchema.parse(parsed);
  return JSON.stringify(parsed);
}
