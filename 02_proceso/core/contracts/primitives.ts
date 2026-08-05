import {z} from 'zod';

export type JsonPrimitive = boolean | null | number | string;
export type JsonValue = JsonPrimitive | JsonValue[] | {[key: string]: JsonValue};

export const Sha256Schema = z
  .string()
  .regex(/^[a-f0-9]{64}$/u, 'Expected a lowercase SHA-256 digest');

export const TimestampSchema = z.iso.datetime({offset: true});

export const PortableIdSchema = z
  .string()
  .min(3)
  .max(160)
  .regex(
    /^[A-Za-z][A-Za-z0-9]*(?:[._:-][A-Za-z0-9]+)*$/u,
    'Expected a portable identifier without paths or whitespace',
  );

export const ActorIdSchema = PortableIdSchema;

export const RelativePathSchema = z
  .string()
  .min(1)
  .max(512)
  .superRefine((value, context) => {
    if (value.startsWith('/') || /^[A-Za-z]:[\\/]/u.test(value)) {
      context.addIssue({
        code: 'custom',
        message: 'Absolute paths are forbidden in versioned contracts',
      });
    }

    const segments = value.replaceAll('\\', '/').split('/');
    if (segments.includes('..') || segments.includes('')) {
      context.addIssue({
        code: 'custom',
        message: 'Path traversal and empty path segments are forbidden',
      });
    }
  });

export const JsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.null(),
    z.boolean(),
    z.number().finite(),
    z.string(),
    z.array(JsonValueSchema),
    z.record(z.string(), JsonValueSchema),
  ]),
);

export const JsonObjectSchema = z.record(z.string(), JsonValueSchema);

export const PortableRefSchema = z.strictObject({
  schemaVersion: z.literal('portable-ref-v1'),
  kind: z.enum([
    'approval',
    'artifact',
    'asset',
    'claim',
    'component',
    'evidence',
    'handoff',
    'notebook',
    'receipt',
    'source',
  ]),
  id: PortableIdSchema,
  digest: Sha256Schema,
});

export type PortableRef = z.infer<typeof PortableRefSchema>;
