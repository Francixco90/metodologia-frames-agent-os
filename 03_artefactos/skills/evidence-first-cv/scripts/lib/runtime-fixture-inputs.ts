import {createHash} from 'node:crypto';

import {calculateCandidateProfileHash} from '../../../../../02_proceso/workflows/career/_runner/cv-compiler.ts';
import {calculateEvidenceBankHash} from '../../../../../02_proceso/workflows/career/_runner/evidence-gate.ts';
import {
  approveCvSpec,
  createCvSpec,
} from '../../../../../02_proceso/workflows/career/_runner/cv-spec.ts';

export const ref = (name: string): string => `fixtures/runtime/verified/${name}`;
export const hash = (value: Buffer | string): string =>
  createHash('sha256').update(value).digest('hex');
export const json = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;
export const profileSource = json({synthetic: true, authority: 'fixture-only'});
export const evidenceSource = json({synthetic: true, observation: '12 to 7 days during 2025'});
export const profile = {
  schema_version: 'candidate-profile-v1' as const,
  candidate_id: 'CAND-SYNTH-RUNTIME-001',
  display_name: 'Alex Example',
  headline: 'Synthetic transformation leader',
  role_families: ['Strategy and transformation'],
  languages: ['es', 'en'] as const,
  private_profile_ref: ref('profile-source.json'),
  source_hashes: [hash(profileSource)],
};
const sourceHash = hash(evidenceSource);
const content = (
  language: 'es' | 'en',
  section: 'summary' | 'experience' | 'skills',
  text: string,
) => ({
  language,
  section,
  text,
  organization: section === 'experience' ? 'Synthetic Business Unit' : null,
  role:
    section === 'experience'
      ? language === 'es'
        ? 'Líder de Transformación'
        : 'Transformation Lead'
      : null,
  period: section === 'experience' ? '2025' : null,
  location: null,
});
export const evidence = [
  {
    evidence_id: 'EVD-SYNTH-SUMMARY-001',
    claim: 'Transformation delivery capability.',
    context: 'Synthetic business context.',
    action_method: 'Evidence-bound program leadership.',
    result: 'A concise and attributable professional summary.',
    metric: null,
    cv_content: [
      content(
        'es',
        'summary',
        'Convierte retos de negocio en capacidades de transformación medibles.',
      ),
      content(
        'en',
        'summary',
        'Turns business challenges into measurable transformation capabilities.',
      ),
    ],
  },
  {
    evidence_id: 'EVD-SYNTH-RESULT-001',
    claim: 'Reduced a synthetic delivery cycle.',
    context: 'Synthetic Business Unit during 2025.',
    action_method: 'Led a cross-functional program.',
    result: 'Cycle time moved from 12 to 7 days.',
    metric: '12 → 7 days · 41.7%',
    cv_content: [
      content(
        'es',
        'experience',
        'Redujo el ciclo de entrega de 12 a 7 días (41,7 %) durante 2025.',
      ),
      content(
        'en',
        'experience',
        'Reduced the delivery cycle from 12 to 7 days (41.7%) during 2025.',
      ),
    ],
  },
  {
    evidence_id: 'EVD-SYNTH-SKILL-001',
    claim: 'Program leadership capability.',
    context: 'Synthetic cross-functional delivery.',
    action_method: 'Roadmaps and operating cadence.',
    result: 'Governed delivery capability.',
    metric: null,
    cv_content: [
      content('es', 'skills', 'Liderazgo de programas'),
      content('en', 'skills', 'Program leadership'),
    ],
  },
].map((item) => ({
  ...item,
  source_ref: ref('evidence-source.json'),
  source_sha256: sourceHash,
  confidence: 'verified' as const,
  allowed_channels: ['cv'],
  constraints: [],
}));
const bankBase = {
  schema_version: 'evidence-bank-v1' as const,
  candidate_id: profile.candidate_id,
  evidence,
  bank_sha256: '0'.repeat(64),
};
export const bank = {...bankBase, bank_sha256: calculateEvidenceBankHash(bankBase)};
export const profileHash = calculateCandidateProfileHash(profile);
export const variants = [
  {
    variant_id: 'CVVAR-SYNTH-RUNTIME-ES',
    language: 'es' as const,
    audience: 'ats' as const,
    output_kinds: ['ats-html' as const],
    page_budget: 1,
    design_profile: 'candidate-neutral-ats' as const,
  },
  {
    variant_id: 'CVVAR-SYNTH-RUNTIME-EN',
    language: 'en' as const,
    audience: 'recruiter' as const,
    output_kinds: ['executive-html' as const],
    page_budget: 1,
    design_profile: 'metodologia-career' as const,
  },
];
export const spec = approveCvSpec(
  createCvSpec({
    schema_version: 'cv-spec-v1',
    spec_id: 'CVSPEC-SYNTH-RUNTIME-001',
    intent: 'general',
    candidate_id: profile.candidate_id,
    candidate_profile_ref: ref('candidate-profile.json'),
    candidate_profile_sha256: profileHash,
    evidence_bank_ref: ref('evidence-bank.json'),
    evidence_bank_sha256: bank.bank_sha256,
    positioning_ref: ref('profile-source.json'),
    positioning_sha256: hash(profileSource),
    application_brief_ref: null,
    application_brief_sha256: null,
    requirement_evidence_map_ref: null,
    requirement_evidence_map_sha256: null,
    job_id: null,
    job_snapshot_ref: null,
    job_snapshot_sha256: null,
    targeted_workflow: null,
    target_role: 'Synthetic transformation leader',
    role_family: 'Strategy and transformation',
    positioning: 'Synthetic evidence-bound positioning used only for local verification.',
    section_order: ['summary', 'experience', 'skills', 'education'],
    evidence_selection: evidence.map((item) => ({
      section_id: item.cv_content[0]!.section,
      evidence_ids: [item.evidence_id],
      evidence_hashes: [sourceHash],
      rationale: 'Verified synthetic evidence.',
    })),
    keyword_policy: {
      allowed: ['transformation', 'delivery'],
      omitted: ['machine learning engineer'],
      rule: 'visible-and-evidence-bound',
    },
    deliberate_omissions: ['No unsupported certifications.'],
    gaps: [],
    attribution_limits: ['Synthetic evidence only.'],
    contact_binding: {
      binding_id: 'CONTACT-SYNTH-RUNTIME-001',
      required: true,
      storage: 'private-runtime',
    },
    authorized_brand: null,
    variants,
    acceptance: {
      ats: ['Visible content.'],
      recruiter: ['Role first.'],
      hiring_manager: ['Attribution.'],
      accessibility: ['Semantic HTML.'],
      parity: ['Bound fields.'],
    },
    state: 'DRAFT',
    next_gate: 'CR_CV_SPEC_APPROVED',
    approval: null,
  }),
  {approver_ref: 'H01', approved_at: '2026-08-11T12:00:00-05:00'},
);
