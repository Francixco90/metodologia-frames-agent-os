import {CandidateProfileV1Schema, EvidenceBankV1Schema} from '../_schema/contracts-v1.schema.ts';
import {CareerCvV2Schema, type CareerCvV2} from '../_schema/document-v2.schema.ts';
import {sha256Text, stableStringify} from './canonical.ts';
import {
  assertCompleteCvCompileRefs,
  assertCvSpecBindings,
  type CvSpecObservedBindings,
} from './cv-spec-bindings.ts';
import {calculateCareerDocumentHash} from './document-model.ts';
import {calculateEvidenceBankHash} from './evidence-gate.ts';

type CompileInput = {
  spec: unknown;
  evidenceBank: unknown;
  candidateProfile: unknown;
  candidateProfileSha256: string;
  observedBindings: CvSpecObservedBindings & {
    candidate_profile_ref: string;
    evidence_bank_ref: string;
    positioning_ref: string;
    application_brief_ref: string | null;
    requirement_evidence_map_ref: string | null;
    job_snapshot_ref: string | null;
    fit_scorecard_ref: string | null;
    application_decision_ref: string | null;
  };
  variantId: string;
  contactBinding: {binding_id: string; lines: string[]};
  applicationId: string | null;
};

const claimId = (evidenceId: string): string => `CLM-${evidenceId.slice(4)}`;
export const calculateCandidateProfileHash = (input: unknown): string =>
  sha256Text(stableStringify(CandidateProfileV1Schema.parse(input)));

/** [CÓDIGO] Compila exclusivamente contenido localizado declarado dentro de evidencia hash-bound. */
export const compileCareerCvV2 = (input: CompileInput): CareerCvV2 => {
  assertCompleteCvCompileRefs(input.observedBindings);
  const bank = EvidenceBankV1Schema.parse(input.evidenceBank);
  const profile = CandidateProfileV1Schema.parse(input.candidateProfile);
  if (calculateEvidenceBankHash(bank) !== bank.bank_sha256)
    throw new Error('EVIDENCE_BANK_HASH_MISMATCH');
  const profileHash = calculateCandidateProfileHash(profile);
  if (
    input.observedBindings.candidate_profile_sha256 !== profileHash ||
    input.observedBindings.evidence_bank_sha256 !== bank.bank_sha256
  ) {
    throw new Error('CV_COMPILE_OBSERVED_SOURCE_MISMATCH');
  }
  const spec = assertCvSpecBindings(input.spec, input.observedBindings);
  if (
    spec.candidate_profile_sha256 !== profileHash ||
    input.candidateProfileSha256 !== profileHash
  ) {
    throw new Error('CANDIDATE_PROFILE_STALE');
  }
  if (profile.candidate_id !== spec.candidate_id || bank.candidate_id !== spec.candidate_id) {
    throw new Error('CV_COMPILE_CANDIDATE_MISMATCH');
  }
  if (input.contactBinding.binding_id !== spec.contact_binding.binding_id) {
    throw new Error('CV_COMPILE_CONTACT_BINDING_MISMATCH');
  }
  if ((input.applicationId === null) !== (spec.intent === 'general')) {
    throw new Error('CV_COMPILE_APPLICATION_MISMATCH');
  }
  if (spec.gaps.some(({treatment}) => treatment === 'block'))
    throw new Error('CV_SPEC_BLOCKING_GAP');
  const variant = spec.variants.find(({variant_id}) => variant_id === input.variantId);
  if (!variant) throw new Error('CV_SPEC_VARIANT_MISSING');
  if (!profile.languages.includes(variant.language)) throw new Error('CV_COMPILE_LANGUAGE_MISSING');

  const byId = new Map(bank.evidence.map((item) => [item.evidence_id, item]));
  const selected = spec.evidence_selection.flatMap((selection) =>
    selection.evidence_ids.map((id, index) => {
      const evidence = byId.get(id);
      if (!evidence) throw new Error(`CV_COMPILE_EVIDENCE_MISSING:${id}`);
      if (!['verified', 'user_confirmed'].includes(evidence.confidence)) {
        throw new Error(`CV_COMPILE_EVIDENCE_NOT_PROMOTABLE:${id}`);
      }
      if (!evidence.allowed_channels.includes('cv') || !evidence.source_ref) {
        throw new Error(`CV_COMPILE_EVIDENCE_NOT_USABLE:${id}`);
      }
      if (!evidence.source_sha256 || evidence.source_sha256 !== selection.evidence_hashes[index]) {
        throw new Error(`CV_COMPILE_EVIDENCE_HASH_MISMATCH:${id}`);
      }
      const content = evidence.cv_content?.find(
        (item) => item.language === variant.language && item.section === selection.section_id,
      );
      if (!content) throw new Error(`CV_COMPILE_CONTENT_MISSING:${id}:${selection.section_id}`);
      return {evidence, content};
    }),
  );
  const section = (name: string) => selected.filter(({content}) => content.section === name);
  const summaries = section('summary');
  const experiences = section('experience');
  const skills = section('skills');
  if (summaries.length === 0 || experiences.length === 0 || skills.length === 0) {
    throw new Error('CV_COMPILE_REQUIRED_SECTION_EMPTY');
  }
  const pair = (entry: (typeof selected)[number]) => ({
    evidence_ids: [entry.evidence.evidence_id],
    evidence_hashes: [entry.evidence.source_sha256 as string],
  });
  const experience = experiences.map((entry) => ({
    organization: entry.content.organization as string,
    role: entry.content.role as string,
    period: entry.content.period as string,
    location: entry.content.location,
    achievements: [
      {claim_id: claimId(entry.evidence.evidence_id), text: entry.content.text, ...pair(entry)},
    ],
  }));
  const summaryPair = {
    evidence_ids: summaries.map(({evidence}) => evidence.evidence_id),
    evidence_hashes: summaries.map(({evidence}) => evidence.source_sha256 as string),
  };
  const bindings = [
    {
      path: '/name',
      classification: 'non_claim' as const,
      evidence_ids: [],
      evidence_hashes: [],
      rationale: 'Identity from approved candidate profile.',
    },
    ...input.contactBinding.lines.map((_, index) => ({
      path: `/contact_lines/${index}`,
      classification: 'non_claim' as const,
      evidence_ids: [],
      evidence_hashes: [],
      rationale: 'Private contact binding.',
    })),
    {
      path: '/headline',
      classification: 'non_claim' as const,
      evidence_ids: [],
      evidence_hashes: [],
      rationale: 'Target positioning from approved spec; not a historical title.',
    },
    {
      path: '/summary',
      classification: 'evidence' as const,
      ...summaryPair,
      rationale: null,
    },
    ...experience.flatMap((item, index) =>
      ['organization', 'role', 'period', ...(item.location ? ['location'] : [])].map((field) => ({
        path: `/experience/${index}/${field}`,
        classification: 'evidence' as const,
        ...pair(experiences[index]!),
        rationale: null,
      })),
    ),
    ...skills.map((entry, index) => ({
      path: `/skills/${index}`,
      classification: 'evidence' as const,
      ...pair(entry),
      rationale: null,
    })),
    ...section('education').map((entry, index) => ({
      path: `/education/${index}`,
      classification: 'evidence' as const,
      ...pair(entry),
      rationale: null,
    })),
  ];
  const draft = {
    schema_version: 'career-cv-v2' as const,
    document_id: `CV-${variant.variant_id.slice(6)}`,
    candidate_id: spec.candidate_id,
    application_id: input.applicationId,
    language: variant.language,
    design_profile: variant.design_profile,
    authorized_brand: spec.authorized_brand,
    generated_by: 'MetodologIA' as const,
    name: profile.display_name,
    headline: spec.target_role,
    contact_lines: input.contactBinding.lines,
    summary: summaries.map(({content}) => content.text).join(' '),
    experience,
    education: section('education').map(({content}) => content.text),
    skills: skills.map(({content}) => content.text),
    source_refs: [...new Set(selected.map(({evidence}) => evidence.source_ref as string))],
    surface_bindings: bindings,
    spec_id: spec.spec_id,
    spec_sha256: spec.spec_sha256,
    variant_id: variant.variant_id,
    output_intent: spec.intent,
    audience: variant.audience,
    page_budget: variant.page_budget,
    section_order: spec.section_order,
    keyword_policy: spec.keyword_policy,
    deliberate_omissions: spec.deliberate_omissions,
    gaps: spec.gaps,
    attribution_limits: spec.attribution_limits,
  };
  const parsed = CareerCvV2Schema.parse({...draft, content_sha256: '0'.repeat(64)});
  return {...parsed, content_sha256: calculateCareerDocumentHash(parsed)};
};
