import {readFileSync} from 'node:fs';
import {parse} from 'yaml';
import {z} from 'zod';

import {ContentIntentV2Schema} from '../_schema/content-intent-v2.schema.ts';
import type {MultimediaWorkflow} from '../_schema/workflow-v1.schema.ts';
import {hashContentRequestV1} from '../../../../03_artefactos/skills/content-os-router/scripts/content-intent-request.mjs';
import {sha256Text, stableStringify} from './brief-model.ts';

const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/u);

export const MultimediaOutputSelectionV1Schema = z.strictObject({
  schema_version: z.literal('multimedia-output-selection-v1'),
  workflow_id: z.enum(['P00', 'P01', 'P02', 'P03', 'P04', 'P05', 'P06', 'P07', 'P08', 'P09']),
  intent_hash: Sha256Schema,
  work_order_hash: Sha256Schema,
  include_outputs: z.array(z.string().regex(/^[a-z][a-z0-9-]+-v[0-9]+$/u)).max(20),
  canonical_sha256: Sha256Schema,
});

type MultimediaOutputSelectionV1 = z.infer<typeof MultimediaOutputSelectionV1Schema>;

export const MultimediaWorkOrderV1Schema = z.strictObject({
  schema_version: z.literal('multimedia-work-order-v1'),
  work_order_id: z.string().regex(/^WO-[A-Z0-9][A-Z0-9-]{2,79}$/u),
  workflow_id: MultimediaOutputSelectionV1Schema.shape.workflow_id,
  intent_hash: Sha256Schema,
  producer_actor_id: z.string().regex(/^[a-z][a-z0-9-]{2,79}$/u),
  allowed_outputs: z.array(z.string().regex(/^[a-z][a-z0-9-]+-v[0-9]+$/u)).max(20),
  effect_class: z.literal('local_reversible'),
  publication_policy: z.literal('forbidden'),
  canonical_sha256: Sha256Schema,
});
type MultimediaWorkOrderV1 = z.infer<typeof MultimediaWorkOrderV1Schema>;

export type OutputSelectionAuthority = {intentPath?: string; workOrderPath?: string};
export type ResolvedOutputSelection = {
  selected: ReadonlySet<string> | undefined;
  inputs: Array<{artifact: string; ref: string; sha256: string}>;
};

export const calculateOutputSelectionHash = (
  selection: Omit<MultimediaOutputSelectionV1, 'canonical_sha256'>,
): string => sha256Text(stableStringify(selection));
export const calculateMultimediaWorkOrderHash = (
  workOrder: Omit<MultimediaWorkOrderV1, 'canonical_sha256'>,
): string => sha256Text(stableStringify(workOrder));

export const resolveOutputSelection = (
  path: string | undefined,
  workflow: MultimediaWorkflow,
  authority: OutputSelectionAuthority = {},
): ResolvedOutputSelection => {
  const conditional = new Set(
    workflow.outputs.filter(({condition}) => condition).map(({deliverable_id}) => deliverable_id),
  );
  if (!path) {
    if (conditional.size > 0) {
      throw new Error(`MW-OUTPUT-CONDITION001 selection required for ${workflow.workflow_id}`);
    }
    return {selected: undefined, inputs: []};
  }
  if (!authority.intentPath || !authority.workOrderPath) {
    throw new Error('MW-OUTPUT-AUTHORITY001 intent and work order are required');
  }
  const intentText = readFileSync(authority.intentPath, 'utf8');
  const intent = ContentIntentV2Schema.parse(parse(intentText) as unknown);
  const intentHash = sha256Text(intentText);
  if (
    hashContentRequestV1(intent.request) !== intent.request_hash ||
    intent.decision !== 'ROUTED'
  ) {
    throw new Error('MW-OUTPUT-AUTHORITY006 intent integrity or decision mismatch');
  }
  if (intent.effect_class !== 'local_reversible') {
    throw new Error('MW-OUTPUT-AUTHORITY007 intent does not authorize local materialization');
  }
  const workOrderText = readFileSync(authority.workOrderPath, 'utf8');
  const workOrder = MultimediaWorkOrderV1Schema.parse(parse(workOrderText) as unknown);
  const {canonical_sha256: workOrderCanonical, ...unsignedWorkOrder} = workOrder;
  if (calculateMultimediaWorkOrderHash(unsignedWorkOrder) !== workOrderCanonical) {
    throw new Error('MW-OUTPUT-AUTHORITY002 work order hash mismatch');
  }
  const parsed = MultimediaOutputSelectionV1Schema.parse(
    parse(readFileSync(path, 'utf8')) as unknown,
  );
  const {canonical_sha256, ...unsigned} = parsed;
  if (calculateOutputSelectionHash(unsigned) !== canonical_sha256) {
    throw new Error('MW-OUTPUT-SELECTION001 canonical hash mismatch');
  }
  if (parsed.workflow_id !== workflow.workflow_id) {
    throw new Error('MW-OUTPUT-SELECTION002 workflow mismatch');
  }
  const workOrderHash = sha256Text(workOrderText);
  if (
    parsed.intent_hash !== intentHash ||
    parsed.work_order_hash !== workOrderHash ||
    workOrder.intent_hash !== intentHash
  ) {
    throw new Error('MW-OUTPUT-AUTHORITY003 active authority hash mismatch');
  }
  if (
    workOrder.workflow_id !== workflow.workflow_id ||
    !intent.selected_stage_path.includes(workflow.workflow_id)
  ) {
    throw new Error('MW-OUTPUT-AUTHORITY004 workflow is outside active authority');
  }
  const unique = new Set(parsed.include_outputs);
  if (unique.size !== parsed.include_outputs.length) {
    throw new Error('MW-OUTPUT-SELECTION003 duplicate output');
  }
  const unknown = [...unique].filter((id) => !conditional.has(id));
  if (unknown.length > 0) {
    throw new Error(`MW-OUTPUT-SELECTION004 output is not conditional: ${unknown.join(', ')}`);
  }
  const disallowed = [...unique].filter((id) => !workOrder.allowed_outputs.includes(id));
  if (disallowed.length > 0) {
    throw new Error(`MW-OUTPUT-AUTHORITY005 output not allowed: ${disallowed.join(', ')}`);
  }
  const selectionHash = sha256Text(readFileSync(path, 'utf8'));
  return {
    selected: unique,
    inputs: [
      {artifact: 'content-intent-v2', ref: `runtime://intent/${intentHash}`, sha256: intentHash},
      {
        artifact: 'multimedia-work-order-v1',
        ref: `runtime://work-order/${workOrderHash}`,
        sha256: workOrderHash,
      },
      {
        artifact: 'multimedia-output-selection-v1',
        ref: `runtime://output-selection/${selectionHash}`,
        sha256: selectionHash,
      },
    ],
  };
};
