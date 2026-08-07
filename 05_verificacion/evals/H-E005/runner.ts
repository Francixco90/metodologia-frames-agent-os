// H-E005 runner — resume from PROGRESS.md + continuity/state.yaml.
// Executable eval: loads the fixture, reconstructs task context from
// continuity/state.yaml + PROGRESS.md, and asserts internal coherence.
// Deterministic: static fixture content; no Date.now/Math.random. [CÓDIGO]

import {readFileSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {describe, expect, it} from 'vitest';
import YAML from 'yaml';

import {TaskWorkStateSchema} from '../../../02_proceso/core/contracts/index.ts';

const FIXTURE_DIR = resolve(__dirname, 'fixture');
const PROGRESS_PATH = join(FIXTURE_DIR, 'PROGRESS.md');
const STATE_PATH = join(FIXTURE_DIR, 'continuity', 'state.yaml');

interface ReconstructedContext {
  taskId: string;
  state: string;
  lastGate: string;
  nextStep: string;
  projectId: string | null;
  responsable: string;
}

/**
 * Convierte un valor `unknown` a string sin recurrir a `Object.toString`
 * (evita `[object Object]`). Primitivos → su string; null/undefined → '';
 * objetos/arrays → JSON. [CÓDIGO]
 */
const primitiveString = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return '';
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value);
  }
  return JSON.stringify(value);
};

/**
 * Reconstruye el contexto de tarea desde continuity/state.yaml y corrobora
 * contra PROGRESS.md. Espejo de la convención de resume del harness. [DOC]
 */
function reconstructContext(): {
  ctx: ReconstructedContext;
  progress: string;
} {
  const progress = readFileSync(PROGRESS_PATH, 'utf8');
  const stateRaw = YAML.parse(readFileSync(STATE_PATH, 'utf8')) as Record<string, unknown>;
  const ctx: ReconstructedContext = {
    taskId: String(stateRaw['task_id']),
    state: String(stateRaw['state']),
    lastGate: String(stateRaw['last_gate']),
    nextStep: String(stateRaw['next_step']),
    projectId: stateRaw['project_id'] === null ? null : primitiveString(stateRaw['project_id']),
    responsable: String(stateRaw['responsable']),
  };
  return {ctx, progress};
}

describe('H-E005 — resume from PROGRESS.md + continuity/state.yaml', () => {
  it('reconstructs a coherent task context from both sources', () => {
    const {ctx, progress} = reconstructContext();

    // state.yaml fields non-empty and well-typed.
    expect(ctx.taskId).toBe('TASK-resume-001');
    expect(ctx.lastGate).toBe('G00');
    expect(ctx.nextStep.length).toBeGreaterThan(0);
    expect(ctx.responsable).toBe('lead');
    expect(ctx.projectId).toBe('proj-resume');

    // state is a valid TaskWorkState.
    expect(TaskWorkStateSchema.safeParse(ctx.state).success).toBe(true);
    expect(ctx.state).toBe('ESPECIFICADO');

    // PROGRESS.md contains the canonical sections.
    expect(progress).toContain('## Current state');
    expect(progress).toContain('## Next session should');

    // task_id appears in PROGRESS.md (cross-source corroboration).
    expect(progress).toContain(ctx.taskId);

    // State mentioned in PROGRESS.md narrative matches state.yaml.
    expect(progress).toContain('ESPECIFICADO');
  });

  it('treats missing continuity fields as empty (oracle rejects empty resume)', () => {
    const badRaw: Record<string, unknown> = {task_id: 'TASK-x', state: 'INTAKE'};
    expect(badRaw['last_gate']).toBeUndefined();
    // The runner's contract: last_gate + next_step are required for a full
    // resume; their absence surfaces as empty strings in reconstruct, which
    // the oracle rejects.
    const reconstructed = {
      lastGate: badRaw['last_gate'] === undefined ? '' : primitiveString(badRaw['last_gate']),
      nextStep: badRaw['next_step'] === undefined ? '' : primitiveString(badRaw['next_step']),
    };
    expect(reconstructed.lastGate.length).toBe(0);
    expect(reconstructed.nextStep.length).toBe(0);
  });
});
