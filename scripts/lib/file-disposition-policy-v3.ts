export const BASELINE_COMMIT = '4c8c16820aa3abe9f4089a1f88c093e2ea58140f';
export const BASELINE_FILE_COUNT = 387;
export const V2_CLOSURE_COMMIT = '7c26b6719451de7b0101262f3c379f85a251f939';

export const artifactClasses = [
  'canonical_editable',
  'generated',
  'append_only_evidence',
  'code_script',
  'skill',
  'agent_contract',
  'workflow',
] as const;

export const dispositions = [
  'refactored',
  'generator_fixed',
  'superseded',
  'verified_no_change',
  'quarantined',
  'immutable_history',
] as const;

export const ownerIds = [
  'lead',
  'repo',
  'brand',
  'sources',
  'core',
  'agents-committee',
  'skill-foundry',
  'web',
  'content',
  'remotion',
  'static-social',
  'n8n',
  'qa',
  'governance',
  'guardian',
] as const;

export type ArtifactClass = (typeof artifactClasses)[number];
export type Disposition = (typeof dispositions)[number];
export type OwnerId = (typeof ownerIds)[number];

export interface TextMetrics {
  format: 'text' | 'binary';
  words: number;
  loc: number;
}

export interface OwnerResolution {
  owner: OwnerId;
  evidence: string;
}

export interface CurrentEvidence {
  baseline_ref: string;
  current_ref: string;
  current_state: 'present' | 'missing';
  current_sha256: string | null;
  current_words: number | null;
  current_loc: number | null;
  byte_identical: boolean;
  material_change: boolean;
  owner_resolution: string;
  generator_ref: string | null;
  successor_path: string | null;
}

export interface LedgerEntry {
  path: string;
  artifact_class: ArtifactClass;
  initial_sha256: string;
  initial_format: TextMetrics['format'];
  initial_words: number;
  initial_loc: number;
  resolved_owner: OwnerId;
  decision: Disposition;
  justification: string;
  evidence: CurrentEvidence;
}

export const generatedPaths = new Set([
  'projects/vs-001-source-to-campaign/remotion/00-source-script.md',
  'projects/vs-001-source-to-campaign/remotion/01-video-spec.yml',
  'projects/vs-001-source-to-campaign/remotion/02-beat-map.yml',
  'projects/vs-001-source-to-campaign/remotion/03-visual-philosophy.md',
  'projects/vs-001-source-to-campaign/remotion/04-component-registry.yml',
  'projects/vs-001-source-to-campaign/remotion/05-input-props.json',
  'projects/vs-001-source-to-campaign/remotion/06-render-manifest.yml',
  'projects/vs-001-source-to-campaign/remotion/07-postproduction-ledger.md',
  'projects/vs-001-source-to-campaign/remotion/assets-manifest.yml',
  'projects/vs-001-source-to-campaign/remotion/captions.json',
  'projects/vs-001-source-to-campaign/web/artifact/index.html',
  'registries/components/component-registry.yml',
]);

const rootCodePaths = new Set([
  '.gitignore',
  '.npmrc',
  '.nvmrc',
  '.prettierrc.json',
  'eslint.config.js',
  'package.json',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'tsconfig.json',
  'vitest.config.ts',
]);

export const quarantinePrefix = 'skills/stitch-remotion-walkthrough/';
export const generatorSourcePaths = new Set([
  'scripts/build-vertical-slice.ts',
  'workflows/content/build.ts',
  'workflows/web/build.ts',
  'renderers/remotion/scripts/prepare-project.ts',
  'renderers/remotion/scripts/inspect-renders.ts',
]);
export const supersessionByPath = new Map<string, string>();
export const generatedTemplateBindings = [
  {
    output_path: 'brand/generated/social-light.tokens.json',
    template_path: 'brand/tokens/brand-tokens.yml',
  },
  {
    output_path: 'brand/generated/social-light.css',
    template_path: 'brand/tokens/brand-tokens.yml',
  },
  {
    output_path: 'brand/generated/social-light.tokens.ts',
    template_path: 'brand/tokens/brand-tokens.yml',
  },
] as const;
export const ledgerProjectionPaths = new Set([
  'docs/program/file-disposition-ledger.yml',
  'docs/program/file-disposition-ledger.md',
]);

export const isRuntimeGeneratedEvidence = (path: string): boolean =>
  /^projects\/[^/]+\/orchestration\//u.test(path);

export const isHistoricalEvidence = (path: string): boolean =>
  path === 'docs/program/execution-ledger.md' ||
  path.startsWith('committees/creation/') ||
  path.startsWith('governance/') ||
  path.startsWith('guardian/') ||
  path.startsWith('quality/reports/') ||
  path.startsWith('quality/reviews/') ||
  isRuntimeGeneratedEvidence(path) ||
  path === 'projects/vs-001-source-to-campaign/content/build-receipt.json' ||
  /^projects\/[^/]+\/guardian\//u.test(path) ||
  /^projects\/[^/]+\/quality\//u.test(path) ||
  path.endsWith('/remotion/committee/committee-decision.json') ||
  path.endsWith('/remotion/committee/committee-session.json') ||
  path.endsWith('/remotion/approvals/README.md') ||
  path.includes('/remotion/receipts/') ||
  path.includes('/remotion/review-shots/') ||
  /^projects\/[^/]+\/web\/artifact\/(?:build-receipt|visual-smoke)\.json$/u.test(path) ||
  /^projects\/[^/]+\/web\/artifact\/review-[^/]+\.png$/u.test(path) ||
  (path.startsWith('receipts/') &&
    !path.startsWith('receipts/schemas/') &&
    path !== 'receipts/imports/README.md');

export const classifyArtifact = (path: string): ArtifactClass => {
  if (/^agents\/RT-(?:0[1-9]|10|11)\/(?:README\.md|contract\.yml)$/u.test(path)) {
    return 'agent_contract';
  }
  if (path.startsWith('skills/') || path.startsWith('registries/skills/')) return 'skill';
  if (path.startsWith('workflows/')) return 'workflow';
  if (generatedPaths.has(path)) return 'generated';
  if (isHistoricalEvidence(path)) return 'append_only_evidence';
  if (
    rootCodePaths.has(path) ||
    path.startsWith('.github/') ||
    path.startsWith('core/') ||
    path.startsWith('networks/') ||
    path.startsWith('renderers/') ||
    path.startsWith('scripts/') ||
    path.startsWith('tests/') ||
    path.startsWith('types/') ||
    path.startsWith('committees/src/') ||
    path.startsWith('approvals/schemas/') ||
    path.startsWith('receipts/schemas/') ||
    /^adapters\/.*\.(?:ts|mjs)$/u.test(path) ||
    path.endsWith('/remotion/committee/validate-committee.ts') ||
    path.endsWith('/remotion/src/MethodologiaVertical.tsx')
  ) {
    return 'code_script';
  }
  return 'canonical_editable';
};
