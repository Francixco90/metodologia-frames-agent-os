import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {describe, expect, it} from 'vitest';

import {
  VIDEO_OS_CHAIN,
  VIDEO_OS_CONTEXT_BUDGETS,
  VIDEO_OS_DEFAULT_DOCUMENTS,
  VIDEO_OS_USER_PROMPT_CHAIN,
  planVideoOs,
} from 'workflows/video-os/index.ts';

const readJson = <T>(path: string): T =>
  JSON.parse(readFileSync(resolve(process.cwd(), path), 'utf8')) as T;

describe('Video OS compact planner and document defaults', () => {
  it('routes the same simple prompt to the same five-stage, four-decision plan', () => {
    const request = {
      request: '  Crear   un reel de evidencia con el video fuente. ',
      sourceRefs: ['work/private/video-os/source.mp4'],
      sourceAuthority: 'verified' as const,
      rights: 'cleared' as const,
      secondaryExports: ['16:9' as const],
    };
    const first = planVideoOs(request);

    expect(planVideoOs(request)).toEqual(first);
    expect(first).toMatchObject({
      decision: 'ROUTED',
      archetype: 'reel-evidence',
      prompt_budget: {min: 3, target: 4, max: 5},
      context_budget: {max_tokens_per_stage: 1_800},
      checkpoints: ['INTAKE_LOCK', 'SPEC_APPROVED', 'RENDER_REVIEW', 'HANDOFF'],
      secondary_export_rule: 'PRIMARY_VERIFICATION_PASS_REQUIRED',
    });
    expect(first.stages).toEqual(VIDEO_OS_CHAIN);
    expect(VIDEO_OS_USER_PROMPT_CHAIN).toHaveLength(4);
    expect(VIDEO_OS_USER_PROMPT_CHAIN.length).toBeGreaterThanOrEqual(first.prompt_budget.min);
    expect(VIDEO_OS_USER_PROMPT_CHAIN.length).toBeLessThanOrEqual(first.prompt_budget.max);
    expect(VIDEO_OS_CONTEXT_BUDGETS).toEqual({
      maxTokensPerStage: 1_800,
      maxBlockingQuestions: 3,
      maxHumanDecisions: 5,
    });
    expect(first.blocking_questions).toEqual([]);
  });

  it('ships standard documents and safe audiovisual defaults without boilerplate prompts', () => {
    const plan = planVideoOs({
      request: 'Crear caso completo',
      sourceRefs: ['work/private/video-os/source.mp4'],
      sourceAuthority: 'verified',
      rights: 'cleared',
    });
    const required = [
      'source-analysis.json',
      'video-brief.md',
      'video-spec.json',
      'piece-scripts.json',
      'caption-track.json',
      'shot-plan.json',
      'storyboard-multiframe.json',
      'privacy-plan.json',
      'render-plan.json',
      'review-report.md',
      'handoff.md',
    ];

    expect(new Set(plan.standard_artifacts).size).toBe(plan.standard_artifacts.length);
    expect(plan.standard_artifacts).toEqual(expect.arrayContaining(required));
    expect([...VIDEO_OS_DEFAULT_DOCUMENTS]).toEqual(plan.standard_artifacts);
    expect(plan.defaults).toMatchObject({
      privacy_mode: 'light',
      privacy_strategy: 'field-level',
      persistent_privacy_plate: false,
      human_intro_motion_required: true,
      freeze_frame_allowed: false,
      automatic_terminal_state: 'RENDERED_DRAFT',
    });
  });

  it('asks no more than three material questions and blocks unknown source authority', () => {
    const plan = planVideoOs({request: 'Crear video largo'});

    expect(plan.decision).toBe('NEEDS_INPUT');
    expect(plan.blocking_questions).toHaveLength(3);
    expect(plan.blocking_questions).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/archivos fuente/iu),
        expect.stringMatching(/autoridad/iu),
        expect.stringMatching(/derechos/iu),
      ]),
    );
  });

  it('binds archetype defaults to light field-level privacy and real speaker motion', () => {
    const assets = readJson<{
      default: string;
      archetypes: Record<string, {storyboard: boolean; source_audio: string}>;
      defaults: {
        privacy: {mode: string; mask_strategy: string; persistent_plate: boolean};
        human_intro: {motion_required: boolean; freeze_frame_allowed: boolean};
        automatic_terminal_state: string;
      };
    }>('02_proceso/workflows/video-os/_assets/archetypes.json');

    expect(assets.default).toBe('case-longform');
    expect(Object.keys(assets.archetypes)).toEqual(
      expect.arrayContaining(['case-longform', 'reel-evidence', 'branded-wrapper']),
    );
    expect(assets.defaults).toMatchObject({
      privacy: {mode: 'light', mask_strategy: 'field-level', persistent_plate: false},
      human_intro: {motion_required: true, freeze_frame_allowed: false},
      automatic_terminal_state: 'RENDERED_DRAFT',
    });
  });
});
