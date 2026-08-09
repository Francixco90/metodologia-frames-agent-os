import {EvidenceBankV1Schema, type EvidenceBankV1} from '../_schema/contracts-v1.schema.ts';
import {
  CareerCvV1Schema,
  CareerLetterV1Schema,
  type CareerCvV1,
  type CareerLetterV1,
} from '../_schema/document-v1.schema.ts';
import {sha256Text, stableStringify} from './canonical.ts';

type CareerDocument = CareerCvV1 | CareerLetterV1;
type Pair = {evidence_ids: readonly string[]; evidence_hashes: readonly string[]};

export class CareerEvidenceError extends Error {
  public constructor(public readonly issues: readonly string[]) {
    super(`CAREER-EVIDENCE-BLOCKED: ${issues.join(', ')}`);
    this.name = 'CareerEvidenceError';
  }
}

export const calculateEvidenceBankHash = (bank: EvidenceBankV1): string =>
  sha256Text(stableStringify({candidate_id: bank.candidate_id, evidence: bank.evidence}));

const cvSurface = (document: CareerCvV1): Array<{path: string; text: string}> => [
  {path: '/name', text: document.name},
  {path: '/headline', text: document.headline},
  {path: '/summary', text: document.summary},
  ...document.contact_lines.map((text, index) => ({path: `/contact_lines/${index}`, text})),
  ...document.skills.map((text, index) => ({path: `/skills/${index}`, text})),
  ...document.education.map((text, index) => ({path: `/education/${index}`, text})),
  ...document.experience.flatMap((item, index) => [
    {path: `/experience/${index}/organization`, text: item.organization},
    {path: `/experience/${index}/role`, text: item.role},
    {path: `/experience/${index}/period`, text: item.period},
    ...(item.location ? [{path: `/experience/${index}/location`, text: item.location}] : []),
  ]),
];

const visibleSurfaces = (document: CareerDocument): Array<{path: string; text: string}> =>
  document.schema_version === 'career-cv-v1'
    ? cvSurface(document)
    : [
        {path: '/addressee', text: document.addressee},
        ...(document.subject ? [{path: '/subject', text: document.subject}] : []),
        ...document.paragraphs.map((text, index) => ({path: `/paragraphs/${index}`, text})),
      ];

export const visibleSurfacePaths = (document: CareerDocument): readonly string[] =>
  visibleSurfaces(document).map(({path}) => path);

export const assertCareerEvidence = (
  documentInput: unknown,
  bankInput: unknown,
): CareerDocument => {
  const record = documentInput as {schema_version?: string};
  const document =
    record.schema_version === 'career-cv-v1'
      ? CareerCvV1Schema.parse(documentInput)
      : CareerLetterV1Schema.parse(documentInput);
  const bank = EvidenceBankV1Schema.parse(bankInput);
  const issues: string[] = [];
  if (bank.candidate_id !== document.candidate_id) issues.push('CANDIDATE_MISMATCH');
  if (calculateEvidenceBankHash(bank) !== bank.bank_sha256) issues.push('BANK_HASH_MISMATCH');
  const channel = document.schema_version === 'career-cv-v1' ? 'cv' : document.channel;
  const byId = new Map(bank.evidence.map((item) => [item.evidence_id, item]));
  const validate = (owner: string, pair: Pair): void => {
    pair.evidence_ids.forEach((id, index) => {
      const evidence = byId.get(id);
      if (!evidence) return issues.push(`${owner}:EVIDENCE_MISSING:${id}`);
      if (!['verified', 'user_confirmed'].includes(evidence.confidence)) {
        issues.push(`${owner}:CONFIDENCE_NOT_PROMOTABLE:${id}`);
      }
      if (!evidence.allowed_channels.includes(channel)) {
        issues.push(`${owner}:CHANNEL_NOT_ALLOWED:${id}`);
      }
      if (!evidence.source_sha256 || evidence.source_sha256 !== pair.evidence_hashes[index]) {
        issues.push(`${owner}:EVIDENCE_HASH_MISMATCH:${id}`);
      }
    });
  };
  const surfaces = visibleSurfaces(document);
  const expected = visibleSurfacePaths(document);
  const bindings = new Map(document.surface_bindings.map((binding) => [binding.path, binding]));
  if (bindings.size !== document.surface_bindings.length) issues.push('DUPLICATE_SURFACE_BINDING');
  for (const {path, text} of surfaces) {
    const binding = bindings.get(path);
    if (!binding) issues.push(`UNBOUND_VISIBLE_TEXT:${path}`);
    else if (binding.classification === 'evidence') validate(path, binding);
    else if (!text.startsWith('[NO-CLAIM] ')) issues.push(`NON_CLAIM_VISIBLE_TEXT:${path}`);
  }
  for (const path of bindings.keys()) {
    if (!expected.includes(path)) issues.push(`NON_RENDERED_BINDING:${path}`);
  }
  if (document.schema_version === 'career-cv-v1') {
    document.experience
      .flatMap(({achievements}) => achievements)
      .forEach((claim) => validate(claim.claim_id, claim));
  } else {
    const used = new Set(
      document.surface_bindings
        .filter(({classification}) => classification === 'evidence')
        .flatMap(({evidence_ids}) => evidence_ids),
    );
    for (const claim of document.claims) {
      validate(claim.claim_id, claim);
      if (!claim.evidence_ids.every((id) => used.has(id)))
        issues.push(`AUXILIARY_CLAIM:${claim.claim_id}`);
    }
  }
  if (issues.length > 0) throw new CareerEvidenceError(issues);
  return document;
};
