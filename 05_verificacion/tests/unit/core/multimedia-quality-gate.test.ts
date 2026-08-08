/**
 * Unit tests for the multimedia quality gate evaluator (`evaluateQualityGate`).
 *
 * Builds a synthetic context from the REAL P00 workflow dir so the test is
 * grounded in the actual repo, not a mock. Covers the fail-closed contract:
 * P00 passes; tampering the work_product_state to a terminal human state
 * fails MW-Q07; pointing an input at a non-existent path fails MW-Q06.
 *
 * Source: plan D5 (reliability assets). [DOC]
 */
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {parse} from 'yaml';
import {describe, expect, it} from 'vitest';

import {MultimediaWorkflowSchema} from 'workflows/multimedia/_schema/workflow-v1.schema.ts';
import {
  evaluateQualityGate,
  type QualityGateContext,
} from 'workflows/multimedia/_runner/quality-gate.ts';

const ROOT = process.cwd();
const MULTIMEDIA = resolve(ROOT, '02_proceso/workflows/multimedia');
const P00_DIR = resolve(MULTIMEDIA, 'p00-definir-sistema');

const p00WorkflowRaw = readFileSync(resolve(P00_DIR, 'workflow.yml'), 'utf8');
const p00Workflow = MultimediaWorkflowSchema.parse(parse(p00WorkflowRaw) as unknown);
const noRegressionChecklistPath = resolve(MULTIMEDIA, '_assets', 'no-regression-checklist.md');
const noRegressionSha = createHash('sha256')
  .update(readFileSync(noRegressionChecklistPath, 'utf8'))
  .digest('hex');

const outputResolutions = p00Workflow.outputs.map((output, index) => ({
  ref: `03_artefactos/content/multimedia/p00-definir-sistema/output-${index + 1}.yml`,
  resolved: resolve(ROOT, `.tmp/multimedia/P00/output-${index + 1}.yml`),
  exists: true,
  sha256: `${index + 4}`.repeat(64),
}));

/** Build the P00 receipt payload the runner would emit (schema-valid). */
const buildP00Receipt = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  schema_version: 'multimedia-workflow-receipt-v1',
  workflow_id: 'P00',
  command: '/definir-sistema',
  mode: 'perfil-verificable',
  inputs: [
    {
      artifact: 'workflow.yml',
      ref: '02_proceso/workflows/multimedia/p00-definir-sistema/workflow.yml',
      sha256: 'a'.repeat(64),
    },
    {
      artifact: 'prompt-spec.md',
      ref: '02_proceso/workflows/multimedia/p00-definir-sistema/prompt-spec.md',
      sha256: 'b'.repeat(64),
    },
    {
      artifact: 'task-template.yaml',
      ref: '02_proceso/workflows/multimedia/p00-definir-sistema/task-template.yaml',
      sha256: 'c'.repeat(64),
    },
  ],
  outputs: p00Workflow.outputs.map((output, index) => ({
    artifact: output.artifact,
    ref: outputResolutions[index]?.ref,
    sha256: outputResolutions[index]?.sha256,
    required: output.required,
    materialized: true,
  })),
  work_product_state_from: 'INTAKE',
  work_product_state_to: 'DEFINED',
  gate: 'G13',
  actor: 'qa',
  ran_at: '2026-08-05T00:00:00+00:00',
  append_only: true,
  human_approved: false,
  dry_run: false,
  no_regression_sha256: noRegressionSha,
  evidence_tags: ['[CONFIG]'],
  scope: {
    workflow_id: 'P00',
    mode: 'perfil-verificable',
    effect_class: 'local_reversible',
  },
  coverage_gaps: [],
  ...overrides,
});

const buildP00Context = (overrides: Partial<QualityGateContext> = {}): QualityGateContext => ({
  workflowId: 'P00',
  workflowDir: P00_DIR,
  workflowRawYaml: p00WorkflowRaw,
  workflowParsed: p00Workflow,
  taskTemplatePath: resolve(P00_DIR, 'task-template.yaml'),
  promptSpecPath: resolve(P00_DIR, 'prompt-spec.md'),
  noRegressionChecklistPath,
  receiptPayload: buildP00Receipt(),
  receiptDir: resolve(ROOT, '04_estado/receipts/workflows', 'WF-P00', '2026-08-05T00-00-00-00-00'),
  inputResolutions: [],
  outputResolutions,
  autoAdvance: false,
  ...overrides,
});

describe('evaluateQualityGate', () => {
  it('case 1: P00 context passes the gate (root, schemas valid, tuple present)', () => {
    const result = evaluateQualityGate(buildP00Context());
    expect(result.passed).toBe(true);
    expect(result.failures).toHaveLength(0);
    expect(result.checks).toHaveLength(10);
    // MW-Q03 slot names are the Spanish lowercase evidence_tuple keys.
    const q03 = result.checks.find((c) => c.id === 'MW-Q03');
    expect(q03?.passed).toBe(true);
    expect(q03?.detail).toContain('observado');
    expect(q03?.detail).toContain('inferido');
    expect(q03?.detail).toContain('supuesto');
    expect(q03?.detail).toContain('dato_requerido');
    // MW-Q06 root exemption.
    const q06 = result.checks.find((c) => c.id === 'MW-Q06');
    expect(q06?.passed).toBe(true);
    expect(q06?.detail).toContain('root exempt');
    expect(result.checks.find((c) => c.id === 'MW-Q04')?.passed).toBe(true);
    expect(result.checks.find((c) => c.id === 'MW-Q08')?.passed).toBe(true);
    expect(result.checks.find((c) => c.id === 'MW-Q10')?.passed).toBe(true);
  });

  it('case 2: tampering work_product_state to HUMAN_APPROVED fails MW-Q07', () => {
    const tamperedWorkflow = {...p00Workflow, work_product_state: 'HUMAN_APPROVED' as never};
    const ctx = buildP00Context({
      workflowParsed: tamperedWorkflow,
      receiptPayload: buildP00Receipt({work_product_state_to: 'HUMAN_APPROVED'}),
    });
    const result = evaluateQualityGate(ctx);
    expect(result.passed).toBe(false);
    const q07 = result.checks.find((c) => c.id === 'MW-Q07');
    expect(q07?.passed).toBe(false);
    expect(q07?.detail).toContain('terminal human state');
    expect(result.failures.some((f) => f.startsWith('MW-Q07'))).toBe(true);
  });

  it('case 3: a non-existent prior input fails MW-Q06', () => {
    const tamperedWorkflow = {...p00Workflow, inputs: ['p99-nonexistent/missing.yml'] as never};
    const ctx = buildP00Context({
      workflowParsed: tamperedWorkflow,
      inputResolutions: [
        {
          input: 'p99-nonexistent/missing.yml',
          resolved: resolve(MULTIMEDIA, 'p99-nonexistent/missing.yml'),
          exists: false,
        },
      ],
    });
    const result = evaluateQualityGate(ctx);
    expect(result.passed).toBe(false);
    const q06 = result.checks.find((c) => c.id === 'MW-Q06');
    expect(q06?.passed).toBe(false);
    expect(q06?.detail).toContain('missing input');
    expect(result.failures.some((f) => f.startsWith('MW-Q06'))).toBe(true);
  });

  it('case 4: a malformed receipt payload fails MW-Q05', () => {
    const ctx = buildP00Context({
      receiptPayload: {schema_version: 'not-a-receipt'},
    });
    const result = evaluateQualityGate(ctx);
    expect(result.passed).toBe(false);
    const q05 = result.checks.find((c) => c.id === 'MW-Q05');
    expect(q05?.passed).toBe(false);
    expect(q05?.detail).toContain('receipt schema reject');
  });

  it('case 5: autoAdvance=true with a manual gate (G13) fails MW-Q09', () => {
    const ctx = buildP00Context({autoAdvance: true});
    const result = evaluateQualityGate(ctx);
    expect(result.passed).toBe(false);
    const q09 = result.checks.find((c) => c.id === 'MW-Q09');
    expect(q09?.passed).toBe(false);
    expect(q09?.detail).toContain('autoAdvance=true');
  });

  it.each([
    ['missing checklist pin', {no_regression_sha256: undefined}, 'MW-Q04'],
    ['wrong checklist pin', {no_regression_sha256: 'f'.repeat(64)}, 'MW-Q04'],
    ['missing evidence tags', {evidence_tags: undefined}, 'MW-Q08'],
    ['empty evidence tags', {evidence_tags: []}, 'MW-Q08'],
    ['missing scope', {scope: undefined}, 'MW-Q10'],
    [
      'wrong scope workflow',
      {
        scope: {
          workflow_id: 'P01',
          mode: 'perfil-verificable',
          effect_class: 'local_reversible',
        },
      },
      'MW-Q10',
    ],
  ])('fails closed when the receipt has %s', (_label, receiptOverride, checkId) => {
    const result = evaluateQualityGate(
      buildP00Context({receiptPayload: buildP00Receipt(receiptOverride)}),
    );
    expect(result.passed).toBe(false);
    expect(result.checks.find((check) => check.id === checkId)?.passed).toBe(false);
    expect(result.failures.some((failure) => failure.startsWith(checkId))).toBe(true);
  });

  it.each([
    ['no output resolutions', []],
    [
      'a missing material output',
      outputResolutions.map((output, index) => (index === 0 ? {...output, exists: false} : output)),
    ],
    [
      'an invalid material hash',
      outputResolutions.map((output, index) =>
        index === 0 ? {...output, sha256: 'not-a-material-hash'} : output,
      ),
    ],
  ])('fails MW-Q10 with %s', (_label, resolutions) => {
    const result = evaluateQualityGate(buildP00Context({outputResolutions: resolutions}));
    expect(result.passed).toBe(false);
    const q10 = result.checks.find((check) => check.id === 'MW-Q10');
    expect(q10?.passed).toBe(false);
    expect(q10?.detail).toContain('material_outputs=');
  });
});
