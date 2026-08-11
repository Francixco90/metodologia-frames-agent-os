import {writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';

import {CareerCvPackageV3Schema} from '../../../../02_proceso/workflows/career/_schema/cv-package-v3.schema.ts';
import {compileCareerCvV2} from '../../../../02_proceso/workflows/career/_runner/cv-compiler.ts';
import {
  renderCareerCvAtsHtml,
} from '../../../../02_proceso/workflows/career/_runner/document-renderer.ts';
import {calculateCareerCvPackageV3Hash} from '../../../../02_proceso/workflows/career/_runner/cv-package-v3.ts';
import {calculateCareerDocumentHash} from '../../../../02_proceso/workflows/career/_runner/document-model.ts';
import {
  bank,
  evidenceSource,
  hash,
  json,
  legacySpec,
  profile,
  profileHash,
  profileSource,
  ref,
  spec,
  variants,
} from './lib/runtime-fixture-inputs.ts';

const root = resolve('skills/evidence-first-cv/fixtures/runtime/verified');
const write = (name: string, value: string): Promise<void> => writeFile(resolve(root, name), value);
const observedBindings = {
  candidate_profile_ref: spec.candidate_profile_ref,
  candidate_profile_sha256: profileHash,
  evidence_bank_ref: spec.evidence_bank_ref,
  evidence_bank_sha256: bank.bank_sha256,
  positioning_ref: spec.positioning_ref,
  positioning_sha256: hash(profileSource),
  application_brief_ref: null,
  requirement_evidence_map_ref: null,
  job_snapshot_ref: null,
  fit_scorecard_ref: null,
  application_decision_ref: null,
};
const legacyCvs = variants.map(({variant_id}) =>
  compileCareerCvV2({
    spec: legacySpec,
    evidenceBank: bank,
    candidateProfile: profile,
    candidateProfileSha256: profileHash,
    observedBindings,
    variantId: variant_id,
    contactBinding: {binding_id: spec.contact_binding.binding_id, lines: ['alex@example.invalid']},
    applicationId: null,
  }),
);
const cvs = legacyCvs.map((cv) => {
  const provisional = {...cv, spec_sha256: spec.spec_sha256, content_sha256: '0'.repeat(64)};
  return {...provisional, content_sha256: calculateCareerDocumentHash(provisional)};
});
const sourceBytes = cvs.map((cv) => Buffer.from(json(cv)));
const html = [
  Buffer.from(renderCareerCvAtsHtml(cvs[0], bank)),
  Buffer.from(renderCareerCvAtsHtml(cvs[1], bank)),
];
const boundVariants = variants.map((variant, index) => ({
  ...variant,
  design: spec.variants[index]!.design,
  source_document_ref: ref(index ? 'source-en.json' : 'source-es.json'),
  source_document_sha256: hash(sourceBytes[index]!),
}));
const manifest = json({
  schema_version: 'cv-source-manifest-v1',
  spec_sha256: spec.spec_sha256,
  variants: boundVariants.map(({variant_id, source_document_ref, source_document_sha256}) => ({
    variant_id,
    source_document_ref,
    source_document_sha256,
  })),
});
const packageBase = CareerCvPackageV3Schema.parse({
  schema_version: 'cv-package-v3',
  package_id: 'CVPKG-SYNTH-RUNTIME-001',
  candidate_id: profile.candidate_id,
  application_id: null,
  spec_id: spec.spec_id,
  spec_sha256: spec.spec_sha256,
  evidence_bank_sha256: bank.bank_sha256,
  application_brief_sha256: null,
  job_snapshot_sha256: null,
  source_document_ref: ref('canonical-source.json'),
  source_document_sha256: hash(manifest),
  contact_binding_id: spec.contact_binding.binding_id,
  variants: boundVariants,
  outputs: boundVariants.map((variant, index) => ({
    variant_id: variant.variant_id,
    kind: variant.output_kinds[0],
    artifact_ref: ref(index ? 'cv-en.html' : 'cv-es.html'),
    artifact_sha256: hash(html[index]!),
    verification: 'UNKNOWN',
  })),
  qa: {
    claims: 'PASS',
    cross_format_parity: 'UNKNOWN',
    bilingual_parity: 'PASS',
    accessibility: 'UNKNOWN',
    parseability: 'UNKNOWN',
    determinism: 'PASS',
  },
  parity_status: 'UNKNOWN',
  privacy_status: 'PASS',
  state: 'RENDERED_DRAFT',
  approved_spec_sha256: null,
  publication_receipt: null,
  package_sha256: '0'.repeat(64),
});
const pkg = {...packageBase, package_sha256: calculateCareerCvPackageV3Hash(packageBase)};
await Promise.all([
  write('profile-source.json', profileSource),
  write('evidence-source.json', evidenceSource),
  write('candidate-profile.json', json(profile)),
  write('evidence-bank.json', json(bank)),
  write('cv-spec.json', json(spec)),
  write('source-es.json', sourceBytes[0]!.toString()),
  write('source-en.json', sourceBytes[1]!.toString()),
  write('cv-es.html', html[0]!.toString()),
  write('cv-en.html', html[1]!.toString()),
  write('canonical-source.json', manifest),
  write('package.json', json(pkg)),
]);
console.info('PASS evidence-first-cv runtime fixtures rebuilt from Career OS core.');
