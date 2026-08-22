import {createHash} from 'node:crypto';

import {z} from 'zod';

import {PortableIdSchema, Sha256Schema, TimestampSchema} from './primitives.ts';

const sourceFields = {
  materialSha256: Sha256Schema,
  materialByteLength: z.number().int().positive(),
  inventorySha256: Sha256Schema,
  durationMs: z.number().int().positive(),
  frameCount: z.number().int().positive(),
  fpsNumerator: z.number().int().positive(),
  fpsDenominator: z.number().int().positive(),
  evidenceRefs: z.array(Sha256Schema).min(5).max(64),
};
type SourceClock = {
  durationMs: number;
  frameCount: number;
  fpsNumerator: number;
  fpsDenominator: number;
  evidenceRefs: string[];
};

const coherentSource = <T extends z.ZodRawShape>(shape: T) =>
  z.strictObject(shape).superRefine((value, context) => {
    const source = value as unknown as SourceClock;
    const frameMs = (1000 * source.fpsDenominator) / source.fpsNumerator;
    const describedDurationMs = source.frameCount * frameMs;
    if (Math.abs(source.durationMs - describedDurationMs) > frameMs) {
      context.addIssue({code: 'custom', message: 'Source duration, frame count and fps disagree.'});
    }
    if (new Set(source.evidenceRefs).size !== source.evidenceRefs.length) {
      context.addIssue({code: 'custom', message: 'Source evidence must be unique.'});
    }
  });

export const OpportunitySourceReceiptV1Schema = coherentSource({
  schemaVersion: z.literal('opportunity-source-receipt-v1'),
  receiptId: PortableIdSchema,
  ...sourceFields,
  issuedAt: TimestampSchema,
  expiresAt: TimestampSchema,
  canonicalSha256: Sha256Schema,
}).superRefine((receipt, context) => {
  if (Date.parse(receipt.expiresAt) <= Date.parse(receipt.issuedAt)) {
    context.addIssue({
      code: 'custom',
      message: 'Source receipt must have a positive validity window.',
    });
  }
});
export type OpportunitySourceReceiptV1 = z.infer<typeof OpportunitySourceReceiptV1Schema>;

export const OpportunitySourceBindingV1Schema = coherentSource({
  sourceReceiptSha256: Sha256Schema,
  ...sourceFields,
  receiptIssuedAt: TimestampSchema,
  receiptExpiresAt: TimestampSchema,
});
export type OpportunitySourceBindingV1 = z.infer<typeof OpportunitySourceBindingV1Schema>;

const withoutHash = <T extends {canonicalSha256: string}>(value: T): Omit<T, 'canonicalSha256'> => {
  const payload: Partial<T> = {...value};
  delete payload.canonicalSha256;
  return payload as Omit<T, 'canonicalSha256'>;
};
const digestJson = (value: unknown): string =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');
const digestBytes = (value: Uint8Array): string => createHash('sha256').update(value).digest('hex');

export function createOpportunitySourceReceiptV1(input: {
  receiptId: string;
  materialBytes: Uint8Array;
  inventorySha256: string;
  durationMs: number;
  frameCount: number;
  fpsNumerator: number;
  fpsDenominator: number;
  evidenceRefs: string[];
  issuedAt: string;
  expiresAt: string;
}): OpportunitySourceReceiptV1 {
  const payload = withoutHash(
    OpportunitySourceReceiptV1Schema.parse({
      schemaVersion: 'opportunity-source-receipt-v1',
      receiptId: input.receiptId,
      materialSha256: digestBytes(input.materialBytes),
      materialByteLength: input.materialBytes.byteLength,
      inventorySha256: input.inventorySha256,
      durationMs: input.durationMs,
      frameCount: input.frameCount,
      fpsNumerator: input.fpsNumerator,
      fpsDenominator: input.fpsDenominator,
      evidenceRefs: input.evidenceRefs,
      issuedAt: input.issuedAt,
      expiresAt: input.expiresAt,
      canonicalSha256: '0'.repeat(64),
    }),
  );
  return OpportunitySourceReceiptV1Schema.parse({
    ...payload,
    canonicalSha256: digestJson(payload),
  });
}

export function assertOpportunitySourceReceiptV1(
  receiptInput: unknown,
  materialBytes: Uint8Array,
  verifiedAt: string,
): OpportunitySourceReceiptV1 {
  const receipt = OpportunitySourceReceiptV1Schema.parse(receiptInput);
  const verificationMs = Date.parse(TimestampSchema.parse(verifiedAt));
  if (
    digestJson(withoutHash(receipt)) !== receipt.canonicalSha256 ||
    digestBytes(materialBytes) !== receipt.materialSha256 ||
    materialBytes.byteLength !== receipt.materialByteLength ||
    verificationMs < Date.parse(receipt.issuedAt) ||
    verificationMs > Date.parse(receipt.expiresAt)
  ) {
    throw new Error('OPPORTUNITY-SOURCE-RECEIPT-DRIFT');
  }
  return receipt;
}

export function bindOpportunitySourceReceiptV1(
  receipt: OpportunitySourceReceiptV1,
): OpportunitySourceBindingV1 {
  return OpportunitySourceBindingV1Schema.parse({
    sourceReceiptSha256: receipt.canonicalSha256,
    materialSha256: receipt.materialSha256,
    materialByteLength: receipt.materialByteLength,
    inventorySha256: receipt.inventorySha256,
    durationMs: receipt.durationMs,
    frameCount: receipt.frameCount,
    fpsNumerator: receipt.fpsNumerator,
    fpsDenominator: receipt.fpsDenominator,
    evidenceRefs: receipt.evidenceRefs,
    receiptIssuedAt: receipt.issuedAt,
    receiptExpiresAt: receipt.expiresAt,
  });
}
