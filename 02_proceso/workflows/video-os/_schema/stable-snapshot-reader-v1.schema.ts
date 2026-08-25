import {z} from 'zod';

import {Sha256Schema} from './video-os-v1.schema.ts';

export const SNAPSHOT_JSON_MAX_BYTES = 1024 * 1024;
export const SNAPSHOT_OPAQUE_MAX_BYTES = 512 * 1024 * 1024;
export const SNAPSHOT_TOTAL_MAX_BYTES = 2 * 1024 * 1024 * 1024;
export const SNAPSHOT_MAX_MATERIALS = 64;
export const STABLE_SNAPSHOT_COVERAGE_GAPS = [
  'HOST_OBJECT_TRAPS_REQUIRE_OUTER_TIME_BOUND',
  'NODE_FS_OPENAT_UNAVAILABLE',
] as const;

const SafeIntegerSchema = z
  .number()
  .int()
  .nonnegative()
  .refine((value) => Number.isSafeInteger(value) && !Object.is(value, -0), 'UNSAFE_INTEGER');
const PortableRefSchema = z
  .string()
  .min(1)
  .max(500)
  .refine((value) => value === value.normalize('NFC'), 'REF_NFC')
  .refine((value) => !/\p{C}/u.test(value), 'REF_CONTROL')
  .refine(
    (value) =>
      !value.startsWith('/') && !value.startsWith('~') && !/^[a-z][a-z0-9+.-]*:/iu.test(value),
    'REF_LOCAL',
  )
  .refine((value) => !value.includes('\\') && !value.includes('//'), 'REF_SEPARATOR')
  .refine((value) => !value.endsWith('/'), 'REF_TRAILING')
  .refine(
    (value) => value.split('/').every((part) => part !== '' && part !== '.' && part !== '..'),
    'REF_SEGMENT',
  )
  .refine(
    (value) => value.split('/').every((part) => !/^(?:private|\.runtime)$/iu.test(part)),
    'REF_PRIVATE',
  );

export const StableSnapshotRootAuthoritySchema = z.strictObject({
  root_path: z.string().min(1).max(4_096),
  expected_realpath: z.string().min(1).max(4_096),
  expected_dev: SafeIntegerSchema,
  expected_ino: SafeIntegerSchema,
});

const MaterialSchema = z
  .strictObject({
    ref: PortableRefSchema,
    sha256: Sha256Schema,
    size_bytes: SafeIntegerSchema,
    content_kind: z.enum(['json', 'opaque']),
  })
  .superRefine((value, context) => {
    const limit =
      value.content_kind === 'json' ? SNAPSHOT_JSON_MAX_BYTES : SNAPSHOT_OPAQUE_MAX_BYTES;
    if (value.size_bytes === 0 || value.size_bytes > limit)
      context.addIssue({code: 'custom', message: 'MATERIAL_SIZE_BUDGET', path: ['size_bytes']});
  });

export const StableSnapshotRequestV1Schema = z
  .strictObject({
    schema_version: z.literal('stable-snapshot-request-v1'),
    materials: z.array(MaterialSchema).min(1).max(SNAPSHOT_MAX_MATERIALS),
  })
  .superRefine((value, context) => {
    const refs = value.materials.map(({ref}) => ref);
    if (new Set(refs).size !== refs.length)
      context.addIssue({code: 'custom', message: 'DUPLICATE_REF', path: ['materials']});
    const total = value.materials.reduce((sum, item) => sum + item.size_bytes, 0);
    if (!Number.isSafeInteger(total) || total > SNAPSHOT_TOTAL_MAX_BYTES)
      context.addIssue({code: 'custom', message: 'TOTAL_SIZE_BUDGET', path: ['materials']});
  });

export const StableSnapshotObservationV1Schema = z.strictObject({
  schema_version: z.literal('stable-snapshot-observation-v1'),
  scope: z.literal('MATERIAL_OBSERVATION'),
  observation_status: z.literal('OBSERVED'),
  promotion_authorized: z.literal(false),
  coverage_gaps: z.tuple([
    z.literal(STABLE_SNAPSHOT_COVERAGE_GAPS[0]),
    z.literal(STABLE_SNAPSHOT_COVERAGE_GAPS[1]),
  ]),
  root_identity_sha256: Sha256Schema,
  total_bytes: SafeIntegerSchema,
  json_retained_bytes: SafeIntegerSchema.max(SNAPSHOT_JSON_MAX_BYTES * 64),
  materials: z.array(MaterialSchema).min(1).max(SNAPSHOT_MAX_MATERIALS),
});

export type StableSnapshotRequestV1 = z.infer<typeof StableSnapshotRequestV1Schema>;
const hasBoundedMaterials = (raw: unknown): boolean => {
  try {
    if (!raw || typeof raw !== 'object') return false;
    const materials = Object.getOwnPropertyDescriptor(raw, 'materials');
    if (!materials || !('value' in materials) || !Array.isArray(materials.value)) return false;
    const length = Object.getOwnPropertyDescriptor(materials.value, 'length');
    return Boolean(
      length &&
      'value' in length &&
      Number.isSafeInteger(length.value) &&
      length.value >= 1 &&
      length.value <= SNAPSHOT_MAX_MATERIALS,
    );
  } catch {
    return false;
  }
};
export const parseStableSnapshotRequest = (raw: unknown): StableSnapshotRequestV1 | undefined => {
  if (!hasBoundedMaterials(raw)) return undefined;
  try {
    return StableSnapshotRequestV1Schema.parse(raw);
  } catch {
    return undefined;
  }
};
export const makeStableSnapshotObservation = (
  rootIdentitySha256: string,
  materials: StableSnapshotRequestV1['materials'],
  jsonRetainedBytes: number,
) =>
  StableSnapshotObservationV1Schema.parse({
    schema_version: 'stable-snapshot-observation-v1',
    scope: 'MATERIAL_OBSERVATION',
    observation_status: 'OBSERVED',
    promotion_authorized: false,
    coverage_gaps: STABLE_SNAPSHOT_COVERAGE_GAPS,
    root_identity_sha256: rootIdentitySha256,
    total_bytes: materials.reduce((sum, item) => sum + item.size_bytes, 0),
    json_retained_bytes: jsonRetainedBytes,
    materials,
  });
