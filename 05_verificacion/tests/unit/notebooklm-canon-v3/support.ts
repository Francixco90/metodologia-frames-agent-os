import {createHash} from 'node:crypto';

import {computeSourceSetSha256} from '../../../../02_proceso/core/contracts/index.ts';

export const sourceIds = Array.from({length: 12}, (_, index) => `NLS-CANON-${index + 1}`);
export const sha = (value: string): string => createHash('sha256').update(value).digest('hex');

export const metadata = (overrides: Record<string, unknown> = {}) => ({
  schema: 'knowledge-document-metadata-v1',
  document_id: 'CTRL-KNOWLEDGE-MAP-V3',
  title: 'Knowledge map',
  version: 'v3.0',
  status: 'ACTIVE',
  authority: 'CONTROL',
  layer: '00 Control',
  language: 'en',
  response_locales: ['en', 'es-419'],
  routes: ['R10-BRAND'],
  tasks: ['route'],
  audiences: ['operator'],
  tags: ['canon-v3'],
  keywords: ['knowledge'],
  aliases: [],
  source_refs: ['SRC-CANON'],
  rights: 'APPROVED',
  validity: {valid_from: '2026-08-26', valid_until: null},
  supersedes: [],
  related_ids: [],
  manifest_ref: 'source-manifest.yml',
  ...overrides,
});

export const studioTypes = [
  'audio',
  'video',
  'infographic',
  'slide-deck',
  'report',
  'flashcards',
  'quiz',
  'data-table',
  'mind-map',
] as const;

export const channels = [
  'linkedin-post',
  'linkedin-carousel',
  'one-pager',
  'executive-deck',
  'commercial-proposal-deck',
  'learning-deck',
  'podcast-script',
  'short-video-script',
  'newsletter-article',
  'email',
  'landing-page',
  'case-study',
  'branded-static-visual',
] as const;

export const template = (family: 'studio' | 'channel', slug: string, index: number) => {
  const artifactType = family === 'studio' ? studioTypes[index] : null;
  const directory = family === 'studio' ? 'studio' : 'channels';
  return {
    templateId: `prompt.${family}.${slug}.v1`,
    version: '1.0',
    family,
    title: `${slug} template`,
    markdownRef: `../knowledge-base/30-templates/${directory}/30-template--${slug}--v1.0.md`,
    jsonPointer: `/templates/${index}`,
    inputs: {required: ['audience', 'objective', 'thesis', 'language', 'source_ids'], optional: []},
    sourceRoles: ['control', 'canon'],
    outputContract: {
      format: slug,
      structure: ['opening', 'body', 'close'],
      state: 'DRAFT',
      languagePolicy: 'user-language-with-es-419-default',
    },
    studioConfig: {
      enabled: family === 'studio',
      artifactType,
      sourcePolicy: {
        min: family === 'studio' ? 4 : 3,
        max: family === 'studio' ? 12 : 8,
        rejectEmpty: true,
        rejectAllSources: true,
      },
      requiresGenerationGate: family === 'studio',
    },
    executionGate: family === 'studio' ? 'NLM_STUDIO_GENERATION_APPROVED' : null,
    negativePrompt: ['no invention', 'no PII', 'no all sources', 'no unsupported claims'],
    acceptance: ['sources resolve', 'language matches', 'format matches', 'receipt exists'],
    idempotency: {
      algorithm: 'sha256-canonical-json',
      fields: ['templateId', 'inputs', 'sourceSetHash', 'language'],
      onDuplicate: 'RETURN_EXISTING_ACTIVE_OR_VERIFIED_ARTIFACT',
    },
  };
};

export const allTemplates = () => [
  ...studioTypes.map((type, index) => template('studio', type, index)),
  ...channels.map((channel, index) => template('channel', channel, index + studioTypes.length)),
];

export const registry = () => ({
  $schema: './prompt-registry.schema.json',
  schema: 'PromptRegistryV1',
  registryId: 'prompt.registry.v1',
  version: '1.0',
  status: 'ACTIVE_PRIVATE_DRAFT',
  languagePolicy: 'user-language-with-es-419-default',
  sourcePolicies: {
    chat: {min: 3, max: 8, rejectEmpty: true, rejectAllSources: true},
    studio: {min: 4, max: 12, rejectEmpty: true, rejectAllSources: true},
    audit: {min: 1, max: 20, rejectEmpty: true, rejectAllSources: true},
  },
  templates: allTemplates(),
});

export const brief = () => ({
  schemaVersion: 'studio-brief-v2',
  briefId: 'brand-deck-v2',
  type: 'slide-deck',
  channel: 'executive-deck',
  language: 'es-419',
  audience: 'executives',
  objective: 'Support a decision',
  thesis: 'Method precedes tooling',
  sourceIds: sourceIds.slice(0, 4),
  activeSourceIds: sourceIds.slice(0, 4),
  sourceSetSha256: computeSourceSetSha256(sourceIds.slice(0, 4)),
  claimEvidence: [
    {
      claimId: 'claim-one',
      claim: 'Method precedes tooling',
      sourceIds: [sourceIds[0]],
      condition: 'MetodologIA operating method',
      asOf: '2026-08-26',
      evidenceTag: 'METODOLOGIA',
    },
  ],
  assetIds: [],
  exclusions: ['No invented claims'],
  structure: ['Decision', 'Evidence', 'Next gate'],
  style: 'Neo-Swiss clean',
  duration: '10 minutes',
  outputFormat: '16:9 editable deck',
  constraints: ['No sharing'],
  acceptance: ['Every strong claim resolves'],
  idempotencyKey: 'brand-deck-v2-source-set',
});
