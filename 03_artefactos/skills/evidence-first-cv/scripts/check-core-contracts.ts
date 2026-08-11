import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {
  CandidateProfileV1Schema,
  EvidenceBankV1Schema,
} from '../../../../02_proceso/workflows/career/_schema/contracts-v1.schema.ts';
import {CareerCvV2Schema} from '../../../../02_proceso/workflows/career/_schema/document-v2.schema.ts';
import {calculateCandidateProfileHash} from '../../../../02_proceso/workflows/career/_runner/cv-compiler.ts';
import {
  renderCareerCvAtsHtml,
} from '../../../../02_proceso/workflows/career/_runner/document-renderer.ts';
import {
  calculateEvidenceBankHash,
  assertCareerEvidence,
} from '../../../../02_proceso/workflows/career/_runner/evidence-gate.ts';
import {parseCareerCv} from '../../../../02_proceso/workflows/career/_runner/document-model.ts';
import {
  assertCareerCvPackageV3Current,
  parseCareerCvPackageV3,
} from '../../../../02_proceso/workflows/career/_runner/cv-package-v3.ts';
import {parseCvSpecV2} from '../../../../02_proceso/workflows/career/_runner/cv-spec-v2.ts';

const projectRoot = resolve('skills/evidence-first-cv');
const fixtureRoot = resolve(projectRoot, 'fixtures/runtime/verified');
const load = (name: string): unknown =>
  JSON.parse(readFileSync(resolve(fixtureRoot, name), 'utf8'));
const profile = CandidateProfileV1Schema.parse(load('candidate-profile.json'));
const bank = EvidenceBankV1Schema.parse(load('evidence-bank.json'));
const spec = parseCvSpecV2(load('cv-spec.json'), {requireApproval: true});
const pkg = parseCareerCvPackageV3(load('package.json'));
const sources = [
  CareerCvV2Schema.parse(load('source-es.json')),
  CareerCvV2Schema.parse(load('source-en.json')),
];

if (calculateCandidateProfileHash(profile) !== spec.candidate_profile_sha256) {
  throw new Error('CORE_FIXTURE_PROFILE_HASH');
}
if (
  calculateEvidenceBankHash(bank) !== bank.bank_sha256 ||
  bank.bank_sha256 !== spec.evidence_bank_sha256
) {
  throw new Error('CORE_FIXTURE_EVIDENCE_HASH');
}
assertCareerCvPackageV3Current(pkg, spec);
for (const source of sources) {
  parseCareerCv(source);
  assertCareerEvidence(source, bank);
  if (source.name !== profile.display_name)
    throw new Error(`CORE_FIXTURE_IDENTITY:${source.language}`);
}

const byVariant = new Map(sources.map((source) => [source.variant_id, source]));
const expectedContent = new Map(
  bank.evidence.flatMap((item) =>
    (item.cv_content ?? []).map(
      (content) => [`${item.evidence_id}:${content.language}:${content.section}`, content] as const,
    ),
  ),
);
const numbers = (value: string): string[] =>
  value.replaceAll(',', '.').match(/[0-9]+(?:\.[0-9]+)?/gu) ?? [];
const bilingualVerifier = async (): Promise<readonly string[]> => {
  const issues: string[] = [];
  const [es, en] = sources;
  if (es?.name !== en?.name) issues.push('IDENTITY_DRIFT');
  if (es?.experience.length !== en?.experience.length) issues.push('ROLE_COUNT_DRIFT');
  for (const source of sources) {
    const summaryIds =
      source.surface_bindings.find(({path}) => path === '/summary')?.evidence_ids ?? [];
    const expectedSummary = summaryIds
      .map((id) => expectedContent.get(`${id}:${source.language}:summary`)?.text)
      .join(' ');
    if (source.summary !== expectedSummary) issues.push(`SUMMARY_DRIFT:${source.language}`);
    source.experience.forEach((experience, index) => {
      const claim = experience.achievements[0];
      const evidenceId = claim?.evidence_ids[0];
      const expected = expectedContent.get(`${evidenceId}:${source.language}:experience`);
      if (
        !expected ||
        experience.role !== expected.role ||
        experience.organization !== expected.organization ||
        experience.period !== expected.period ||
        claim?.text !== expected.text
      ) {
        issues.push(`ROLE_ATTRIBUTION_DRIFT:${source.language}:${index}`);
      }
    });
    source.skills.forEach((skill, index) => {
      const evidenceId = source.surface_bindings.find(({path}) => path === `/skills/${index}`)
        ?.evidence_ids[0];
      if (skill !== expectedContent.get(`${evidenceId}:${source.language}:skills`)?.text) {
        issues.push(`SKILL_DRIFT:${source.language}:${index}`);
      }
    });
  }
  const esClaim = es?.experience[0]?.achievements[0];
  const enClaim = en?.experience[0]?.achievements[0];
  if (esClaim?.evidence_ids.join('|') !== enClaim?.evidence_ids.join('|'))
    issues.push('ATTRIBUTION_DRIFT');
  if (numbers(esClaim?.text ?? '').join('|') !== numbers(enClaim?.text ?? '').join('|'))
    issues.push('METRIC_DATE_DRIFT');
  return issues;
};

const replay = new Map<string, Buffer>();
for (const output of pkg.outputs) {
  const source = byVariant.get(output.variant_id);
  if (!source) throw new Error(`CORE_FIXTURE_SOURCE:${output.variant_id}`);
  const html = renderCareerCvAtsHtml(source, bank);
  replay.set(`${output.variant_id}:${output.kind}`, Buffer.from(html));
}
if ((await bilingualVerifier()).length) throw new Error('CORE_FIXTURE_BILINGUAL_PARITY');
for (const output of pkg.outputs) {
  const observed = readFileSync(resolve(projectRoot, output.artifact_ref));
  if (!replay.get(`${output.variant_id}:${output.kind}`)?.equals(observed)) {
    throw new Error(`CORE_FIXTURE_REPLAY:${output.variant_id}`);
  }
}
console.info(
  'PASS evidence-first-cv core contracts: cv-spec-v2, cv-package-v3 and official renderer replay.',
);
