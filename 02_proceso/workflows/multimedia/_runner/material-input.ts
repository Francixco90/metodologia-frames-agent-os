import {readFileSync, realpathSync} from 'node:fs';
import {dirname, isAbsolute, relative, resolve, sep} from 'node:path';
import {parse} from 'yaml';
import {z} from 'zod';

import {ContentIntentV2Schema} from '../_schema/content-intent-v2.schema.ts';
import type {MultimediaWorkflow} from '../_schema/workflow-v1.schema.ts';
import {hashContentRequestV1} from '../../../../03_artefactos/skills/content-os-router/scripts/content-intent-request.mjs';
import {sha256Text, stableStringify} from './brief-model.ts';
import {loadDeliverableDefinitions} from './deliverable-material.ts';
import {parseFramesDeliverableMarkdown} from './deliverable-model.ts';
import {calculateMultimediaWorkOrderHash, MultimediaWorkOrderV1Schema} from './output-selection.ts';

const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/u);
const LocalPathSchema = z
  .string()
  .min(1)
  .max(300)
  .refine((value) => !isAbsolute(value) && !value.split(/[\\/]/u).includes('..'), 'local path');

export const MaterialInputManifestV1Schema = z.strictObject({
  schema_version: z.literal('multimedia-material-input-v1'),
  workflow_id: z.enum(['P00', 'P01', 'P02', 'P03', 'P04', 'P05', 'P06', 'P07', 'P08', 'P09']),
  intent_sha256: Sha256Schema,
  work_order_sha256: Sha256Schema,
  producer_actor_id: z.string().regex(/^[a-z][a-z0-9-]{2,79}$/u),
  outputs: z
    .array(
      z.strictObject({
        deliverable_id: z.string().regex(/^[a-z][a-z0-9-]+-v[0-9]+$/u),
        markdown_path: LocalPathSchema,
        sha256: Sha256Schema,
      }),
    )
    .min(1)
    .max(20),
  canonical_sha256: Sha256Schema,
});

type Manifest = z.infer<typeof MaterialInputManifestV1Schema>;
export type ProducedMaterial = {
  deliverableId: string;
  markdown: string;
  sha256: string;
  actorId: string;
};
export type ResolvedMaterialInput = {
  actorId: string;
  materials: ReadonlyMap<string, ProducedMaterial>;
  inputs: Array<{artifact: string; ref: string; sha256: string}>;
};

export const calculateMaterialManifestHash = (value: Omit<Manifest, 'canonical_sha256'>): string =>
  sha256Text(stableStringify(value));

const assertLocalFile = (manifestPath: string, localPath: string): string => {
  const root = realpathSync(dirname(resolve(manifestPath)));
  const file = realpathSync(resolve(root, localPath));
  const child = relative(root, file);
  if (child === '' || child.startsWith(`..${sep}`) || child === '..' || isAbsolute(child)) {
    throw new Error(`MW-MATERIAL-PATH001 outside manifest directory: ${localPath}`);
  }
  return file;
};

export const resolveMaterialInput = (
  manifestPath: string | undefined,
  workflow: MultimediaWorkflow,
  effectiveOutputIds: readonly string[],
  authority: {intentPath?: string; workOrderPath?: string},
): ResolvedMaterialInput | undefined => {
  if (!manifestPath) return undefined;
  if (!authority.intentPath || !authority.workOrderPath) {
    throw new Error('MW-MATERIAL-AUTHORITY001 intent and work order are required');
  }
  const intentText = readFileSync(authority.intentPath, 'utf8');
  const intent = ContentIntentV2Schema.parse(parse(intentText) as unknown);
  const intentSha = sha256Text(intentText);
  if (
    hashContentRequestV1(intent.request) !== intent.request_hash ||
    intent.decision !== 'ROUTED' ||
    intent.effect_class !== 'local_reversible' ||
    !intent.selected_stage_path.includes(workflow.workflow_id)
  ) {
    throw new Error('MW-MATERIAL-AUTHORITY002 intent does not authorize workflow');
  }
  const workOrderText = readFileSync(authority.workOrderPath, 'utf8');
  const workOrder = MultimediaWorkOrderV1Schema.parse(parse(workOrderText) as unknown);
  const {canonical_sha256: workOrderCanonical, ...unsignedWorkOrder} = workOrder;
  const workOrderSha = sha256Text(workOrderText);
  if (
    calculateMultimediaWorkOrderHash(unsignedWorkOrder) !== workOrderCanonical ||
    workOrder.intent_hash !== intentSha ||
    workOrder.workflow_id !== workflow.workflow_id
  ) {
    throw new Error('MW-MATERIAL-AUTHORITY003 work order integrity mismatch');
  }
  const manifestText = readFileSync(manifestPath, 'utf8');
  const manifest = MaterialInputManifestV1Schema.parse(parse(manifestText) as unknown);
  const {canonical_sha256, ...unsignedManifest} = manifest;
  if (
    calculateMaterialManifestHash(unsignedManifest) !== canonical_sha256 ||
    manifest.intent_sha256 !== intentSha ||
    manifest.work_order_sha256 !== workOrderSha ||
    manifest.workflow_id !== workflow.workflow_id
  ) {
    throw new Error('MW-MATERIAL-AUTHORITY004 manifest hash or authority mismatch');
  }
  const expected = new Set(effectiveOutputIds);
  const supplied = new Set(manifest.outputs.map(({deliverable_id}) => deliverable_id));
  if (
    supplied.size !== manifest.outputs.length ||
    supplied.size !== expected.size ||
    [...supplied].some((id) => !expected.has(id) || !workOrder.allowed_outputs.includes(id))
  ) {
    throw new Error('MW-MATERIAL-OUTPUT001 manifest outputs exceed or omit effective authority');
  }
  const materials = new Map<string, ProducedMaterial>();
  const definitions = loadDeliverableDefinitions(process.cwd());
  const inputs: ResolvedMaterialInput['inputs'] = [
    {artifact: 'content-intent-v2', ref: `runtime://intent/${intentSha}`, sha256: intentSha},
    {
      artifact: 'multimedia-work-order-v1',
      ref: `runtime://work-order/${workOrderSha}`,
      sha256: workOrderSha,
    },
    {
      artifact: 'material-input-manifest-v1',
      ref: `runtime://material-manifest/${sha256Text(manifestText)}`,
      sha256: sha256Text(manifestText),
    },
  ];
  for (const item of manifest.outputs) {
    const sourcePath = assertLocalFile(manifestPath, item.markdown_path);
    const markdown = readFileSync(sourcePath, 'utf8');
    if (sha256Text(markdown) !== item.sha256)
      throw new Error('MW-MATERIAL-HASH001 source mismatch');
    const model = parseFramesDeliverableMarkdown(markdown).frontmatter;
    const definition = definitions.get(item.deliverable_id);
    const fields = new Set(model.fields.map(({field_id}) => field_id));
    if (
      definition === undefined ||
      model.workflow_id !== workflow.workflow_id ||
      model.deliverable_id !== item.deliverable_id ||
      model.state !== 'RENDERED_DRAFT' ||
      model.fields.some(({status}) => status === 'unknown') ||
      definition.required_fields.some((field) => !fields.has(field)) ||
      model.next_gate !== definition.acceptance_gate
    ) {
      throw new Error(`MW-MATERIAL-EVIDENCE001 unresolved ${item.deliverable_id}`);
    }
    materials.set(item.deliverable_id, {
      deliverableId: item.deliverable_id,
      markdown,
      sha256: item.sha256,
      actorId: manifest.producer_actor_id,
    });
    inputs.push({
      artifact: item.deliverable_id,
      ref: `runtime://material/${item.sha256}`,
      sha256: item.sha256,
    });
  }
  return {actorId: manifest.producer_actor_id, materials, inputs};
};
