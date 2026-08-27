import {describe, expect, it} from 'vitest';

import {
  computeSourceSetSha256,
  KnowledgeDocumentMetadataV1Schema,
  NotebookPlanV2Schema,
  NotebookProfileV2Schema,
  PromptRegistryV1Schema,
  StudioBriefV2Schema,
} from '../../../02_proceso/core/contracts/index.ts';
import {
  allTemplates,
  brief,
  metadata,
  registry,
  sha,
  sourceIds,
} from './notebooklm-canon-v3/support.ts';

describe('Canon v3 contracts', () => {
  it('validates strict metadata and requires template registry links', () => {
    expect(KnowledgeDocumentMetadataV1Schema.safeParse(metadata()).success).toBe(true);
    expect(KnowledgeDocumentMetadataV1Schema.safeParse(metadata({rights: 'REVIEW'})).success).toBe(
      false,
    );
    expect(
      KnowledgeDocumentMetadataV1Schema.safeParse(
        metadata({authority: 'TEMPLATE', layer: '30 Templates'}),
      ).success,
    ).toBe(false);
    expect(KnowledgeDocumentMetadataV1Schema.safeParse(metadata({routes: ['R10']})).success).toBe(
      false,
    );
  });

  it('keeps all 9 Studio and 13 channel templates in one deterministic registry', () => {
    const validRegistry = registry();
    expect(PromptRegistryV1Schema.safeParse(validRegistry).success).toBe(true);
    expect(
      PromptRegistryV1Schema.safeParse({...validRegistry, templates: allTemplates().slice(0, 21)})
        .success,
    ).toBe(false);
    expect(
      PromptRegistryV1Schema.safeParse({
        ...validRegistry,
        templates: validRegistry.templates.map((template) =>
          template.family === 'channel'
            ? {...template, executionGate: 'NLM_STUDIO_GENERATION_APPROVED'}
            : template,
        ),
      }).success,
    ).toBe(false);
  });

  it('blocks empty, all-sources sentinels, and evidence outside the active set', () => {
    const selected = sourceIds.slice(0, 4);
    expect(computeSourceSetSha256([...selected].reverse())).toBe(
      sha([...selected].sort().join('\n')),
    );
    expect(StudioBriefV2Schema.safeParse(brief()).success).toBe(true);
    expect(
      StudioBriefV2Schema.safeParse({...brief(), sourceIds: [], activeSourceIds: []}).success,
    ).toBe(false);
    expect(
      StudioBriefV2Schema.safeParse({
        ...brief(),
        sourceIds: ['ALL_SOURCES'],
        activeSourceIds: ['ALL_SOURCES'],
      }).success,
    ).toBe(false);
    expect(
      StudioBriefV2Schema.safeParse({
        ...brief(),
        claimEvidence: [{...brief().claimEvidence[0], sourceIds: [sourceIds[5]]}],
      }).success,
    ).toBe(false);
    expect(
      StudioBriefV2Schema.safeParse({...brief(), sourceSetSha256: sha('stale-source-set')}).success,
    ).toBe(false);
  });

  it('requires every planned source exactly once across bounded source-pack batches', () => {
    const base = {
      schemaVersion: 'notebook-plan-v2',
      planId: 'canon-v3-plan',
      profileId: 'metodologia-brand-content-canon-v3',
      provider: 'notebooklm',
      targetNotebookDigest: null,
      targetNotebookTitle: 'MetodologIA · Brand Content Studio · Canon v3',
      visibility: 'private',
      idempotencyKey: 'canon-v3-create-private',
      operations: [
        {
          operationId: 'curate-canon',
          stage: 'N05',
          action: 'curate',
          sourceIds: sourceIds.slice(0, 4),
          requiredGate: 'NLM_PLAN_APPROVED',
          effect: 'EXTERNAL_MUTATION',
        },
      ],
      sourceIds: sourceIds.slice(0, 4),
      activeSourceIds: sourceIds.slice(0, 4),
      sourcePacks: [
        {
          batchId: 'batch-one',
          sourcePackId: 'canon-controls',
          sourceIds: sourceIds.slice(0, 4),
          purpose: 'Bounded import',
        },
      ],
      permissions: [],
      stopRules: ['Stop without approval'],
      rollback: ['Preserve v2 and archive the private draft'],
    };
    expect(NotebookPlanV2Schema.safeParse(base).success).toBe(true);
    expect(NotebookPlanV2Schema.safeParse({...base, sourcePacks: []}).success).toBe(false);
    expect(
      NotebookPlanV2Schema.safeParse({
        ...base,
        sourcePacks: [{...base.sourcePacks[0], sourceIds: sourceIds.slice(0, 3)}],
      }).success,
    ).toBe(false);
    for (const [action, effect, requiredGate] of [
      ['create', 'EXTERNAL_MUTATION', 'NLM_PLAN_APPROVED'],
      ['configure', 'EXTERNAL_MUTATION', 'NLM_PLAN_APPROVED'],
      ['curate', 'EXTERNAL_MUTATION', 'NLM_PLAN_APPROVED'],
      ['sync', 'EXTERNAL_MUTATION', 'NLM_SYNC_APPROVED'],
      ['studio', 'EXTERNAL_MUTATION', 'NLM_STUDIO_GENERATION_APPROVED'],
      ['share', 'EXTERNAL_MUTATION', 'NLM_SHARE_AUTHORIZED'],
      ['archive', 'EXTERNAL_MUTATION', 'NLM_DESTRUCTIVE_AUTHORIZED'],
      ['delete', 'DESTRUCTIVE', 'NLM_DESTRUCTIVE_AUTHORIZED'],
    ] as const) {
      expect(
        NotebookPlanV2Schema.safeParse({
          ...base,
          operations: [{...base.operations[0], action, effect, requiredGate}],
        }).success,
      ).toBe(true);
    }
    expect(
      NotebookPlanV2Schema.safeParse({
        ...base,
        operations: [
          {
            ...base.operations[0],
            action: 'create',
            effect: 'EXTERNAL_MUTATION',
            requiredGate: null,
          },
        ],
      }).success,
    ).toBe(false);
    expect(
      NotebookPlanV2Schema.safeParse({
        ...base,
        operations: [
          {...base.operations[0], action: 'configure', effect: 'READ_ONLY', requiredGate: null},
        ],
      }).success,
    ).toBe(false);
    expect(
      NotebookPlanV2Schema.safeParse({
        ...base,
        operations: [
          {...base.operations[0], action: 'audit', effect: 'READ_ONLY', requiredGate: null},
        ],
      }).success,
    ).toBe(true);
  });

  it('binds the profile to two prompt sources and the 9-layer taxonomy', () => {
    const sourceHierarchy = [
      '00 Control',
      '10 Canon',
      '20 Evidence',
      '30 Templates',
      '50 Assets',
      '60 Operations',
      '70 Pedagogy',
      '40 Golden References',
      '90 Archive',
    ];
    const systemPrompt = {
      schemaVersion: 'notebook-system-prompt-v2',
      profileId: 'metodologia-brand-content-canon-v3',
      version: 'v3.0',
      owner: 'MetodologIA',
      identity: 'MetodologIA Brand Content Studio',
      purpose: 'Create governed brand content',
      audiences: ['operators'],
      capabilities: ['route requests'],
      limits: ['no publication'],
      sourceHierarchy,
      evidenceTaxonomy: ['METODOLOGIA', 'NEUROCIENCIA', 'PEDAGOGIA', 'INFERENCIA', 'SUPUESTO'],
      privacyAndRights: ['approved assets only'],
      studioContract: ['explicit sources'],
      responseContract: ['state next gate'],
      promptInjectionDefense: true,
      inventionForbidden: true,
      bootstrapSource: 'canon/bootstrap.md',
      bootstrapSha256: sha('bootstrap'),
      fullPromptSource: 'canon/system.md',
      fullPromptSha256: sha('system'),
      compiledCharacterLimit: 9500,
      languageRouting: {
        sourceLanguage: 'en',
        detectUserLanguage: true,
        defaultLocale: 'es-419',
        spanishLocale: 'es-419',
        spanishSecondPerson: 'tú',
        noVoseo: true,
        preserveProperNounsAndCitations: true,
      },
      sourceSubsetPolicy: {
        chat: {min: 3, max: 8},
        studio: {min: 4, max: 12},
        audit: {min: 1, max: 20},
        emptySelectionBlocked: true,
        allSourcesBlocked: true,
      },
    };
    const profile = {
      schemaVersion: 'notebook-profile-v2',
      profileId: systemPrompt.profileId,
      displayName: 'MetodologIA · Brand Content Studio · Canon v3',
      provider: 'notebooklm',
      identity: systemPrompt.identity,
      sensitivity: 'PRIVATE',
      systemPrompt,
      taxonomy: sourceHierarchy,
      sourceBudget: {controls: 15, assetsAndExamples: 15, working: 20},
      roles: [
        'Notebook Conductor',
        'Profile Architect',
        'Source Curator',
        'Asset Steward',
        'Studio Director',
        'Grounding Verifier',
        'Notebook Guardian',
      ],
      policies: ['Preserve Canon v2'],
      gates: ['NLM_PLAN_APPROVED'],
    };
    expect(NotebookProfileV2Schema.safeParse(profile).success).toBe(true);
  });
});
