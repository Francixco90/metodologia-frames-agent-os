import {createHash} from 'node:crypto';
import {existsSync, readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import YAML from 'yaml';
import {z} from 'zod';

import {RenderReceiptSchema} from '../../core/contracts/index.ts';
import {
  APPEND_ONLY_MIGRATION_REF,
  appendOnlyEvidenceMigrationSchema,
  verifyAppendOnlyEvidenceMigrationFiles,
} from '../../renderers/remotion/src/append-only-evidence.ts';

const root = process.cwd();
const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/u);
const RelativeRefSchema = z
  .string()
  .min(1)
  .refine(
    (value) =>
      !value.startsWith('/') &&
      !value.includes('..') &&
      !value.includes('\\') &&
      !value.startsWith('file:'),
    'Expected a portable repository-relative path',
  );
const TechnicalStateSchema = z.enum(['IN_PROGRESS', 'BUILD_VALIDATED', 'RENDER_VALIDATED']);
const WorkProductStateSchema = z.strictObject({
  artifact_id: z.string().regex(/^[a-z0-9-]+$/u),
  kind: z.enum(['web', 'video']),
  technical_state: TechnicalStateSchema,
});

const registrySchema = z.strictObject({
  schema_version: z.literal(1),
  registry_id: z.literal('project-registry-v1'),
  mutation_policy: z.literal('append-only-records-and-events'),
  entries: z
    .array(
      z.strictObject({
        project_id: z.string().regex(/^[a-z0-9-]+$/u),
        manifest_ref: RelativeRefSchema,
        source_bundle_ref: RelativeRefSchema,
        claims_ledger_ref: RelativeRefSchema,
        current_state: z.literal('PARTIAL_CONTROLLED'),
        governed_workflow_state: z.literal('BLOCKED_BEFORE_SOURCE_LOCK'),
        technical_validation_state: TechnicalStateSchema,
        work_products: z.array(WorkProductStateSchema).min(2),
        source_locked: z.literal(false),
        guardian_passed: z.literal(false),
        human_approved: z.literal(false),
        ready: z.literal(false),
        published: z.literal(false),
        coverage_gaps: z.array(z.string().min(1)).min(1),
      }),
    )
    .min(1),
});

const projectManifestSchema = z.strictObject({
  schema_version: z.literal(1),
  project_id: z.string().regex(/^[a-z0-9-]+$/u),
  title: z.string().min(1),
  current_state: z.literal('PARTIAL_CONTROLLED'),
  governed_workflow_state: z.literal('BLOCKED_BEFORE_SOURCE_LOCK'),
  technical_validation_state: z.literal('RENDER_VALIDATED'),
  visible_state: z.literal('RENDERED_DRAFT'),
  source_snapshot_id: z.string().min(1),
  source_locked: z.literal(false),
  claims_ledger: RelativeRefSchema,
  work_products: z
    .array(
      WorkProductStateSchema.extend({
        artifact_ref: RelativeRefSchema,
        receipt_ref: RelativeRefSchema,
      }),
    )
    .length(2),
  approvals: z.array(z.unknown()),
  guardian_passed: z.literal(false),
  human_approved: z.literal(false),
  ready: z.literal(false),
  published: z.literal(false),
  coverage_gaps: z.array(z.string().min(1)).min(1),
});

const renderOutputSchema = z.object({
  artifactId: z.literal('REMOTION-VS001'),
  status: z.literal('RENDERED_DRAFT'),
  governedWorkflowState: z.literal('BLOCKED_BEFORE_SOURCE_LOCK'),
  technicalValidationState: z.literal('RENDER_VALIDATED'),
  stateEffect: z.literal('NONE_ON_GOVERNED_WORKFLOW'),
  portableMediaPath: RelativeRefSchema,
  fileSha256: Sha256Schema,
});

const webReceiptSchema = z.object({
  artifact_id: z.string().min(1),
  state: z.literal('RENDERED_DRAFT'),
  output: z.object({
    path: RelativeRefSchema,
    sha256: Sha256Schema,
  }),
  publish_authorized: z.literal(false),
});

const readYaml = (path: string): unknown =>
  YAML.parse(readFileSync(resolve(root, path), 'utf8')) as unknown;
const readJson = (path: string): unknown =>
  JSON.parse(readFileSync(resolve(root, path), 'utf8')) as unknown;
const sha256File = (path: string): string =>
  createHash('sha256')
    .update(readFileSync(resolve(root, path)))
    .digest('hex');

const registry = registrySchema.parse(readYaml('registries/projects/project-registry.yml'));
const errors: string[] = [];
const projectIds = new Set<string>();
const migrationReceipt = appendOnlyEvidenceMigrationSchema.parse(
  readJson(APPEND_ONLY_MIGRATION_REF),
);
verifyAppendOnlyEvidenceMigrationFiles(root, migrationReceipt);

for (const project of registry.entries) {
  if (projectIds.has(project.project_id)) {
    errors.push(`project_id duplicado: ${project.project_id}`);
  }
  projectIds.add(project.project_id);

  for (const ref of [project.manifest_ref, project.source_bundle_ref, project.claims_ledger_ref]) {
    if (!existsSync(resolve(root, ref))) {
      errors.push(`${project.project_id}: referencia inexistente ${ref}`);
    }
  }
  if (errors.length > 0) continue;

  const manifest = projectManifestSchema.parse(readYaml(project.manifest_ref));
  if (
    manifest.project_id !== project.project_id ||
    manifest.current_state !== project.current_state ||
    manifest.governed_workflow_state !== project.governed_workflow_state ||
    manifest.technical_validation_state !== project.technical_validation_state ||
    manifest.source_locked !== project.source_locked ||
    manifest.guardian_passed !== project.guardian_passed ||
    manifest.human_approved !== project.human_approved ||
    manifest.ready !== project.ready ||
    manifest.published !== project.published
  ) {
    errors.push(`${project.project_id}: registry y manifest no comparten estados canónicos`);
  }

  const registryProducts = new Map(
    project.work_products.map((product) => [product.artifact_id, product]),
  );
  for (const product of manifest.work_products) {
    const registered = registryProducts.get(product.artifact_id);
    if (
      registered?.kind !== product.kind ||
      registered.technical_state !== product.technical_state
    ) {
      errors.push(`${project.project_id}: drift en work product ${product.artifact_id}`);
    }
    for (const ref of [product.artifact_ref, product.receipt_ref]) {
      if (!existsSync(resolve(root, ref))) {
        errors.push(`${project.project_id}: evidencia inexistente ${ref}`);
      }
    }
  }

  const video = manifest.work_products.find(({kind}) => kind === 'video');
  const web = manifest.work_products.find(({kind}) => kind === 'web');
  if (video === undefined || web === undefined) {
    errors.push(`${project.project_id}: deben existir work products Web y video`);
    continue;
  }

  const renderOutputPath =
    'projects/vs-001-source-to-campaign/remotion/receipts/render-output.json';
  const renderOutput = renderOutputSchema.parse(readJson(renderOutputPath));
  const renderReceipt = RenderReceiptSchema.parse(readJson(video.receipt_ref));
  if (
    video.receipt_ref !== 'receipts/renders/RCP-REMOTION-VS001-002.json' ||
    renderReceipt.schemaVersion !== 'render-receipt-v2' ||
    renderReceipt.receiptId !== 'RCP-REMOTION-VS001-002' ||
    renderReceipt.supersedes.priorReceiptId !== 'RCP-REMOTION-VS001-001' ||
    renderReceipt.supersedes.priorReceiptRef !== 'receipts/renders/RCP-REMOTION-VS001-001.json' ||
    renderReceipt.supersedes.priorReceiptSha256 !==
      sha256File('receipts/renders/RCP-REMOTION-VS001-001.json') ||
    renderReceipt.supersedes.migrationEventRef !== APPEND_ONLY_MIGRATION_REF ||
    renderReceipt.supersedes.historyWasImmutable !== false ||
    project.technical_validation_state !== 'RENDER_VALIDATED' ||
    video.technical_state !== 'RENDER_VALIDATED' ||
    renderOutput.portableMediaPath !== video.artifact_ref ||
    renderReceipt.output.ref !== video.artifact_ref ||
    renderReceipt.artifactHash !== renderOutput.fileSha256 ||
    renderReceipt.output.sha256 !== renderOutput.fileSha256 ||
    sha256File(video.artifact_ref) !== renderOutput.fileSha256
  ) {
    errors.push(`${project.project_id}: receipt, output y estados de video no son hash-bound`);
  }

  const webReceipt = webReceiptSchema.parse(readJson(web.receipt_ref));
  if (
    web.technical_state !== 'BUILD_VALIDATED' ||
    webReceipt.output.path !== web.artifact_ref ||
    sha256File(web.artifact_ref) !== webReceipt.output.sha256
  ) {
    errors.push(`${project.project_id}: receipt, output y estado Web no son hash-bound`);
  }
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.info(
    `PASS PROJECTS: ${registry.entries.length} expediente reconciliado con receipts Web/Motion; RENDER_VALIDATED técnico y workflow bloqueado antes de SOURCE_LOCKED.`,
  );
}
