import {createHash} from 'node:crypto';
import {existsSync, readFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {parse} from 'yaml';
import {z} from 'zod';

import {
  NotebookProfileV1Schema,
  NotebookSourceManifestV1Schema,
  StudioBriefV1Schema,
} from '../../02_proceso/core/contracts/index.ts';

const root = process.cwd();
const readYaml = (path: string): unknown =>
  parse(readFileSync(resolve(root, path), 'utf8')) as unknown;
const projectRoot = '03_artefactos/projects/notebooklm-os/metodologia-brand-content';

NotebookProfileV1Schema.parse(readYaml(`${projectRoot}/profile.yml`));
const pack = z
  .strictObject({
    schema_version: z.literal('notebook-source-pack-v1'),
    profile_id: z.literal('metodologia-brand-content-canon-v1'),
    sources: z.array(NotebookSourceManifestV1Schema).min(1).max(50),
    coverage_gaps: z.array(z.string()).min(1),
  })
  .parse(readYaml(`${projectRoot}/source-manifest.yml`));
const assetReview = z
  .object({
    schema_version: z.literal('notebook-asset-review-v2'),
    audit: z.object({
      private_locators_persisted: z.literal(false),
      identity_rule: z.literal('content_sha256_not_filename'),
    }),
    assets: z
      .array(
        z
          .object({
            asset_id: z.string().min(1),
            category: z.string().min(1),
            content_sha256: z.string().regex(/^[a-f0-9]{64}$/u),
            private_locator_digest: z.string().regex(/^[a-f0-9]{64}$/u),
            rights: z.enum(['APPROVED', 'REVIEW', 'FIRST_PARTY_CANDIDATE']),
            status: z.enum(['APPROVED', 'REVIEW', 'READY_FOR_HUMAN_APPROVAL', 'DO_NOT_USE_FINAL']),
            allowed_uses: z.array(z.string()),
            blockers: z.array(z.string()),
          })
          .passthrough(),
      )
      .min(1),
  })
  .passthrough()
  .parse(readYaml(`${projectRoot}/asset-review.yml`));
if (JSON.stringify(assetReview).includes('/Users/')) {
  throw new Error('Asset review leaks a private local locator.');
}
const approved = assetReview.assets.filter(({status}) => status === 'APPROVED');
if (
  approved.length !== 1 ||
  approved[0]?.asset_id !== 'AST-PORTRAIT-JAVIER-MONTANO' ||
  approved[0].rights !== 'APPROVED'
) {
  throw new Error('Only the rights-backed Javier portrait may be APPROVED.');
}
const reviewPortraits = assetReview.assets.filter(
  ({asset_id, status}) => asset_id.startsWith('AST-PORTRAIT-') && status === 'REVIEW',
);
if (reviewPortraits.length !== 3 || reviewPortraits.some(({allowed_uses}) => allowed_uses.length)) {
  throw new Error(
    'Katherine, Daniel and German portraits must remain REVIEW with no allowed uses.',
  );
}
const vectorMasters = assetReview.assets.filter(({asset_id}) =>
  [
    'AST-METODOLOGIA-SYMBOL-SVG',
    'AST-METODOLOGIA-LOCKUP-POSITIVE-SVG',
    'AST-METODOLOGIA-LOCKUP-REVERSE-SVG',
  ].includes(asset_id),
);
if (
  vectorMasters.length !== 3 ||
  vectorMasters.some(({status}) => status !== 'READY_FOR_HUMAN_APPROVAL')
) {
  throw new Error('The vector logo family must remain candidate-only until human approval.');
}
for (const source of pack.sources) {
  if (!source.sourceRef) continue;
  const currentSha = createHash('sha256')
    .update(readFileSync(resolve(root, source.sourceRef)))
    .digest('hex');
  if (source.contentSha256 !== currentSha) {
    throw new Error(`${source.sourceId}: local source content hash drifted.`);
  }
}
const gallery = z
  .object({
    schema_version: z.literal('notebook-art-gallery-v1'),
    state: z.enum(['LOCAL_READY_GATE_PENDING', 'IMPORTED_PRIVATE_VERIFIED']),
    generated_art: z.literal(false),
    rights: z.literal('INTERNAL_REFERENCE_ONLY'),
    import_gate: z.literal('NLM_PLAN_APPROVED'),
    items: z
      .array(
        z
          .object({
            asset_id: z.string().min(1),
            source_id: z.string().min(1),
            source_page: z.number().int().positive(),
            file: z.string().regex(/^gallery\/original-art\/[a-z0-9-]+\.jpg$/u),
            content_sha256: z.string().regex(/^[a-f0-9]{64}$/u),
            status: z.enum(['READY_FOR_IMPORT', 'IMPORTED_PRIVATE']),
          })
          .passthrough(),
      )
      .length(8),
  })
  .passthrough()
  .parse(readYaml(`${projectRoot}/gallery/catalog.yml`));
for (const item of gallery.items) {
  const currentSha = createHash('sha256')
    .update(readFileSync(resolve(root, projectRoot, item.file)))
    .digest('hex');
  if (currentSha !== item.content_sha256) throw new Error(`${item.asset_id}: image hash drifted.`);
}
const galleryPack = z
  .object({
    schema_version: z.literal('notebook-gallery-source-pack-v1'),
    projection: z.enum(['satellite_notebook', 'integrated_in_brand_content_notebook']),
    state: z.enum(['LOCAL_READY_GATE_PENDING', 'IMPORTED_PRIVATE_VERIFIED']),
    external_import_executed: z.boolean(),
    import_gate: z.literal('NLM_PLAN_APPROVED'),
    summary: z.object({
      masterclasses: z.literal(14),
      playbooks: z.literal(7),
      pdfs: z.literal(21),
      pages: z.literal(493),
      bytes: z.literal(84736081),
    }),
    sources: z
      .array(
        z
          .object({
            source_id: z.string().min(1),
            kind: z.enum(['masterclass', 'playbook']),
            pages: z.number().int().positive(),
            bytes: z.number().int().positive(),
            content_sha256: z.string().regex(/^[a-f0-9]{64}$/u),
            private_locator_digest: z.string().regex(/^[a-f0-9]{64}$/u),
            status: z.literal('READY_FOR_IMPORT'),
          })
          .passthrough(),
      )
      .length(21),
  })
  .passthrough()
  .parse(readYaml(`${projectRoot}/source-packs/masterclass-playbooks-v1.yml`));
if (JSON.stringify(galleryPack).includes('/Users/')) {
  throw new Error('Gallery source pack leaks a private local locator.');
}
if (new Set(galleryPack.sources.map(({content_sha256: sha}) => sha)).size !== 21) {
  throw new Error('Gallery source pack contains duplicate PDF content.');
}
if (
  galleryPack.sources.reduce((total, {pages}) => total + pages, 0) !== 493 ||
  galleryPack.sources.reduce((total, {bytes}) => total + bytes, 0) !== 84736081
) {
  throw new Error('Gallery source pack totals drifted.');
}
const briefs = z
  .strictObject({
    schema_version: z.literal('studio-brief-pack-v1'),
    profile_id: z.literal('metodologia-brand-content-canon-v1'),
    briefs: z.array(StudioBriefV1Schema).length(9),
  })
  .parse(readYaml(`${projectRoot}/studio-briefs.yml`));

const types = new Set(briefs.briefs.map(({type}) => type));
if (types.size !== 9) throw new Error('Studio brief pack must contain nine distinct types.');
const knownSources = new Set(pack.sources.map(({sourceId}) => sourceId));
for (const brief of briefs.briefs) {
  for (const sourceId of brief.sourceIds) {
    if (!knownSources.has(sourceId))
      throw new Error(`${brief.briefId}: unknown source ${sourceId}`);
  }
}

const commandManifest = readYaml('02_proceso/workflows/notebooklm-os/commands.yml') as {
  aliases?: Record<string, unknown>;
};
const requiredAliases = [
  'init',
  'audit',
  'create',
  'curate',
  'studio',
  'verify',
  'sync',
  'share',
  'status',
  'evolve',
];
if (
  JSON.stringify(Object.keys(commandManifest.aliases ?? {})) !== JSON.stringify(requiredAliases)
) {
  throw new Error('NotebookLM OS aliases are incomplete or reordered.');
}

const grounding = readYaml(`${projectRoot}/grounding-suite.yml`) as {
  queries?: Array<{id?: string; source_ids?: string[]}>;
};
const queryIds = grounding.queries?.map(({id}) => id) ?? [];
if (
  JSON.stringify(queryIds) !==
  JSON.stringify([
    'identity',
    'voice',
    'logo',
    'founders',
    'templates',
    'claims',
    'content-guidelines',
  ])
) {
  throw new Error('Canonical grounding suite is incomplete.');
}
if (grounding.queries?.some(({source_ids: sourceIds}) => (sourceIds?.length ?? 0) === 0)) {
  throw new Error('Every canonical grounding query requires explicit source_ids.');
}

const skillIds = [
  'notebooklm-os-router',
  'notebooklm-profile-compiler',
  'notebooklm-source-curator',
  'notebooklm-naming-taxonomy',
  'notebooklm-system-prompt',
  'notebooklm-studio-director',
  'notebooklm-artifact-verifier',
  'notebooklm-sharing-guardian',
];
for (const skillId of skillIds) {
  if (!existsSync(resolve(root, `03_artefactos/skills/${skillId}/SKILL.md`))) {
    throw new Error(`Missing skill ${skillId}`);
  }
}

const managed = readFileSync(
  resolve(root, '03_artefactos/adapters/notebooklm-managed/contract.yml'),
  'utf8',
);
for (const gate of [
  'NLM_PLAN_APPROVED',
  'NLM_SYNC_APPROVED',
  'NLM_STUDIO_GENERATION_APPROVED',
  'NLM_SHARE_AUTHORIZED',
  'NLM_DESTRUCTIVE_AUTHORIZED',
]) {
  if (!managed.includes(gate)) throw new Error(`Managed adapter does not declare ${gate}`);
}
const stageFixtures = readYaml('05_verificacion/fixtures/notebooklm-os/stages.yml') as {
  stages?: Record<string, unknown>;
};
const expectedStages = Array.from({length: 10}, (_, index) => `N${String(index).padStart(2, '0')}`);
if (JSON.stringify(Object.keys(stageFixtures.stages ?? {})) !== JSON.stringify(expectedStages)) {
  throw new Error('N00-N09 positive/negative fixture coverage is incomplete.');
}
const readonly = readFileSync(
  resolve(root, '03_artefactos/adapters/notebooklm/contract.yml'),
  'utf8',
);
if (
  !readonly.includes('adapter_id: notebooklm-grounding-readonly-v1') ||
  !readonly.includes('mode: read_only')
) {
  throw new Error('Readonly adapter contract drifted.');
}

console.info(
  `NotebookLM OS PASS: ${pack.sources.length} sources, ${briefs.briefs.length} Studio briefs, ${skillIds.length} skills.`,
);
