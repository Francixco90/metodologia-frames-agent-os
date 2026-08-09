import {createHash} from 'node:crypto';
import {existsSync, readFileSync} from 'node:fs';
import {parse} from 'yaml';

import {TaskContractSchema} from '../../../core/contracts/index.ts';
import {MultimediaWorkflowSchema} from '../_schema/workflow-v1.schema.ts';
import {MultimediaWorkflowReceiptSchema} from '../../../../05_verificacion/scripts/lib/multimedia-workflow-receipt-schema.ts';
import type {AddCheck, QualityGateContext} from './quality-gate-types.ts';

const ROOT = process.cwd();
const sha256 = (text: string): string => createHash('sha256').update(text).digest('hex');

const parseFrontmatter = (md: string): Record<string, unknown> | null => {
  const match = md.match(/^---\n([\s\S]*?)\n---/u);
  return match?.[1] ? (parse(match[1]) as Record<string, unknown>) : null;
};

/** Schema, evidence and receipt checks MW-Q01..MW-Q05. [CONFIG] */
export const evaluateStaticChecks = (ctx: QualityGateContext, add: AddCheck): void => {
  const workflow = MultimediaWorkflowSchema.safeParse(parse(ctx.workflowRawYaml) as unknown);
  add(
    'MW-Q01',
    workflow.success,
    workflow.success
      ? 'schema-valid'
      : `parse fail: ${workflow.error.issues[0]?.message ?? 'unknown'}`,
  );

  const task = TaskContractSchema.safeParse(
    parse(readFileSync(ctx.taskTemplatePath, 'utf8')) as unknown,
  );
  add(
    'MW-Q02',
    task.success,
    task.success ? 'schema-valid' : `parse fail: ${task.error.issues[0]?.message ?? 'unknown'}`,
  );

  const frontmatter = parseFrontmatter(readFileSync(ctx.promptSpecPath, 'utf8'));
  const tuple =
    frontmatter && typeof frontmatter.evidence_tuple === 'object' && frontmatter.evidence_tuple
      ? (frontmatter.evidence_tuple as Record<string, unknown>)
      : null;
  const missing = ['observado', 'inferido', 'supuesto', 'dato_requerido'].filter(
    (slot) => tuple?.[slot] !== true,
  );
  add(
    'MW-Q03',
    missing.length === 0,
    missing.length === 0
      ? 'evidence_tuple: observado, inferido, supuesto, dato_requerido'
      : `missing slots: ${missing.join(', ')}`,
  );

  if (existsSync(ctx.noRegressionChecklistPath)) {
    const expected = sha256(readFileSync(ctx.noRegressionChecklistPath, 'utf8'));
    const actual = ctx.receiptPayload.no_regression_sha256;
    add('MW-Q04', actual === expected, `expected=${expected}; receipt=${String(actual)}`);
  } else {
    add('MW-Q04', false, 'no-regression-checklist.md not found');
  }

  const receipt = MultimediaWorkflowReceiptSchema.safeParse(ctx.receiptPayload);
  const dirResolvable =
    ctx.receiptDir.length > 0 && (existsSync(ctx.receiptDir) || ctx.receiptDir.startsWith(ROOT));
  add(
    'MW-Q05',
    receipt.success && dirResolvable,
    receipt.success
      ? 'receipt schema-valid; dir resolvable'
      : `receipt schema reject: ${receipt.error.issues[0]?.message ?? 'unknown'}`,
  );
};
