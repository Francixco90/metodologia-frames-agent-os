import {z} from 'zod';

import {canonicalJsonSha256, sha256Utf8} from '../../../core/canonical-json-sha256.ts';
import {LocalRefSchema, Sha256Schema} from './video-os-v1.schema.ts';

const RelativeRefSchema = LocalRefSchema.refine(
  (value) => !/(?:^|[\\/])(?:private|\.runtime)(?:[\\/]|$)/iu.test(value),
  'REF_PRIVATE',
);
export const MAX_MATERIAL_BYTES = 512 * 1024 * 1024;
export const MAX_TOTAL_MATERIAL_BYTES = 2 * 1024 * 1024 * 1024;
export const ArtifactBindingSchema = z.strictObject({
  ref: RelativeRefSchema,
  sha256: Sha256Schema,
  size_bytes: z.number().int().min(0).max(MAX_MATERIAL_BYTES),
});
// prettier-ignore
export const ContractHashesSchema = z.strictObject({intent: Sha256Schema, assumptions: Sha256Schema, method_content: Sha256Schema, beat_budget: Sha256Schema, diagram: Sha256Schema});
// prettier-ignore
export const NormalizedBoundsSchema = z.strictObject({x: z.number().min(0).max(1), y: z.number().min(0).max(1), width: z.number().positive().max(1), height: z.number().positive().max(1)});

// prettier-ignore
const AuthorityRefSchema = ArtifactBindingSchema.extend({authority: z.enum(['editorial', 'primary-source', 'user-provided']), rights: z.enum(['cleared', 'internal-draft-only'])});

export const IntentEnvelopeV1Schema = z.strictObject({
  schema_version: z.literal('intent-envelope-v1'),
  request: z.string().min(1).max(4_000),
  request_sha256: Sha256Schema,
  method: z.strictObject({id: z.string().min(1).max(80), name: z.string().min(1).max(120)}),
  audience: z.string().min(1).max(300),
  locale: z.literal('es-419'),
  voseo: z.literal(false),
  format: z.literal('9:16'),
  fps: z.literal(30),
  duration_seconds: z.number().int().min(15).max(180),
  host: z.string().min(1).max(80),
  known: z.array(z.string().min(1).max(300)).max(40),
  unknown: z.array(z.string().min(1).max(300)).max(20),
  confidence: z.number().min(0).max(1),
  rights: z.enum(['cleared', 'internal-draft-only', 'unknown']),
  decision: z.enum(['AUTO_CONTINUE', 'DRAFT_WITH_ASSUMPTIONS', 'NEEDS_INPUT', 'BLOCKED']),
  automatic_terminal_state: z.literal('RENDERED_DRAFT'),
});

// prettier-ignore
const AssumptionSchema = z.strictObject({id: z.string().regex(/^ASM-[A-Z0-9-]{2,60}$/u), statement: z.string().min(1).max(500), basis: z.string().min(1).max(500), confidence: z.number().min(0).max(1), impact: z.enum(['low', 'medium', 'high']), status: z.enum(['open', 'confirmed', 'rejected']), resolution: z.string().min(1).max(500).nullable(), invalidates: z.array(z.string().min(1).max(120)).max(30)});

export const AssumptionsLedgerV1Schema = z.strictObject({
  schema_version: z.literal('assumptions-ledger-v1'),
  intent_sha256: Sha256Schema,
  assumptions: z.array(AssumptionSchema).max(40),
  decision: z.enum(['CONTINUE', 'NEEDS_INPUT', 'BLOCKED']),
});

// prettier-ignore
const ConceptSchema = z.strictObject({id: z.string().regex(/^CONCEPT-[A-Z0-9-]{2,60}$/u), label: z.string().min(1).max(80), definition: z.string().min(1).max(500), authority_refs: z.array(RelativeRefSchema).min(1).max(10)});

export const MethodContentModelV1Schema = z.strictObject({
  schema_version: z.literal('method-content-model-v1'),
  intent_sha256: Sha256Schema,
  assumptions_sha256: Sha256Schema,
  method_id: z.string().min(1).max(80),
  authority_refs: z.array(AuthorityRefSchema).min(1).max(30),
  concepts: z.array(ConceptSchema).min(1).max(20),
  relations: z
    .array(
      z.strictObject({
        source: z.string().min(1).max(80),
        target: z.string().min(1).max(80),
        kind: z.enum(['sequence', 'enables', 'reinforces', 'depends-on', 'cycle']),
      }),
    )
    .max(60),
  examples: z
    .array(
      z.strictObject({concept_id: z.string().min(1).max(80), text: z.string().min(1).max(500)}),
    )
    .max(30),
  claims: z
    .array(
      z.strictObject({
        text: z.string().min(1).max(500),
        material: z.boolean(),
        authority_refs: z.array(RelativeRefSchema).max(10),
      }),
    )
    .max(40),
});

// prettier-ignore
const ScreenBudgetSchema = z.strictObject({text: z.string().min(1).max(160), max_lines: z.number().int().min(1).max(2), font_px: z.number().int().min(24).max(160)});

export const BeatBudgetV1Schema = z.strictObject({
  schema_version: z.literal('beat-budget-v1'),
  spec_sha256: Sha256Schema,
  method_content_sha256: Sha256Schema,
  fps: z.literal(30),
  total_frames: z.number().int().min(450).max(5_400),
  max_tempo_words_per_second: z.number().positive().max(3.2),
  beats: z
    .array(
      z.strictObject({
        id: z.string().regex(/^BEAT-[A-Z0-9-]{2,60}$/u),
        start_frame: z.number().int().min(0),
        end_frame: z.number().int().positive(),
        voiceover: z.string().min(1).max(1_000),
        voice_words: z.number().int().positive(),
        screen: z.array(ScreenBudgetSchema).max(8),
      }),
    )
    .min(1)
    .max(30),
  audio_target: z.strictObject({
    integrated_lufs: z.number().min(-16.3).max(-15.7),
    true_peak_dbtp_max: z.number().max(-1.5),
    sample_rate_hz: z.literal(48_000),
  }),
});

export type IntentEnvelopeV1 = z.infer<typeof IntentEnvelopeV1Schema>;
export type AssumptionsLedgerV1 = z.infer<typeof AssumptionsLedgerV1Schema>;
export type MethodContentModelV1 = z.infer<typeof MethodContentModelV1Schema>;
export type BeatBudgetV1 = z.infer<typeof BeatBudgetV1Schema>;
export const methodExplainerFail = (code: string): never => {
  throw new Error(`METHOD-EXPLAINER-${code}`);
};
export const canonicalSha256 = canonicalJsonSha256;
export const assertMethodExplainerPlanningBindings = (input: {
  intent: IntentEnvelopeV1;
  assumptions: AssumptionsLedgerV1;
  method: MethodContentModelV1;
  budget: BeatBudgetV1;
  hashes: {intent: string; assumptions: string; method_content: string; beat_budget: string};
}): void => {
  const {intent, assumptions, method, budget, hashes} = input;
  const request = intent.request.normalize('NFC').trim().replace(/\s+/gu, ' ');
  // prettier-ignore
  if (intent.rights === 'unknown' || ['NEEDS_INPUT', 'BLOCKED'].includes(intent.decision) || ['NEEDS_INPUT', 'BLOCKED'].includes(assumptions.decision)) methodExplainerFail('NON-EXECUTABLE-DECISION');
  // prettier-ignore
  if ((intent.confidence < 0.6 && !['NEEDS_INPUT', 'BLOCKED'].includes(intent.decision)) || (intent.confidence < 0.85 && intent.decision === 'AUTO_CONTINUE') || (intent.unknown.length > 0 && intent.decision === 'AUTO_CONTINUE')) methodExplainerFail('CONFIDENCE-DECISION-MISMATCH');
  if (intent.request_sha256 !== sha256Utf8(request))
    throw new Error('METHOD-EXPLAINER-REQUEST-HASH-MISMATCH');
  if (assumptions.intent_sha256 !== hashes.intent || method.intent_sha256 !== hashes.intent)
    throw new Error('METHOD-EXPLAINER-INTENT-BINDING-MISMATCH');
  if (method.assumptions_sha256 !== hashes.assumptions)
    throw new Error('METHOD-EXPLAINER-ASSUMPTIONS-BINDING-MISMATCH');
  if (budget.method_content_sha256 !== hashes.method_content)
    throw new Error('METHOD-EXPLAINER-METHOD-BINDING-MISMATCH');
  // prettier-ignore
  if (hashes.intent !== canonicalSha256(intent) || hashes.assumptions !== canonicalSha256(assumptions) || hashes.method_content !== canonicalSha256(method) || hashes.beat_budget !== canonicalSha256(budget)) methodExplainerFail('MATERIAL-HASH-MISMATCH');
  if (
    assumptions.assumptions.some((item) => item.impact === 'high' && item.status === 'open') &&
    assumptions.decision === 'CONTINUE'
  )
    throw new Error('METHOD-EXPLAINER-HIGH-IMPACT-ASSUMPTION-OPEN');
  if (method.claims.some((claim) => claim.material && claim.authority_refs.length === 0))
    throw new Error('METHOD-EXPLAINER-UNSUPPORTED-MATERIAL-CLAIM');
  const concepts = new Set(method.concepts.map((item) => item.id));
  if (concepts.size !== method.concepts.length) methodExplainerFail('DUPLICATE-CONCEPT-ID');
  if (method.examples.some((item) => !concepts.has(item.concept_id)))
    methodExplainerFail('UNKNOWN-EXAMPLE-CONCEPT');
  if (method.relations.some((item) => !concepts.has(item.source) || !concepts.has(item.target)))
    throw new Error('METHOD-EXPLAINER-UNKNOWN-CONCEPT-RELATION');
  const authorities = new Set(method.authority_refs.map((item) => item.ref));
  if (authorities.size !== method.authority_refs.length) methodExplainerFail('DUPLICATE-AUTHORITY');
  // prettier-ignore
  if (method.concepts.some((item) => item.authority_refs.some((ref) => !authorities.has(ref))) || method.claims.some((item) => item.authority_refs.some((ref) => !authorities.has(ref)))) throw new Error('METHOD-EXPLAINER-UNKNOWN-AUTHORITY-REF');
  let cursor = 0;
  const beatIds = new Set<string>();
  for (const beat of budget.beats) {
    if (beatIds.has(beat.id)) methodExplainerFail('DUPLICATE-BEAT-ID');
    beatIds.add(beat.id);
    if (beat.voice_words !== beat.voiceover.trim().split(/\s+/u).length)
      throw new Error('METHOD-EXPLAINER-VOICE-WORD-COUNT');
    if (beat.start_frame !== cursor || beat.end_frame <= beat.start_frame)
      throw new Error('METHOD-EXPLAINER-BEAT-TIMELINE');
    if (
      beat.voice_words / ((beat.end_frame - beat.start_frame) / budget.fps) >
      budget.max_tempo_words_per_second
    )
      throw new Error('METHOD-EXPLAINER-VOICE-TEMPO');
    cursor = beat.end_frame;
  }
  if (cursor !== budget.total_frames) throw new Error('METHOD-EXPLAINER-BEAT-TOTAL-FRAMES');
  if (intent.duration_seconds * intent.fps !== budget.total_frames)
    methodExplainerFail('INTENT-DURATION-DRIFT');
};
export {RelativeRefSchema};
