import {createHash} from 'node:crypto';

import type {LocalActivationReceiptV1, LocalExtensionRecord} from './contracts.ts';

const canonical = (value: unknown): string => {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  return `{${Object.entries(value)
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
    .join(',')}}`;
};

export const createLocalActivationReceipt = (
  record: LocalExtensionRecord,
): LocalActivationReceiptV1 => {
  if (!record.manifest_sha256) throw new Error('LOCAL_EXTENSION_MANIFEST_HASH_REQUIRED');
  const payload = {
    schema_version: 'frames-local-activation-receipt-v1' as const,
    extension_id: record.extension_id,
    manifest_sha256: record.manifest_sha256,
    state: record.state,
    reason_codes: [...record.reason_codes].sort(),
    source_scope: record.scope,
  };
  return {
    ...payload,
    receipt_sha256: createHash('sha256').update(canonical(payload)).digest('hex'),
  };
};
