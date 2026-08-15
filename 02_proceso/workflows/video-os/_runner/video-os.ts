import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

import {VideoOsPlanSchema, VideoOsRequestSchema, type VideoOsPlan} from '../_schema/index.ts';
import {assertVideoOsState, buildResumeCapsule} from './video-os-state.ts';

export * from './case-longform-preview.ts';
export * from './case-longform-graph.ts';
export * from './case-longform-preview-evidence.ts';
export * from './video-os-state.ts';

const hash = (value: string): string => createHash('sha256').update(value, 'utf8').digest('hex');
const normalize = (value: string): string => value.normalize('NFC').trim().replace(/\s+/gu, ' ');

const classify = (request: string): VideoOsPlan['archetype'] => {
  const value = request.toLocaleLowerCase('es');
  if (/reel|vertical|short/u.test(value)) return 'reel-evidence';
  if (/wrapper|cortinilla|intro.*outro/u.test(value)) return 'branded-wrapper';
  if (/montaje|montage|sizzle/u.test(value)) return 'montage';
  if (/loop|placa|title card/u.test(value)) return 'title-loop';
  return 'case-longform';
};

export const planVideoOs = (raw: unknown): VideoOsPlan => {
  const input = VideoOsRequestSchema.parse(raw);
  const request = normalize(input.request);
  const questions: string[] = [];
  if (input.sourceRefs.length === 0)
    questions.push('¿Qué archivos fuente autorizados debemos usar?');
  if (input.sourceAuthority !== 'verified')
    questions.push('¿Quién confirma la autoridad de las fuentes?');
  if (input.rights !== 'cleared')
    questions.push('¿Los derechos de uso están autorizados para este entregable?');
  const archetype = input.archetype ?? classify(request);
  const formatDefaults: Record<VideoOsPlan['archetype'], VideoOsPlan['primary_format']> = {
    'case-longform': '16:9',
    'reel-evidence': '9:16',
    'branded-wrapper': 'source',
    montage: '16:9',
    'title-loop': '1:1',
  };
  return VideoOsPlanSchema.parse({
    schema_version: 'video-os-plan-v1',
    request,
    request_sha256: hash(request),
    decision: questions.length === 0 ? 'ROUTED' : 'NEEDS_INPUT',
    blocking_questions: questions.slice(0, 3),
    archetype,
    primary_format: input.primaryFormat ?? formatDefaults[archetype],
    secondary_exports: [...new Set(input.secondaryExports)],
    stages: ['V00', 'V01', 'V02', 'V03', 'V04'],
    prompt_budget: {min: 3, target: 4, max: 5},
    context_budget: {max_tokens_per_stage: 1_800},
    defaults: {
      privacy_mode: 'light',
      privacy_strategy: 'field-level',
      persistent_privacy_plate: false,
      human_intro_motion_required: true,
      freeze_frame_allowed: false,
      motion_evidence: 'scene-aware-multiframe',
      minimum_motion_samples: 2,
      privacy_tracking: 'scene-aware-field-tracking',
      source_audio: archetype === 'title-loop' ? 'none' : 'preserve',
      automatic_terminal_state: 'RENDERED_DRAFT',
    },
    checkpoints: ['INTAKE_LOCK', 'SPEC_APPROVED', 'RENDER_REVIEW', 'HANDOFF'],
    standard_artifacts: [
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
    ],
    secondary_export_rule: 'PRIMARY_VERIFICATION_PASS_REQUIRED',
    next_gate: questions.length === 0 ? 'VO_DIRECTION_APPROVED' : 'VO_INTAKE_COMPLETE',
  });
};

const invoked = process.argv[1] ? resolve(process.argv[1]) : null;
if (invoked === fileURLToPath(import.meta.url)) {
  const [command, inputPath] = process.argv.slice(2);
  if (!command || !inputPath)
    throw new Error('Usage: video-os.ts <plan|check|capsule> <input.json>');
  const input: unknown = JSON.parse(readFileSync(inputPath, 'utf8'));
  const result =
    command === 'plan'
      ? JSON.stringify(planVideoOs(input), null, 2)
      : command === 'check'
        ? JSON.stringify(assertVideoOsState(input), null, 2)
        : command === 'capsule'
          ? buildResumeCapsule(input)
          : (() => {
              throw new Error(`Unknown command: ${command}`);
            })();
  process.stdout.write(`${result}\n`);
}
