import {createHash} from 'node:crypto';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

import {
  METHOD_EXPLAINER_OUTPUT_REFS,
  VideoOsPlanSchema,
  VideoOsRequestSchema,
  type VideoOsPlan,
} from '../_schema/index.ts';
import {
  assertMethodExplainerMaterialBundle,
  readMethodExplainerBundle,
} from './method-explainer-material.ts';
import {assertVideoOsState, buildResumeCapsule} from './video-os-state.ts';

export * from './case-longform-preview.ts';
export * from './case-longform-graph.ts';
export * from './case-longform-preview-evidence.ts';
export * from './case-longform-prerender.ts';
export * from './case-longform-prerender-authority.ts';
export * from './case-longform-prerender-review.ts';
export * from './case-longform-prerender-review-authority.ts';
export * from './case-longform-claims.ts';
export * from './case-longform-semantic.ts';
export * from './case-longform-semantic-authority.ts';
export * from './case-longform-preservation-plan.ts';
export * from './case-longform-preservation-plan-authority.ts';
export * from './case-longform-preservation-tool.ts';
export * from './case-longform-preservation-ledger.ts';
export * from './case-longform-preservation-ledger-verify.ts';
export * from './case-longform-preservation-ledger-authority.ts';
export * from './case-longform-preservation-rgb.ts';
export * from './case-longform-preservation-rgb-compare.ts';
export * from './case-longform-caption-contract.ts';
export * from './case-longform-caption-contract-authority.ts';
export * from './case-longform-caption-placement.ts';
export * from './case-longform-caption-tool-authority.ts';
export * from './case-longform-caption-execution.ts';
export * from './case-longform-caption-execution-authority.ts';
export * from './case-longform-caption-execution-verify.ts';
export * from './case-longform-caption-review-plan.ts';
export * from './case-longform-caption-review-plan-authority.ts';
export * from './case-longform-caption-review-plan-contract.ts';
export * from './method-explainer-material.ts';
export * from './video-os-state.ts';

const hash = (value: string): string => createHash('sha256').update(value, 'utf8').digest('hex');
const normalize = (value: string): string => value.normalize('NFC').trim().replace(/\s+/gu, ' ');
const METHOD_ARTIFACTS = Object.values(METHOD_EXPLAINER_OUTPUT_REFS);
// prettier-ignore
const STANDARD_ARTIFACTS = ['source-analysis.json', 'video-brief.md', 'video-spec.json', 'piece-scripts.json', 'caption-track.json', 'shot-plan.json', 'storyboard-multiframe.json', 'privacy-plan.json', 'render-plan.json', 'review-report.md', 'handoff.md'];

const classify = (request: string): VideoOsPlan['archetype'] => {
  const value = request.toLocaleLowerCase('es');
  const explains = /\b(explica|explicar|presenta|presentar|describe|enseña|desglosa)\b/u.test(
    value,
  );
  const namedMethod = /\b(?:método|metodo|modelo|framework)\s+(?:pasa|pivote)\b/u.test(value);
  const acronym = /\b(?:PASA|PIVOTE)\b/u.exec(request);
  const verbBefore = acronym
    ? /\b(?:explica|explicar|presenta|presentar|describe|enseña|desglosa|crea|crear|produce)\b/u.test(
        request.slice(0, acronym.index).toLocaleLowerCase('es'),
      )
    : false;
  if (
    namedMethod ||
    verbBefore ||
    (explains && /\b(?:método|metodo|framework|marco de trabajo)\b/u.test(value))
  )
    return 'method-explainer';
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
  const formatConflict =
    archetype === 'method-explainer' && input.primaryFormat && input.primaryFormat !== '9:16';
  const privateSourceConflict =
    archetype === 'method-explainer' &&
    input.sourceRefs.some((ref) => /(?:^|[\\/])(?:private|\.runtime)(?:[\\/]|$)/iu.test(ref));
  if (privateSourceConflict)
    questions.unshift('Method-explainer exige fuentes fuera de segmentos private o .runtime.');
  if (formatConflict)
    questions.unshift('El arquetipo method-explainer exige formato principal 9:16.');
  const formatDefaults: Record<VideoOsPlan['archetype'], VideoOsPlan['primary_format']> = {
    'case-longform': '16:9',
    'method-explainer': '9:16',
    'reel-evidence': '9:16',
    'branded-wrapper': 'source',
    montage: '16:9',
    'title-loop': '1:1',
  };
  return VideoOsPlanSchema.parse({
    schema_version: 'video-os-plan-v1',
    request,
    request_sha256: hash(request),
    decision:
      formatConflict || privateSourceConflict
        ? 'BLOCKED'
        : questions.length === 0
          ? 'ROUTED'
          : 'NEEDS_INPUT',
    blocking_questions: questions.slice(0, 3),
    archetype,
    primary_format: formatConflict ? '9:16' : (input.primaryFormat ?? formatDefaults[archetype]),
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
      source_audio: ['method-explainer', 'title-loop'].includes(archetype) ? 'none' : 'preserve',
      automatic_terminal_state: 'RENDERED_DRAFT',
    },
    checkpoints: ['INTAKE_LOCK', 'SPEC_APPROVED', 'RENDER_REVIEW', 'HANDOFF'],
    standard_artifacts: archetype === 'method-explainer' ? METHOD_ARTIFACTS : STANDARD_ARTIFACTS,
    secondary_export_rule: 'PRIMARY_VERIFICATION_PASS_REQUIRED',
    next_gate: questions.length === 0 ? 'VO_DIRECTION_APPROVED' : 'VO_INTAKE_COMPLETE',
  });
};

const invoked = process.argv[1] ? resolve(process.argv[1]) : null;
if (invoked === fileURLToPath(import.meta.url)) {
  const [command, inputPath] = process.argv.slice(2);
  if (!command || !inputPath)
    throw new Error(
      'Usage: video-os.ts <plan|check|capsule|check-method-explainer> <input.json|->',
    );
  const serialized = await readMethodExplainerBundle(inputPath);
  let input: unknown;
  try {
    input = JSON.parse(serialized);
  } catch {
    throw new Error('METHOD-EXPLAINER-BUNDLE_PARSE');
  }
  const bundleBase = inputPath === '-' ? process.cwd() : dirname(resolve(inputPath));
  const result =
    command === 'plan'
      ? JSON.stringify(planVideoOs(input), null, 2)
      : command === 'check'
        ? JSON.stringify(assertVideoOsState(input), null, 2)
        : command === 'capsule'
          ? buildResumeCapsule(input)
          : command === 'check-method-explainer'
            ? JSON.stringify(await assertMethodExplainerMaterialBundle(input, bundleBase), null, 2)
            : (() => {
                throw new Error(`Unknown command: ${command}`);
              })();
  process.stdout.write(`${result}\n`);
}
