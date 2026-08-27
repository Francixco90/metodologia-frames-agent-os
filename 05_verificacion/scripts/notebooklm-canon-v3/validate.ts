import {statSync} from 'node:fs';
import {resolve} from 'node:path';

import {errorDetail, statSafe, statSafeDirectory, walkFiles} from './io.ts';
import {
  CANON_V3_BOOTSTRAP_CHARACTER_BUDGET,
  CANON_V3_DEFAULT_ROOT,
  CANON_V3_WORD_BUDGET,
  REQUIRED_CONTROL_IDS,
  emptyMetrics,
  type CanonV3ValidationReport,
  type ParsedKnowledgeDocument,
} from './model.ts';
import {
  extractCompiledBootstrap,
  normalizedTokens,
  parseKnowledgeDocument,
  validateKnowledgeDocument,
} from './knowledge.ts';
import {validateSimilarity} from './similarity.ts';
import {validatePromptRegistry} from './prompts.ts';
import {discoverManifestSourceIds, validateSourceManifest} from './manifest.ts';
import {
  validateEmbeddedPlansAndBriefs,
  validateGroundingSuite,
  validateImportPlan,
} from './operations.ts';
import {validateProfile} from './profile.ts';

const resolveManifestRef = (root: string, document: ParsedKnowledgeDocument): string =>
  document.metadata.manifest_ref.startsWith('03_artefactos/')
    ? resolve(process.cwd(), document.metadata.manifest_ref)
    : resolve(root, document.metadata.manifest_ref);

export const validateNotebookLmCanonV3 = (
  inputRoot = CANON_V3_DEFAULT_ROOT,
): CanonV3ValidationReport => {
  const root = resolve(process.cwd(), inputRoot);
  const errors: string[] = [];
  try {
    if (!statSync(root).isDirectory()) throw new Error(`${root} is not a directory.`);
  } catch {
    return {
      valid: false,
      errors: [`Canon v3 root not found: ${inputRoot}`],
      metrics: emptyMetrics(),
    };
  }
  const knowledgeBaseRoot = resolve(root, 'knowledge-base');
  const markdownPaths = statSafeDirectory(knowledgeBaseRoot)
    ? walkFiles(knowledgeBaseRoot).filter((path) => path.endsWith('.md'))
    : [];
  if (markdownPaths.length === 0) errors.push('knowledge-base contains no Markdown documents.');
  const documents: ParsedKnowledgeDocument[] = [];
  for (const path of markdownPaths) {
    try {
      documents.push(parseKnowledgeDocument(root, path));
    } catch (error) {
      errors.push(errorDetail(error));
    }
  }
  const active = documents.filter(({metadata}) => metadata.status === 'ACTIVE');
  const byId = new Map(active.map((document) => [document.metadata.document_id, document]));
  const byPath = new Map(documents.map((document) => [document.relativePath, document]));
  if (byId.size !== active.length) errors.push('ACTIVE document_id values must be unique.');
  for (const id of REQUIRED_CONTROL_IDS)
    if (!byId.has(id)) errors.push(`Missing ACTIVE control document ${id}.`);
  let normalizedWords = 0;
  for (const document of active) {
    normalizedWords += normalizedTokens(document.body).length;
    errors.push(...validateKnowledgeDocument(root, document, byPath));
    for (const relatedId of document.metadata.related_ids)
      if (
        !byId.has(relatedId) &&
        relatedId !== 'prompt.registry.v1' &&
        relatedId !== 'PROMPT-REGISTRY-V1'
      )
        errors.push(`${document.relativePath}: related_id ${relatedId} is not ACTIVE in Canon v3.`);
    if (!statSafe(resolveManifestRef(root, document)))
      errors.push(
        `${document.relativePath}: manifest_ref does not exist (${document.metadata.manifest_ref}).`,
      );
  }
  if (normalizedWords > CANON_V3_WORD_BUDGET)
    errors.push(`Normalized word budget exceeded: ${normalizedWords}/${CANON_V3_WORD_BUDGET}.`);
  let bootstrapCharacters = 0;
  const bootstrap = byId.get('CTRL-BOOTSTRAP-V3');
  if (bootstrap) {
    try {
      bootstrapCharacters = [...extractCompiledBootstrap(bootstrap.relativePath, bootstrap.body)]
        .length;
      if (bootstrapCharacters > CANON_V3_BOOTSTRAP_CHARACTER_BUDGET)
        errors.push(
          `Bootstrap character budget exceeded: ${bootstrapCharacters}/${CANON_V3_BOOTSTRAP_CHARACTER_BUDGET}.`,
        );
    } catch (error) {
      errors.push(errorDetail(error));
    }
  }
  let duplicatePairs: CanonV3ValidationReport['metrics']['duplicatePairs'] = [];
  try {
    const similarity = validateSimilarity(root, active);
    errors.push(...similarity.errors);
    duplicatePairs = similarity.pairs;
  } catch (error) {
    errors.push(errorDetail(error));
  }
  let promptTemplates = 0;
  try {
    const prompts = validatePromptRegistry(root, active, byPath);
    errors.push(...prompts.errors);
    promptTemplates = prompts.templateCount;
  } catch (error) {
    errors.push(errorDetail(error));
  }
  let manifestIds = discoverManifestSourceIds(root);
  let sourceManifestSources = 0;
  try {
    const manifest = validateSourceManifest(root, byPath);
    errors.push(...manifest.errors);
    manifestIds = manifest.sourceIds;
    sourceManifestSources = manifest.sourceCount;
  } catch (error) {
    errors.push(`source-manifest.yml: ${errorDetail(error)}`);
  }
  let importPlanSources = 0;
  try {
    const plan = validateImportPlan(root, manifestIds);
    errors.push(...plan.errors);
    importPlanSources = plan.sourceCount;
  } catch (error) {
    errors.push(`notebook-import-plan-v2.yml: ${errorDetail(error)}`);
  }
  let groundingTests = 0;
  try {
    const suite = validateGroundingSuite(root, manifestIds);
    errors.push(...suite.errors);
    groundingTests = suite.testCount;
  } catch (error) {
    errors.push(`grounding-suite-v1.yml: ${errorDetail(error)}`);
  }
  errors.push(...validateEmbeddedPlansAndBriefs(root, manifestIds));
  try {
    errors.push(...validateProfile(root));
  } catch (error) {
    errors.push(`profile.yml: ${errorDetail(error)}`);
  }
  return {
    valid: errors.length === 0,
    errors,
    metrics: {
      markdownDocuments: markdownPaths.length,
      activeDocuments: active.length,
      promptTemplates,
      normalizedWords,
      bootstrapCharacters,
      duplicatePairs,
      sourceManifestSources,
      importPlanSources,
      groundingTests,
    },
  };
};

export const assertNotebookLmCanonV3 = (root = CANON_V3_DEFAULT_ROOT): CanonV3ValidationReport => {
  const report = validateNotebookLmCanonV3(root);
  if (!report.valid)
    throw new Error(`Canon v3 validation failed:\n- ${report.errors.join('\n- ')}`);
  return report;
};
