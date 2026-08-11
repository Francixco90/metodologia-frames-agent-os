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
import {
  projectManifestSchema,
  registrySchema,
  RelativeRefSchema,
  Sha256Schema,
  validateProductParity,
} from './lib/project-validation.ts';
import {validateGovernedSourceLineage} from './lib/source-lineage-validation.ts';

const root = process.cwd();

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
  if (
    manifest.source_bundle !== undefined &&
    manifest.source_bundle !== project.source_bundle_ref
  ) {
    errors.push(`${project.project_id}: source_bundle_ref diverge del manifest`);
  }
  if (manifest.claims_ledger !== project.claims_ledger_ref) {
    errors.push(`${project.project_id}: claims_ledger_ref diverge del manifest`);
  }

  errors.push(
    ...validateProductParity(project.project_id, project.work_products, manifest.work_products),
  );
  for (const product of manifest.work_products) {
    if (product.technical_state === 'IN_PROGRESS') {
      if (!product.planned_ref?.startsWith(`projects/${project.project_id}/`)) {
        errors.push(
          `${project.project_id}: planned_ref fuera del expediente ${product.artifact_id}`,
        );
      }
      continue;
    }
    for (const ref of [product.artifact_ref, product.receipt_ref]) {
      if (ref === undefined || !existsSync(resolve(root, ref))) {
        errors.push(`${project.project_id}: evidencia inexistente ${ref}`);
      }
    }
  }

  if (project.project_id !== 'vs-001-source-to-campaign') {
    errors.push(
      ...validateGovernedSourceLineage({
        projectId: project.project_id,
        snapshotId: manifest.source_snapshot_id,
        sourceLocked: manifest.source_locked,
        bundle: readYaml(project.source_bundle_ref),
        ledger: readYaml(project.claims_ledger_ref),
      }).map((message) => `${project.project_id}: ${message}`),
    );
    if (manifest.work_products.some(({technical_state}) => technical_state !== 'IN_PROGRESS')) {
      errors.push(
        `${project.project_id}: validación genérica de receipts pendiente; conservar IN_PROGRESS`,
      );
    }
    continue;
  }

  const video = manifest.work_products.find(({kind}) => kind === 'video');
  const web = manifest.work_products.find(({kind}) => kind === 'web');
  if (video === undefined || web === undefined) {
    errors.push(`${project.project_id}: deben existir work products Web y video`);
    continue;
  }
  if (
    video.artifact_ref === undefined ||
    video.receipt_ref === undefined ||
    web.artifact_ref === undefined ||
    web.receipt_ref === undefined
  ) {
    errors.push(`${project.project_id}: productos validados requieren artifact_ref y receipt_ref`);
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
    `PASS PROJECTS: ${registry.entries.length} expedientes reconciliados; productos planificados permanecen IN_PROGRESS y evidencia materializada queda hash-bound.`,
  );
}
