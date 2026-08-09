export type SkillContract = {
  id: string;
  scope: string;
  productionStatus: string;
  positive: string;
  negative: string;
  requiredTerms: readonly string[];
};

export type RegistryEntry = {
  skill_id?: string;
  version?: string;
  current_state?: string;
  content_sha256?: string;
  package_manifest_sha256?: string;
  package_manifest_algorithm?: string;
  lineage?: string;
  content_license?: string;
  content_license_evidence?: {
    text_ref?: string;
    text_sha256?: string;
    receipt_ref?: string;
    receipt_sha256?: string;
  };
  execution_scope?: string;
  production_runtime_status?: string;
  tests?: string[];
  event_ids?: string[];
};

export type RegistryEvent = {
  event_id?: string;
  event_order?: number;
  skill_id?: string;
  content_sha256?: string;
  transition?: {from?: string | null; to?: string};
};

export type Registry = {
  mutation_policy?: string;
  entries?: RegistryEntry[];
  events?: RegistryEvent[];
};

export type SharedLicenseReceipt = {
  append_only?: boolean;
  applies_to?: {package_refs?: string[]};
  permissions?: {publication?: string};
};

export type LicenseEvidence = {
  textRef: string;
  textHash: string;
  receiptRef: string;
  receiptHash: string;
};

export const LICENSE_TEXT_REF =
  'skills/remotion-video-production/licenses/LicenseRef-MetodologIA-Internal.md';
export const LICENSE_RECEIPT_REF = 'skills/instagram-v2-content-license-receipt.yml';
export const PACKAGE_MANIFEST_ALGORITHM =
  'sha256_of_sorted_sha256_double_space_relative_path_lines';
export const PASS_MESSAGE =
  'PASS SKILLS V2: brand, orchestration, carousel, Remotion compatibility and scroll multi-provider skills are hash-bound.';

export const expectedVersion = ({id}: SkillContract): string =>
  id === 'metodologia-certificate-builder'
    ? '0.4.1'
    : id === 'metodologia-brand-router'
      ? '0.2.0'
      : '0.1.0';

export const SKILLS = [
  {
    id: 'metodologia-brand-router',
    scope: 'internal-brand-routing',
    productionStatus: 'publication_blocked',
    positive: 'fixtures/positive/route.yml',
    negative: 'fixtures/negative/stale-profile.yml',
    requiredTerms: ['BrandProfileV2', 'VoiceProfileV2', 'ChannelProfileV1', 'pnpm verify:brand'],
  },
  {
    id: 'instagram-content-orchestration',
    scope: 'local-orchestration',
    productionStatus: 'publication_blocked',
    positive: 'fixtures/positive/carousel-run.yml',
    negative: 'fixtures/negative/concurrency.yml',
    requiredTerms: ['2+2+1', 'veinte evaluaciones', 'RT-09', 'ITERATION_BUDGET_EXCEEDED'],
  },
  {
    id: 'instagram-carousel-production',
    scope: 'local-candidate-production',
    productionStatus: 'publication_blocked',
    positive: 'fixtures/positive/eight-card-pilot.yml',
    negative: 'fixtures/negative/orphan-claim.yml',
    requiredTerms: ['pnpm carousel:build', 'RT-09', 'WORKFLOW_PILOT_REVIEW', 'alt text'],
  },
  {
    id: 'remotion-video-production-v2',
    scope: 'local-design-and-validation',
    productionStatus: 'blocked_license_coverage_gap',
    positive: 'fixtures/positive/v2-adapter.yml',
    negative: 'fixtures/negative/production-license.yml',
    requiredTerms: [
      'ContentWorkOrderV2',
      'CandidatePackageV2',
      'remotion-video-production/SKILL.md',
      'bloqueado',
    ],
  },
  {
    id: 'metodologia-certificate-builder',
    scope: 'local-candidate-production',
    productionStatus: 'publication_blocked',
    positive: 'fixtures/positive/embajador-batch.yml',
    negative: 'fixtures/negative/hours-mismatch.yml',
    requiredTerms: ['cb', 'cv', 'RENDERED_DRAFT', 'coverage_gap', 'work/private'],
  },
  {
    id: 'scroll-experience-foundations',
    scope: 'local-evaluation',
    productionStatus: 'local_capability_only',
    positive: 'fixtures/positive/narrative-structure.yml',
    negative: 'fixtures/negative/layout-animation.yml',
    requiredTerms: ['prefers-reduced-motion', 'transform', 'opacity', 'progressive enhancement'],
  },
  {
    id: 'cinematic-scroll-quality',
    scope: 'local-evaluation',
    productionStatus: 'local_capability_only',
    positive: 'fixtures/positive/three-chapter-storyboard.yml',
    negative: 'fixtures/negative/excessive-pin.yml',
    requiredTerms: ['taste guardrails', 'DTCG', 'quality gate', 'breathing'],
  },
  {
    id: 'scroll-world-agnostic',
    scope: 'local-evaluation',
    productionStatus: 'local_capability_only',
    positive: 'fixtures/positive/four-scene-journey.yml',
    negative: 'fixtures/negative/mandatory-vendor.yml',
    requiredTerms: ['VideoProvider', 'SeedanceAdapter', 'FalAIAdapter', 'model_agnostic'],
  },
  {
    id: 'metodologia-find-skills',
    scope: 'local-skill-discovery',
    productionStatus: 'publication_blocked',
    positive: 'fixtures/positive/discover-dev-skill.yml',
    negative: 'fixtures/negative/assume-missing-skill.yml',
    requiredTerms: ['creation-v3-skill-registry', 'verify:skills', 'homólogo', 'coverage_gap'],
  },
] as const satisfies readonly SkillContract[];
