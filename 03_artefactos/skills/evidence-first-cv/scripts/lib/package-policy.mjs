import {existsSync} from 'node:fs';
import {resolve} from 'node:path';

import {packageHash, sha256File} from './canonical.mjs';

const passed = (value) => ['PASS', 'NOT_APPLICABLE'].includes(value);

export const validatePackagePolicy = (pkg, base) => {
  const issues = [];
  const variantIds = pkg.variants.map(({variant_id}) => variant_id);
  if (new Set(variantIds).size !== variantIds.length) issues.push('DUPLICATE_VARIANT');
  for (const variant of pkg.variants) {
    if (new Set(variant.output_kinds).size !== variant.output_kinds.length) {
      issues.push(`DUPLICATE_OUTPUT_KIND:${variant.variant_id}`);
    }
    const sourcePath = resolve(base, variant.source_document_ref);
    if (!existsSync(sourcePath)) issues.push(`VARIANT_SOURCE_MISSING:${variant.variant_id}`);
    else if (sha256File(sourcePath) !== variant.source_document_sha256) {
      issues.push(`VARIANT_SOURCE_HASH:${variant.variant_id}`);
    }
  }
  const actual = pkg.outputs.map(({variant_id, kind}) => `${variant_id}:${kind}`);
  const expected = pkg.variants.flatMap(({variant_id, output_kinds}) =>
    output_kinds.map((kind) => `${variant_id}:${kind}`),
  );
  if (new Set(actual).size !== actual.length) issues.push('DUPLICATE_OUTPUT');
  if ([...actual].sort().join('|') !== expected.sort().join('|')) issues.push('OUTPUT_MATRIX');
  if (packageHash(pkg) !== pkg.package_sha256) issues.push('PACKAGE_HASH');
  for (const output of pkg.outputs) {
    const path = resolve(base, output.artifact_ref);
    if (!existsSync(path)) {
      issues.push(`OUTPUT_MISSING:${output.variant_id}:${output.kind}`);
    } else if (sha256File(path) !== output.artifact_sha256) {
      issues.push(`OUTPUT_HASH:${output.variant_id}:${output.kind}`);
    }
  }
  const promoted = ['HUMAN_APPROVED', 'READY', 'PUBLISHED'].includes(pkg.state);
  if (promoted && pkg.approved_spec_sha256 !== pkg.spec_sha256) issues.push('STALE_APPROVAL');
  if (
    promoted &&
    (pkg.outputs.some(({verification}) => verification !== 'PASS') ||
      pkg.parity_status !== 'PASS' ||
      pkg.privacy_status !== 'PASS' ||
      Object.values(pkg.qa).some((value) => !passed(value)))
  )
    issues.push('UNVERIFIED_PROMOTION');
  if ((pkg.state === 'PUBLISHED') !== (pkg.publication_receipt !== null)) {
    issues.push('PUBLICATION_RECEIPT_STATE');
  }
  if (pkg.publication_receipt) {
    const receipt = pkg.publication_receipt;
    const path = resolve(base, receipt.receipt_ref);
    if (!existsSync(path) || sha256File(path) !== receipt.receipt_sha256) {
      issues.push('PUBLICATION_RECEIPT_EVIDENCE');
    }
    if (receipt.ready_package_sha256 === pkg.package_sha256) {
      issues.push('PUBLICATION_RECEIPT_PREDECESSOR');
    }
  }
  return issues;
};
