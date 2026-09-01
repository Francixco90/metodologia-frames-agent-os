import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

import {
  MaterialReferenceV1Schema,
  hashExperienceValue,
  type MaterialReferenceV1,
} from '../../../core/contracts/index.ts';
import {BriefSourceAuthorityReceiptV1Schema} from '../../multimedia/_schema/brief-v1.schema.ts';
import {assertContainedInputFileV1} from '../safe-local-path-v1.ts';
import {SOURCE_AUTHORITY_RECEIPT_CODES} from './codes.ts';

type AuthorityReceiptV1 = ReturnType<typeof BriefSourceAuthorityReceiptV1Schema.parse>;

const parseAuthorityReceiptRefV1 = (input: unknown): MaterialReferenceV1 => {
  const parsed = MaterialReferenceV1Schema.safeParse(input);
  if (!parsed.success) throw new Error(SOURCE_AUTHORITY_RECEIPT_CODES.invalid);
  return parsed.data;
};

export const parseAuthorityReceiptRefsV1 = (
  inputs: MaterialReferenceV1[],
): MaterialReferenceV1[] => {
  const receiptRefs = inputs.map(parseAuthorityReceiptRefV1);
  const exactRefs = receiptRefs.map(({ref}) => ref);
  if (new Set(exactRefs).size !== exactRefs.length) {
    throw new Error(SOURCE_AUTHORITY_RECEIPT_CODES.duplicate);
  }
  const contentHashes = receiptRefs.map(({sha256}) => sha256);
  if (new Set(contentHashes).size !== contentHashes.length) {
    throw new Error(SOURCE_AUTHORITY_RECEIPT_CODES.duplicate);
  }
  const aliasKeys = exactRefs.map((ref) => {
    if (ref.includes('\\') || ref.split('/').includes('.') || ref !== ref.normalize('NFC')) {
      throw new Error(SOURCE_AUTHORITY_RECEIPT_CODES.alias);
    }
    return ref.toLowerCase();
  });
  if (new Set(aliasKeys).size !== aliasKeys.length) {
    throw new Error(SOURCE_AUTHORITY_RECEIPT_CODES.alias);
  }
  return receiptRefs;
};

const parseAuthorityReceiptV1 = (input: unknown): AuthorityReceiptV1 => {
  const parsed = BriefSourceAuthorityReceiptV1Schema.safeParse(input);
  if (parsed.success) return parsed.data;
  const invalidFields = new Set(
    parsed.error.issues.map((issue) => (issue.path[0] === undefined ? '' : String(issue.path[0]))),
  );
  if (
    ['schemaVersion', 'receiptId', 'authorityMode', 'authorityActorId'].some((field) =>
      invalidFields.has(field),
    )
  ) {
    throw new Error(SOURCE_AUTHORITY_RECEIPT_CODES.identityInvalid);
  }
  if (
    ['rightsBasis', 'allowedUseScope', 'restrictions'].some((field) => invalidFields.has(field))
  ) {
    throw new Error(SOURCE_AUTHORITY_RECEIPT_CODES.scopeInvalid);
  }
  throw new Error(SOURCE_AUTHORITY_RECEIPT_CODES.invalid);
};

const assertAuthorityReceiptFileV1 = (root: string, ref: string): string => {
  try {
    return assertContainedInputFileV1(root, ref);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('FRAMES-ASSIST-PATH002')) {
      throw new Error(SOURCE_AUTHORITY_RECEIPT_CODES.alias, {cause: error});
    }
    throw new Error(SOURCE_AUTHORITY_RECEIPT_CODES.invalid, {cause: error});
  }
};

export const readAuthorityReceiptV1 = (
  root: string,
  receiptRef: MaterialReferenceV1,
  physicalReceiptPaths: Set<string>,
): {physicalPath: string; receipt: AuthorityReceiptV1} => {
  const physicalPath = assertAuthorityReceiptFileV1(root, receiptRef.ref);
  if (physicalReceiptPaths.has(physicalPath)) {
    throw new Error(SOURCE_AUTHORITY_RECEIPT_CODES.alias);
  }
  physicalReceiptPaths.add(physicalPath);
  let receiptBytes: Buffer;
  try {
    receiptBytes = readFileSync(physicalPath);
  } catch {
    throw new Error(SOURCE_AUTHORITY_RECEIPT_CODES.invalid);
  }
  if (createHash('sha256').update(receiptBytes).digest('hex') !== receiptRef.sha256) {
    throw new Error(SOURCE_AUTHORITY_RECEIPT_CODES.hashDrift);
  }
  let unknownReceipt: unknown;
  try {
    unknownReceipt = JSON.parse(receiptBytes.toString('utf8')) as unknown;
  } catch {
    throw new Error(SOURCE_AUTHORITY_RECEIPT_CODES.invalid);
  }
  const receipt = parseAuthorityReceiptV1(unknownReceipt);
  if (hashExperienceValue(receipt) !== receipt.canonicalSha256) {
    throw new Error(SOURCE_AUTHORITY_RECEIPT_CODES.canonicalDrift);
  }
  return {physicalPath, receipt};
};
