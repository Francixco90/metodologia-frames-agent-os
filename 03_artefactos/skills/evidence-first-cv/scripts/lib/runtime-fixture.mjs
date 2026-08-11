import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {canonicalHash, sha256File, specHash} from './canonical.mjs';
import {verifyHtml} from './html-verifier.mjs';
import {validatePackagePolicy} from './package-policy.mjs';
import {verifyPdf} from './pdf-verifier.mjs';

const load = (path) => JSON.parse(readFileSync(path, 'utf8'));
const privateLocator = /\/Users\/|\/home\/|file:\/\/|[A-Za-z]:\\Users\\/u;

export const verifyRuntimeFixture = (skillRoot) => {
  const root = resolve(skillRoot, 'fixtures/runtime/verified');
  const spec = load(resolve(root, 'cv-spec.json'));
  const profile = load(resolve(root, 'candidate-profile.json'));
  const bank = load(resolve(root, 'evidence-bank.json'));
  const pkg = load(resolve(root, 'package.json'));
  const sources = [load(resolve(root, 'source-es.json')), load(resolve(root, 'source-en.json'))];
  const issues = validatePackagePolicy(pkg, skillRoot);
  const calculatedSpecHash = specHash(spec);
  if (
    spec.state !== 'HUMAN_APPROVED' ||
    spec.approval?.status !== 'HUMAN_APPROVED' ||
    spec.spec_sha256 !== calculatedSpecHash ||
    spec.approval?.approved_spec_sha256 !== calculatedSpecHash
  )
    issues.push('SPEC_APPROVAL_OR_HASH');
  if (canonicalHash(profile) !== spec.candidate_profile_sha256) issues.push('PROFILE_HASH');
  const bankHash = canonicalHash({candidate_id: bank.candidate_id, evidence: bank.evidence});
  if (bank.schema_version !== 'evidence-bank-v1' || bankHash !== bank.bank_sha256) {
    issues.push('EVIDENCE_BANK_CONTRACT');
  }
  const evidenceById = new Map(bank.evidence.map((item) => [item.evidence_id, item]));
  for (const selection of spec.evidence_selection) {
    selection.evidence_ids.forEach((id, index) => {
      const evidence = evidenceById.get(id);
      if (!evidence || evidence.source_sha256 !== selection.evidence_hashes[index]) {
        issues.push(`SPEC_EVIDENCE_SELECTION:${id}`);
      }
    });
  }
  if (pkg.spec_sha256 !== calculatedSpecHash || pkg.evidence_bank_sha256 !== bankHash) {
    issues.push('PACKAGE_INPUT_BINDING');
  }
  for (const [index, source] of sources.entries()) {
    const variant = pkg.variants[index];
    if (
      source.schema_version !== 'career-cv-v2' ||
      canonicalHash(source, ['content_sha256']) !== source.content_sha256 ||
      source.variant_id !== variant.variant_id ||
      source.spec_sha256 !== spec.spec_sha256 ||
      sha256File(resolve(skillRoot, variant.source_document_ref)) !== variant.source_document_sha256
    )
      issues.push(`VARIANT_SOURCE_CONTRACT:${variant.variant_id}`);
  }
  for (const output of pkg.outputs) {
    const variant = pkg.variants.find(({variant_id}) => variant_id === output.variant_id);
    const result = verifyHtml(resolve(skillRoot, output.artifact_ref), variant.page_budget);
    if (result.status !== 'PASS' || result.layout_status !== 'UNKNOWN') {
      issues.push(`HTML_STATIC_POLICY:${output.variant_id}:${result.issues.join('+')}`);
    }
    if (output.verification !== 'UNKNOWN')
      issues.push(`HTML_VISUAL_EVIDENCE_OVERCLAIM:${output.variant_id}`);
  }
  const material = [spec, profile, bank, pkg, sources].map(JSON.stringify).join('\n');
  if (privateLocator.test(material)) issues.push('PRIVATE_LOCATOR');
  const pdfProbe = verifyPdf(resolve(skillRoot, 'fixtures/runtime/unverified.pdf'), 1, () => false);
  if (pdfProbe.status !== 'UNKNOWN') issues.push('PDF_MISSING_TOOL_NOT_UNKNOWN');
  return issues;
};
