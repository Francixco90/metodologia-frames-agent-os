import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {verifyHtmlMutations, verifyPolicyMutations} from './lib/adversarial-probes.mjs';
import {packageHash} from './lib/canonical.mjs';
import {verifyDocx} from './lib/docx-verifier.mjs';
import {verifyPdf} from './lib/pdf-verifier.mjs';
import {verifyRuntimeFixture} from './lib/runtime-fixture.mjs';
const id = 'evidence-first-cv';
const base = resolve(`skills/${id}`);
const required = [
  'SKILL.md',
  'LINEAGE.yml',
  'references/cv-quality-contract.md',
  'schemas/cv-package-v3.schema.json',
  'schemas/cv-package-v1.schema.json',
  'schemas/cv-package-v2.schema.json',
  'fixtures/positive/targeted-cv-package.json',
  'fixtures/positive/spec-bound-bilingual-package.json',
  'fixtures/positive/hostile-bilingual-copy.json',
  'fixtures/negative/rejected-cv-packages.json',
  'fixtures/negative/rejected-cv-packages-v2.json',
  'fixtures/negative/rejected-cv-packages-v3.json',
  'assets/docx-style-contract.json',
  'assets/contact-binding.example.json',
  'receipts/runtime-boundary.yml',
  'fixtures/runtime/verified/cv-spec.json',
  'fixtures/runtime/verified/candidate-profile.json',
  'fixtures/runtime/verified/profile-source.json',
  'fixtures/runtime/verified/evidence-source.json',
  'fixtures/runtime/verified/evidence-bank.json',
  'fixtures/runtime/verified/canonical-source.json',
  'fixtures/runtime/verified/source-es.json',
  'fixtures/runtime/verified/source-en.json',
  'fixtures/runtime/verified/cv-es.html',
  'fixtures/runtime/verified/cv-en.html',
  'fixtures/runtime/verified/package.json',
  'fixtures/runtime/unverified.pdf',
  'scripts/lib/canonical.mjs',
  'scripts/lib/package-policy.mjs',
  'scripts/lib/html-verifier.mjs',
  'scripts/lib/docx-verifier.mjs',
  'scripts/lib/pdf-verifier.mjs',
  'scripts/lib/parity-verifier.mjs',
  'scripts/lib/runtime-fixture.mjs',
  'scripts/lib/runtime-fixture-inputs.ts',
  'scripts/lib/adversarial-probes.mjs',
  'scripts/build-runtime-fixtures.ts',
  'scripts/check-core-contracts.ts',
];
const docs = new Map(required.map((path) => [path, readFileSync(resolve(base, path), 'utf8')]));
const all = [...docs.values()].join('\n');
const json = (path) => JSON.parse(docs.get(path));
const schemaV3 = json('schemas/cv-package-v3.schema.json');
const compatibilityV2 = json('fixtures/positive/spec-bound-bilingual-package.json');
const negativeV3 = json('fixtures/negative/rejected-cv-packages-v3.json');
const runtimePkg = json('fixtures/runtime/verified/package.json');
const docxStyle = json('assets/docx-style-contract.json');
const contact = json('assets/contact-binding.example.json');
for (const token of [
  `name: ${id}`,
  'version: 0.2.0',
  'cv-spec-v2',
  'cv-package-v3',
  'migrateCvSpecV1ToV2',
  'HUMAN_APPROVED',
  'CR_CV_DESIGN_APPROVED',
  'ats-neutral',
  'spec_sha256',
  'Evidence Bank',
  'CR_PACKAGE_QA',
  'network_allowed: false',
  'submission_authority: false',
])
  if (!all.includes(token)) throw new Error(`CAR-CV-MISSING ${token}`);
const packageFields = [
  'schema_version',
  'package_id',
  'candidate_id',
  'application_id',
  'spec_id',
  'spec_sha256',
  'evidence_bank_sha256',
  'application_brief_sha256',
  'job_snapshot_sha256',
  'source_document_ref',
  'source_document_sha256',
  'contact_binding_id',
  'variants',
  'outputs',
  'qa',
  'parity_status',
  'privacy_status',
  'state',
  'approved_spec_sha256',
  'publication_receipt',
  'package_sha256',
];
if (schemaV3.title !== 'CvPackageV3' || schemaV3.properties.schema_version.const !== 'cv-package-v3') {
  throw new Error('CAR-CV-SCHEMA-V3');
}
if (
  Object.keys(schemaV3.properties).sort().join('|') !== [...packageFields].sort().join('|') ||
  schemaV3.required.sort().join('|') !== [...packageFields].sort().join('|')
) {
  throw new Error('CAR-CV-SCHEMA-V3-RUNTIME-SURFACE');
}
const receiptFields = [
  'receipt_ref',
  'receipt_sha256',
  'external_event_id',
  'observed_at',
  'ready_package_sha256',
];
if (
  schemaV3.$defs.publicationReceipt.required.sort().join('|') !== receiptFields.sort().join('|')
)
  throw new Error('CAR-CV-PUBLICATION-CONTRACT');
if (
  runtimePkg.schema_version !== 'cv-package-v3' ||
  runtimePkg.publication_receipt !== null ||
  packageHash(runtimePkg) !== runtimePkg.package_sha256 ||
  runtimePkg.variants.some(({design}) => design.mode !== 'ats-neutral')
) {
  throw new Error('CAR-CV-V3-SHAPE-FIXTURE');
}
if (compatibilityV2.schema_version !== 'cv-package-v2') throw new Error('CAR-CV-V2-COMPATIBILITY');
const negativeIds = new Set(negativeV3.cases.map(({id: caseId}) => caseId));
for (const caseId of [
  'spec_not_approved',
  'duplicate_variant',
  'duplicate_output',
  'output_matrix_mismatch',
  'artifact_hash_mismatch',
  'self_reported_pass_without_evidence',
  'bilingual_identity_drift',
  'bilingual_role_drift',
  'bilingual_date_drift',
  'bilingual_metric_drift',
  'bilingual_attribution_drift',
  'page_budget_exceeded',
  'hidden_keyword_content',
  'html_javascript',
  'html_module_script',
  'html_json_script_wrong_id',
  'html_json_script_with_src',
  'html_json_script_invalid_payload',
  'html_expected_inert_json',
  'remote_asset',
  'published_without_receipt',
  'receipt_hash_mismatch',
  'pdf_evidence_unavailable',
  'unmeasured_ats_percentage',
  'executive_without_design_decision',
  'ats_with_design_binding',
  'stale_design_system_hash',
])
  if (!negativeIds.has(caseId)) throw new Error(`CAR-CV-NEGATIVE-V3 ${caseId}`);
const failures = [
  ...verifyRuntimeFixture(base),
  ...verifyPolicyMutations(runtimePkg, base),
  ...verifyHtmlMutations(),
];
if (verifyDocx(resolve(base, 'fixtures/runtime/missing.docx')).status !== 'BLOCKED') {
  failures.push('DOCX_MISSING_NOT_BLOCKED');
}
if (verifyPdf(resolve(base, 'fixtures/runtime/missing.pdf'), 1).status !== 'BLOCKED') {
  failures.push('PDF_MISSING_NOT_BLOCKED');
}
if (failures.length) throw new Error(`CAR-CV-EXECUTABLE-QA ${failures.join(',')}`);
execFileSync(
  process.execPath,
  ['--import', 'tsx', resolve(base, 'scripts/check-core-contracts.ts')],
  {
    cwd: process.cwd(),
    stdio: 'inherit',
  },
);
for (const forbidden of ['tables', 'columns', 'text_boxes', 'drawings', 'headers', 'footers']) {
  if (docxStyle.structure?.[forbidden] !== false) throw new Error(`CAR-CV-DOCX ${forbidden}`);
}
if (
  !contact.synthetic ||
  !contact.repository_safe ||
  contact.rules?.persist_real_values_in_git !== false ||
  contact.rules?.persist_hash_derived_from_real_values !== false
) {
  throw new Error('CAR-CV-CONTACT-BINDING-SAFETY');
}
if (/\b(?:90|9[1-9]|100)%\s+ATS\b/iu.test(all)) throw new Error('CAR-CV-ATS-PERCENTAGE');
if (/\/Users\/|\/home\/|file:\/\/|[A-Za-z]:\\Users\\/u.test(all)) {
  throw new Error('CAR-CV-PRIVATE-LOCATOR');
}
console.info(
  'PASS evidence-first-cv: observed hashes, claims, parity and static artifact policy; visual/PDF evidence fails closed.',
);
