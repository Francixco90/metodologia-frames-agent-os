import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

import {
  MaterialReferenceV1Schema,
  hashExperienceValue,
  type MaterialReferenceV1,
} from '../../../core/contracts/index.ts';
import {BriefSourceSchema, type BriefSourceV1} from '../../multimedia/_schema/brief-v1.schema.ts';
import {assertContainedInputFileV1} from '../safe-local-path-v1.ts';
import {SOURCE_AUTHORITY_RECEIPT_CODES} from './codes.ts';
import {parseAuthorityReceiptRefsV1, readAuthorityReceiptV1} from './receipt-files.ts';

const bindingKey = ({ref, sha256}: {ref: string; sha256?: string | null}): string =>
  `${ref}\u0000${sha256 ?? ''}`;

export const bindBriefSourcesV1 = (
  root: string,
  materials: MaterialReferenceV1[],
  briefSources: BriefSourceV1[],
  authorityReceiptRefs: MaterialReferenceV1[],
): {sources: BriefSourceV1[]; authorityReceipts: MaterialReferenceV1[]} => {
  const parsedSources = briefSources.map((source) => BriefSourceSchema.parse(source));
  const parsedMaterials = materials.map((material) => MaterialReferenceV1Schema.parse(material));
  if (materials.length !== parsedSources.length) {
    throw new Error('EXPERIENCE-SOURCE-AUTHORITY-REQUIRED');
  }
  const sourceIds = parsedSources.map(({source_id}) => source_id);
  if (new Set(sourceIds).size !== sourceIds.length) {
    throw new Error('EXPERIENCE-SOURCE-ID-DUPLICATE');
  }
  const materialBindings = parsedMaterials.map(bindingKey);
  const sourceBindings = parsedSources.map(bindingKey);
  if (
    new Set(materialBindings).size !== materialBindings.length ||
    new Set(sourceBindings).size !== sourceBindings.length
  ) {
    throw new Error('EXPERIENCE-SOURCE-AUTHORITY-DUPLICATE');
  }
  if (
    materialBindings.some((binding) => !sourceBindings.includes(binding)) ||
    sourceBindings.some((binding) => !materialBindings.includes(binding))
  ) {
    throw new Error('EXPERIENCE-SOURCE-AUTHORITY-BINDING-DRIFT');
  }
  if (
    parsedSources.some(({authority, rights}) => authority === 'unknown' || rights === 'unknown')
  ) {
    throw new Error('EXPERIENCE-SOURCE-AUTHORITY-UNKNOWN');
  }
  if (
    parsedSources.some(({authority, rights}) => authority === 'verified' || rights === 'cleared')
  ) {
    throw new Error('EXPERIENCE-SOURCE-VERIFIED-AUTHORITY-UNAVAILABLE-V1');
  }
  if (authorityReceiptRefs.length !== parsedSources.length) {
    throw new Error(SOURCE_AUTHORITY_RECEIPT_CODES.required);
  }
  const parsedReceiptRefs = parseAuthorityReceiptRefsV1(authorityReceiptRefs);
  for (const material of parsedMaterials) {
    const materialPath = assertContainedInputFileV1(root, material.ref);
    if (createHash('sha256').update(readFileSync(materialPath)).digest('hex') !== material.sha256) {
      throw new Error('EXPERIENCE-SOURCE-MATERIAL-HASH-DRIFT');
    }
  }
  const receiptsBySourceId = new Map<string, MaterialReferenceV1>();
  const receiptIds = new Set<string>();
  const physicalReceiptPaths = new Set<string>();
  for (const receiptRef of parsedReceiptRefs) {
    const {receipt} = readAuthorityReceiptV1(root, receiptRef, physicalReceiptPaths);
    if (receiptIds.has(receipt.receiptId) || receiptsBySourceId.has(receipt.source.source_id)) {
      throw new Error(SOURCE_AUTHORITY_RECEIPT_CODES.duplicate);
    }
    receiptIds.add(receipt.receiptId);
    const expectedSource = parsedSources.find(
      ({source_id}) => source_id === receipt.source.source_id,
    );
    if (
      expectedSource === undefined ||
      hashExperienceValue(expectedSource) !== hashExperienceValue(receipt.source)
    ) {
      throw new Error(SOURCE_AUTHORITY_RECEIPT_CODES.bindingDrift);
    }
    receiptsBySourceId.set(receipt.source.source_id, receiptRef);
  }
  if (receiptsBySourceId.size !== parsedSources.length) {
    throw new Error(SOURCE_AUTHORITY_RECEIPT_CODES.bindingDrift);
  }
  const sources = parsedMaterials.map((material) => {
    const match = parsedSources.find(
      ({ref, sha256}) => ref === material.ref && sha256 === material.sha256,
    );
    if (match === undefined) throw new Error('EXPERIENCE-SOURCE-AUTHORITY-BINDING-DRIFT');
    return match;
  });
  return {sources, authorityReceipts: parsedReceiptRefs};
};
