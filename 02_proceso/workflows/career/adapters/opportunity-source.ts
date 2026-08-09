import {createHash} from 'node:crypto';

import {z} from 'zod';

import {PortableRefSchema, Sha256Schema} from '../_schema/primitives-v1.schema.ts';

export const OpportunitySourceInputV1Schema = z.strictObject({
  schema_version: z.literal('opportunity-source-input-v1'),
  source_type: z.enum(['linkedin', 'linked_portal', 'manual_import']),
  canonical_url: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  description_sha256: z.string().nullable().optional(),
  captured_ref: z.string().nullable().optional(),
});

export const OpportunitySourceSnapshotV1Schema = z.strictObject({
  schema_version: z.literal('opportunity-source-snapshot-v1'),
  status: z.enum(['PASS', 'UNKNOWN', 'BLOCKED']),
  source_type: z.enum(['linkedin', 'linked_portal', 'manual_import']).nullable(),
  canonical_url: z.url().nullable(),
  captured_ref: PortableRefSchema.nullable(),
  normalized_description: z.string().nullable(),
  raw_sha256: Sha256Schema.nullable(),
  normalized_sha256: Sha256Schema.nullable(),
  reason_codes: z.array(z.string().regex(/^[A-Z][A-Z0-9_]{2,79}$/u)).min(1),
  network_used: z.literal(false),
});

export type OpportunitySourceSnapshotV1 = z.infer<typeof OpportunitySourceSnapshotV1Schema>;

const sha256 = (value: string): string => createHash('sha256').update(value, 'utf8').digest('hex');

const normalizeDescription = (value: string): string =>
  `${value
    .normalize('NFC')
    .replaceAll('\r\n', '\n')
    .replaceAll('\r', '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/u, ''))
    .join('\n')
    .trim()}\n`;

const forbiddenKey =
  /(?:cookie|credential|password|secret|access.?token|refresh.?token|authorization)/iu;
const forbiddenMaterial = [
  /(?:^|\s)(?:cookie|authorization)\s*[:=]/iu,
  /\bbearer\s+[A-Za-z0-9._~+/-]+=*/iu,
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/iu,
  /(?:^|\D)(?:\+?\d[\s().-]?){8,15}(?:\D|$)/u,
];

const containsForbiddenKey = (value: unknown): boolean => {
  if (Array.isArray(value)) return value.some(containsForbiddenKey);
  if (value !== null && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).some(
      ([key, item]) => forbiddenKey.test(key) || containsForbiddenKey(item),
    );
  }
  return false;
};

const result = (
  status: OpportunitySourceSnapshotV1['status'],
  reasonCodes: string[],
  values: Partial<OpportunitySourceSnapshotV1> = {},
): OpportunitySourceSnapshotV1 =>
  OpportunitySourceSnapshotV1Schema.parse({
    schema_version: 'opportunity-source-snapshot-v1',
    status,
    source_type: null,
    canonical_url: null,
    captured_ref: null,
    normalized_description: null,
    raw_sha256: null,
    normalized_sha256: null,
    reason_codes: reasonCodes,
    network_used: false,
    ...values,
  });

const canonicalizeUrl = (value: string): string | null => {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    url.hash = '';
    for (const key of [...url.searchParams.keys()]) {
      if (/^(?:utm_|trk|tracking|ref_)/iu.test(key)) url.searchParams.delete(key);
    }
    url.searchParams.sort();
    return url.toString();
  } catch {
    return null;
  }
};

export const normalizeOpportunitySource = (input: unknown): OpportunitySourceSnapshotV1 => {
  if (containsForbiddenKey(input)) return result('BLOCKED', ['CREDENTIAL_FIELD_FORBIDDEN']);
  const parsed = OpportunitySourceInputV1Schema.safeParse(input);
  if (!parsed.success) return result('BLOCKED', ['INVALID_INPUT_CONTRACT']);
  const value = parsed.data;
  const missing: string[] = [];
  if (!value.canonical_url) missing.push('URL_MISSING');
  if (!value.description?.trim()) missing.push('DESCRIPTION_MISSING');
  if (!value.description_sha256) missing.push('DESCRIPTION_HASH_MISSING');
  if (!value.captured_ref) missing.push('CAPTURE_REF_MISSING');
  if (missing.length) return result('UNKNOWN', missing, {source_type: value.source_type});

  const canonicalUrl = canonicalizeUrl(value.canonical_url as string);
  if (!canonicalUrl)
    return result('BLOCKED', ['URL_NOT_SAFE_HTTPS'], {source_type: value.source_type});
  if (
    value.source_type === 'linkedin' &&
    !/(?:^|\.)linkedin\.com$/u.test(new URL(canonicalUrl).hostname)
  ) {
    return result('BLOCKED', ['LINKEDIN_HOST_MISMATCH'], {source_type: value.source_type});
  }
  const description = value.description as string;
  if (forbiddenMaterial.some((pattern) => pattern.test(description))) {
    return result('BLOCKED', ['CREDENTIAL_OR_PII_DETECTED'], {
      source_type: value.source_type,
      canonical_url: canonicalUrl,
    });
  }
  const rawSha256 = sha256(description);
  if (rawSha256 !== value.description_sha256) {
    return result('BLOCKED', ['DESCRIPTION_HASH_MISMATCH'], {
      source_type: value.source_type,
      canonical_url: canonicalUrl,
      raw_sha256: rawSha256,
    });
  }
  const normalized = normalizeDescription(description);
  return result('PASS', ['SNAPSHOT_NORMALIZED'], {
    source_type: value.source_type,
    canonical_url: canonicalUrl,
    captured_ref: value.captured_ref as string,
    normalized_description: normalized,
    raw_sha256: rawSha256,
    normalized_sha256: sha256(normalized),
  });
};
