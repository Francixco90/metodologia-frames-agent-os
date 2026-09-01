import {createHash} from 'node:crypto';

import {z} from 'zod';

import {hashCanonical} from 'core/evidence/hash.ts';

const Sha256 = z.string().regex(/^[a-f0-9]{64}$/u);
const Text = z.string().trim().min(1).max(2_000);
const Id = z.string().regex(/^[a-z0-9][a-z0-9._-]*$/u);
const unique = (values: readonly string[]): boolean => new Set(values).size === values.length;
const digest = (value: string): string => createHash('sha256').update(value).digest('hex');
const PII_PATTERNS = [
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/iu,
  /\b(?:\d[ -]*?){13,19}\b/u,
  /(?:\+\d{1,3}[ .-]?)?(?:\(\d{2,3}\)[ .-]?)?\d{3}[ .-]\d{3,4}[ .-]\d{4}\b/u,
  /\b(?:\d{1,3}\.){3}\d{1,3}\b/u,
  /\b(?:ssn|social[ -]security|passport|national[ -]id)\s*[:#-]?\s*[a-z0-9-]{5,}\b/iu,
] as const;

const piiTextValues = (value: unknown, key = ''): string[] => {
  if (typeof value === 'string') return key.endsWith('sha256') ? [] : [value];
  if (Array.isArray(value)) return value.flatMap((item) => piiTextValues(item, key));
  if (value === null || typeof value !== 'object') return [];
  return Object.entries(value).flatMap(([childKey, item]) =>
    childKey === 'pii_redaction_receipt' ? [] : piiTextValues(item, childKey),
  );
};
const containsDetectablePii = (value: unknown): boolean =>
  piiTextValues(value).some((text) => PII_PATTERNS.some((pattern) => pattern.test(text)));

export const TechnicalDefensePiiRedactionReceiptV1Schema = z.strictObject({
  schema_version: z.literal('technical-defense-pii-redaction-receipt-v1'),
  policy: z.literal('SYNTHETIC_ONLY'),
  detector_id: z.literal('frames.synthetic-pii-detector-v1'),
  status: z.literal('NO_PII_DETECTED'),
  findings_count: z.literal(0),
  redactions_count: z.literal(0),
  case_payload_sha256: Sha256,
  evidence_sha256: Sha256,
  receipt_sha256: Sha256,
});
export type TechnicalDefensePiiRedactionReceiptV1 = z.infer<
  typeof TechnicalDefensePiiRedactionReceiptV1Schema
>;

const withoutPiiReceipt = (value: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'pii_redaction_receipt'));
const piiReceiptPayload = (value: TechnicalDefensePiiRedactionReceiptV1) =>
  Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'receipt_sha256'));

export const verifyTechnicalDefenseSyntheticPiiV1 = (value: Record<string, unknown>): boolean => {
  const receipt = TechnicalDefensePiiRedactionReceiptV1Schema.safeParse(
    value.pii_redaction_receipt,
  );
  if (!receipt.success || value.pilot_data_classification !== 'SYNTHETIC_ONLY') return false;
  const payload = withoutPiiReceipt(value);
  return (
    !containsDetectablePii(payload) &&
    receipt.data.case_payload_sha256 === hashCanonical(payload) &&
    receipt.data.evidence_sha256 ===
      hashCanonical({
        detector_id: receipt.data.detector_id,
        policy: receipt.data.policy,
        scanned: 'ALL_NON_DIGEST_TEXT_FIELDS',
        findings_count: 0,
      }) &&
    receipt.data.receipt_sha256 === hashCanonical(piiReceiptPayload(receipt.data))
  );
};

const FindingSchema = z.strictObject({
  severity: z.enum(['D0', 'D1', 'D2']),
  description: Text,
  limitation: Text.optional(),
  owner: Id.optional(),
  signoff_sha256: Sha256.optional(),
});

export const TechnicalDefenseCaseV1Schema = z
  .strictObject({
    schema_version: z.literal('technical-defense-case-v1'),
    case_id: Id,
    title: Text,
    objective: Text,
    frozen_at: z.iso.datetime({offset: true}),
    pilot_data_classification: z.literal('SYNTHETIC_ONLY'),
    pii_redaction_receipt: TechnicalDefensePiiRedactionReceiptV1Schema,
    producer_actor_instance_id: Id,
    requirements: z
      .array(z.strictObject({id: Id, text: Text}))
      .min(1)
      .max(24),
    architecture: z.strictObject({
      summary: Text,
      tradeoffs: z
        .array(z.strictObject({decision: Text, benefit: Text, cost: Text}))
        .min(1)
        .max(12),
    }),
    evidence: z
      .array(
        z.strictObject({
          id: Id,
          ref: z.string().min(1).max(300),
          content: Text,
          sha256: Sha256,
          rights: z.enum(['VERIFIED_INTERNAL', 'CLEARED']),
          authority_sha256: Sha256,
        }),
      )
      .min(1)
      .max(32),
    claims: z
      .array(z.strictObject({id: Id, statement: Text, evidence_ids: z.array(Id).min(1).max(12)}))
      .min(1)
      .max(32),
    threats: z
      .array(z.strictObject({id: Id, failure: Text, mitigation: Text, residual_risk: Text}))
      .min(1)
      .max(24),
    questions: z
      .array(
        z.strictObject({id: Id, question: Text, answer: Text, evidence_ids: z.array(Id).min(1)}),
      )
      .min(1)
      .max(32),
    rehearsals: z
      .array(
        z.strictObject({
          id: Id,
          observed: z.literal(true),
          observer_task_id: Id,
          observer_actor_instance_id: Id,
          observer_authority_sha256: Sha256,
          occurred_at: z.iso.datetime({offset: true}),
          score: z.number().int().min(0).max(100),
          notes: Text,
        }),
      )
      .min(2)
      .max(8),
    red_team: z.strictObject({
      task_id: Id,
      actor_instance_id: Id,
      authority_sha256: Sha256,
      verdict: z.enum(['PASS', 'REVISE']),
      findings: z.array(FindingSchema).max(24),
    }),
  })
  .superRefine((value, context) => {
    if (!verifyTechnicalDefenseSyntheticPiiV1(value))
      context.addIssue({
        code: 'custom',
        message: 'Synthetic-only PII/redaction receipt is stale or PII was detected.',
      });
    const ids = value.evidence.map(({id}) => id);
    if (!unique(ids) || !unique(value.claims.map(({id}) => id)))
      context.addIssue({code: 'custom', message: 'Evidence and claim IDs must be unique.'});
    for (const evidence of value.evidence)
      if (digest(evidence.content) !== evidence.sha256)
        context.addIssue({code: 'custom', message: `Mutable evidence: ${evidence.id}.`});
    for (const claim of [...value.claims, ...value.questions])
      if (claim.evidence_ids.some((id) => !ids.includes(id)))
        context.addIssue({code: 'custom', message: `Unsupported claim or answer: ${claim.id}.`});
    if (
      !unique(value.rehearsals.map(({id}) => id)) ||
      !unique(value.rehearsals.map(({observer_task_id}) => observer_task_id)) ||
      !unique(value.rehearsals.map(({observer_actor_instance_id}) => observer_actor_instance_id)) ||
      value.rehearsals.some(
        ({observer_actor_instance_id}) =>
          observer_actor_instance_id === value.producer_actor_instance_id,
      )
    )
      context.addIssue({code: 'custom', message: 'Two independent observed rehearsals required.'});
    if (
      value.red_team.verdict !== 'PASS' ||
      value.red_team.actor_instance_id === value.producer_actor_instance_id ||
      value.red_team.findings.some(({severity}) => severity === 'D0' || severity === 'D1')
    )
      context.addIssue({
        code: 'custom',
        message: 'Independent red-team PASS without D0/D1 required.',
      });
    for (const finding of value.red_team.findings.filter(({severity}) => severity === 'D2'))
      if (!finding.limitation || !finding.owner || !finding.signoff_sha256)
        context.addIssue({code: 'custom', message: 'D2 requires limitation, owner and signoff.'});
  });

export type TechnicalDefenseCaseV1 = z.infer<typeof TechnicalDefenseCaseV1Schema>;
