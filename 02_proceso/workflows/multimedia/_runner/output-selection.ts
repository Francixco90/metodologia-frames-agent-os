import {readFileSync} from 'node:fs';
import {parse} from 'yaml';
import {z} from 'zod';

import type {MultimediaWorkflow} from '../_schema/workflow-v1.schema.ts';
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

export const calculateOutputSelectionHash = (
  selection: Omit<MultimediaOutputSelectionV1, 'canonical_sha256'>,
): string => sha256Text(stableStringify(selection));

export const resolveOutputSelection = (
  path: string | undefined,
  workflow: MultimediaWorkflow,
): ReadonlySet<string> | undefined => {
  const conditional = new Set(
    workflow.outputs.filter(({condition}) => condition).map(({deliverable_id}) => deliverable_id),
  );
  if (!path) {
    if (conditional.size > 0) {
      throw new Error(`MW-OUTPUT-CONDITION001 selection required for ${workflow.workflow_id}`);
    }
    return undefined;
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
  const unique = new Set(parsed.include_outputs);
  if (unique.size !== parsed.include_outputs.length) {
    throw new Error('MW-OUTPUT-SELECTION003 duplicate output');
  }
  const unknown = [...unique].filter((id) => !conditional.has(id));
  if (unknown.length > 0) {
    throw new Error(`MW-OUTPUT-SELECTION004 output is not conditional: ${unknown.join(', ')}`);
  }
  return unique;
};
