import {mkdirSync, mkdtempSync, readFileSync, writeFileSync} from 'node:fs';
import {relative, resolve} from 'node:path';

import {stringify as stringifyYaml} from 'yaml';

import {allTemplates, metadata, registry, sha} from './support.ts';

const sections = [
  'abstract',
  'navigation',
  'routing',
  'knowledge',
  'evidence',
  'decisions',
  'assumptions',
  'limits',
  'edge_cases',
  'acceptance',
  'related_documents',
  'change_log',
];

export const createValidFixture = (temporaryRoots: string[]): string => {
  const root = mkdtempSync(resolve(process.cwd(), '.tmp-canon-v3-'));
  temporaryRoots.push(root);
  for (const directory of [
    'knowledge-base/00-control',
    'knowledge-base/30-templates/studio',
    'knowledge-base/30-templates/channels',
    'prompt-system',
  ]) {
    mkdirSync(resolve(root, directory), {recursive: true});
  }

  const documentPaths: string[] = [];
  const writeDocument = (
    path: string,
    frontMatter: Record<string, unknown>,
    seed: string,
    knowledgeExtra = '',
  ) => {
    const body = `<kb_document>\n${sections
      .map(
        (section, index) =>
          `<${section}>\n${seed}word${index}${
            section === 'knowledge' ? `\n${knowledgeExtra}` : ''
          }\n</${section}>`,
      )
      .join('\n')}\n</kb_document>\n`;
    writeFileSync(path, `---\n${stringifyYaml(frontMatter)}---\n${body}`);
    documentPaths.push(path);
  };

  const controlIds = [
    'CTRL-KNOWLEDGE-MAP-V3',
    'CTRL-AUTHORITY-ROUTER-V3',
    'CTRL-SYSTEM-PROMPT-V3',
    'CTRL-BOOTSTRAP-V3',
    'CTRL-KB-STANDARD-V3',
  ];
  controlIds.forEach((documentId, index) => {
    writeDocument(
      resolve(root, `knowledge-base/00-control/control-${index}.md`),
      metadata({document_id: documentId, title: documentId}),
      `control${index}`,
      index === 3
        ? '<notebook_bootstrap version="3.0"><identity>fixture identity</identity></notebook_bootstrap>'
        : '',
    );
  });

  const templates = allTemplates();
  templates.forEach((item, index) => {
    writeDocument(
      resolve(root, 'prompt-system', item.markdownRef),
      metadata({
        document_id: `PROMPT-${index}`,
        title: item.title,
        authority: 'TEMPLATE',
        layer: '30 Templates',
        json_registry_ref: `prompt-system/prompt-registry.json#${item.jsonPointer}`,
        json_pointer: item.jsonPointer,
      }),
      `template${index}`,
    );
  });
  writeFileSync(resolve(root, 'prompt-system/prompt-registry.json'), JSON.stringify(registry()));

  const manifestSources = documentPaths.map((path, index) => ({
    source_id: `NLS-FIXTURE-${String(index + 1).padStart(3, '0')}`,
    name: `fixture-source-${String(index + 1).padStart(3, '0')}`,
    title: `Fixture source ${index + 1}`,
    layer: index < 5 ? '00 Control' : '30 Templates',
    authority: index < 5 ? 'CONTROL' : 'TEMPLATE',
    source_type: 'markdown',
    tags: ['fixture'],
    audiences: ['verifier'],
    language: 'en',
    response_locales: ['en', 'es-419'],
    rights: 'APPROVED',
    status: 'ACTIVE',
    valid_from: '2026-08-26',
    valid_until: null,
    content_sha256: sha(readFileSync(path, 'utf8')),
    portable_identity_digest: sha(readFileSync(path, 'utf8')),
    source_ref: relative(process.cwd(), path),
    source_refs: [],
    notebook_role: 'fixture validation',
  }));
  writeFileSync(
    resolve(root, 'source-manifest.yml'),
    stringifyYaml({
      schema_version: 'notebook-source-pack-v3',
      profile_id: 'metodologia-brand-content-canon-v3',
      display_name: 'MetodologIA · Brand Content Studio · Canon v3',
      state: 'PLANNED_LOCAL',
      generated_by: 'unit-fixture',
      locator_policy: {
        private_locators_persisted: false,
        runtime_resolution: 'repository-relative-path-plus-content-sha256',
      },
      authority_policy: {
        markdown_governs: true,
        pdf_and_images_inspire: true,
        asset_authority_has_veto: true,
        all_sources_blocked: true,
      },
      excluded_packs: [
        {pack_id: 'benchmark-ia-regional-global-v4', reason: 'Excluded working pack'},
      ],
      summary: {
        markdown: manifestSources.length,
        historical_pdfs: 0,
        current_pdfs: 0,
        images: 0,
        total: manifestSources.length,
      },
      sources: manifestSources,
    }),
  );

  const manifestSourceIds = manifestSources.map(({source_id: sourceId}) => sourceId);
  const importBatches = [manifestSourceIds.slice(0, 20), manifestSourceIds.slice(20)];
  writeFileSync(
    resolve(root, 'notebook-import-plan-v2.yml'),
    stringifyYaml({
      schemaVersion: 'notebook-plan-v2',
      planId: 'fixture-canon-v3-materialization',
      profileId: 'metodologia-brand-content-canon-v3',
      provider: 'notebooklm',
      targetNotebookDigest: null,
      targetNotebookTitle: 'MetodologIA · Brand Content Studio · Canon v3',
      visibility: 'private',
      idempotencyKey: 'fixture-canon-v3-create',
      operations: [
        {
          operationId: 'fixture-audit',
          stage: 'N01',
          action: 'audit',
          sourceIds: [],
          requiredGate: null,
          effect: 'READ_ONLY',
        },
        {
          operationId: 'fixture-create',
          stage: 'N04',
          action: 'create',
          sourceIds: [],
          requiredGate: 'NLM_PLAN_APPROVED',
          effect: 'EXTERNAL_MUTATION',
        },
        ...importBatches.map((batch, index) => ({
          operationId: `fixture-curate-${index + 1}`,
          stage: 'N05',
          action: 'curate',
          sourceIds: batch,
          requiredGate: 'NLM_PLAN_APPROVED',
          effect: 'EXTERNAL_MUTATION',
        })),
      ],
      sourceIds: manifestSourceIds,
      activeSourceIds: manifestSourceIds.slice(0, 4),
      sourcePacks: importBatches.map((batch, index) => ({
        batchId: `fixture-batch-${index + 1}`,
        sourcePackId: 'fixture-canon-v3',
        sourceIds: batch,
        purpose: `Fixture import batch ${index + 1}`,
      })),
      permissions: ['Private materialization only'],
      stopRules: ['Stop without approval'],
      rollback: ['Preserve the previous notebook'],
    }),
  );
  writeFileSync(
    resolve(root, 'grounding-suite-v1.yml'),
    stringifyYaml({
      schema_version: 'notebook-grounding-suite-v1',
      suite_id: 'fixture-canon-v3-grounding',
      profile_id: 'metodologia-brand-content-canon-v3',
      execution_state: 'BLOCKED_PENDING_NLM_PLAN_APPROVED',
      selection_policy: {min_sources: 3, max_sources: 8, all_sources_blocked: true},
      tests: Array.from({length: 7}, (_, index) => ({
        test_id: `GROUND-FIXTURE-${index + 1}`,
        locale: index % 2 === 0 ? 'en' : 'es-419',
        query: `Fixture grounding query ${index + 1}`,
        source_ids: manifestSourceIds.slice(index % 2, (index % 2) + 3),
        expects: ['Grounded response'],
      })),
    }),
  );

  writeProfile(root);
  return root;
};

const writeProfile = (root: string): void => {
  const bootstrapPath = resolve(root, 'knowledge-base/00-control/control-3.md');
  const fullPromptPath = resolve(root, 'knowledge-base/00-control/control-2.md');
  const bootstrapContent = readFileSync(bootstrapPath, 'utf8');
  const compiledBootstrap = bootstrapContent.match(
    /<notebook_bootstrap(?:\s[^>]*)?>[\s\S]*?<\/notebook_bootstrap>/u,
  )![0];
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
    sourceHierarchy: [
      '00 Control',
      '10 Canon',
      '20 Evidence',
      '30 Templates',
      '50 Assets',
      '60 Operations',
      '70 Pedagogy',
      '40 Golden References',
      '90 Archive',
    ],
    evidenceTaxonomy: ['METODOLOGIA', 'NEUROCIENCIA', 'PEDAGOGIA', 'INFERENCIA', 'SUPUESTO'],
    privacyAndRights: ['approved assets only'],
    studioContract: ['explicit sources'],
    responseContract: ['state next gate'],
    promptInjectionDefense: true,
    inventionForbidden: true,
    bootstrapSource: relative(process.cwd(), bootstrapPath),
    bootstrapSha256: sha(compiledBootstrap),
    fullPromptSource: relative(process.cwd(), fullPromptPath),
    fullPromptSha256: sha(readFileSync(fullPromptPath, 'utf8')),
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
  writeFileSync(
    resolve(root, 'profile.yml'),
    stringifyYaml({
      schemaVersion: 'notebook-profile-v2',
      profileId: systemPrompt.profileId,
      displayName: 'MetodologIA · Brand Content Studio · Canon v3',
      provider: 'notebooklm',
      identity: systemPrompt.identity,
      sensitivity: 'PRIVATE',
      systemPrompt,
      taxonomy: systemPrompt.sourceHierarchy,
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
    }),
  );
};
