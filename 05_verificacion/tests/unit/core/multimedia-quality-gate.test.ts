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
  outputs: [
    {
      artifact: 'Brand OS',
      ref: '03_artefactos/content/multimedia/p00-definir-sistema/brand-os.yml',
      sha256: 'd'.repeat(64),
      required: true,
    },
  ],
  work_product_state_from: 'INTAKE',
  work_product_state_to: 'DEFINED',
  gate: 'G13',
  actor: 'qa',
  ran_at: '2026-08-05T00:00:00+00:00',
  append_only: true,
  human_approved: false,
  coverage_gaps: ['dry-run: outputs declared but not materialized'],
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

  it('honestly records coverage_gap details for MW-Q04/Q08/Q10 (receipt schema lacks the fields)', () => {
    const result = evaluateQualityGate(buildP00Context());
    const q04 = result.checks.find((c) => c.id === 'MW-Q04');
    const q08 = result.checks.find((c) => c.id === 'MW-Q08');
    const q10 = result.checks.find((c) => c.id === 'MW-Q10');
    expect(q04?.passed).toBe(true);
    expect(q04?.detail).toContain('coverage_gap');
    expect(q08?.passed).toBe(true);
    expect(q08?.detail).toContain('coverage_gap');
    expect(q10?.passed).toBe(true);
    expect(q10?.detail).toContain('coverage_gap');
  });
});
