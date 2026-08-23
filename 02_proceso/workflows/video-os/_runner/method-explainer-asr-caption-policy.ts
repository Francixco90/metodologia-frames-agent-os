import {
  MethodExplainerAsrCaptionExpectedHashesSchema,
  MethodExplainerAsrCaptionInspectionInputSchema,
  MethodExplainerAsrCaptionV1Schema,
  inspectExpectedVoiceFrames,
} from '../_schema/method-explainer-asr-caption-v1.schema.ts';
import {MethodExplainerVoiceBundleV1Schema} from '../_schema/method-explainer-voice-bundle-v1.schema.ts';
import {canonicalSha256} from '../_schema/method-explainer-planning-v1.schema.ts';
import {
  ExplainerTextError,
  normalizeExplainerText,
  sameTokenSequence,
} from './method-explainer-text-normalization.ts';

type Comparison = Readonly<{
  exact: boolean;
  omitted: readonly string[];
  unexpected: readonly string[];
  repeated: readonly string[];
  reordered: boolean;
}>;
const blocked = (reasons: readonly string[] = ['INPUT_INVALID']) => ({
  scope: 'DECLARATIVE_ONLY' as const,
  declarative_status: 'BLOCK' as const,
  material_status: 'NOT_MATERIAL' as const,
  promotion_authorized: false,
  reasons: [...reasons].sort(),
  beats: [] as readonly unknown[],
});
const tokenCounts = (tokens: readonly string[]) => {
  const result = new Map<string, number>();
  tokens.forEach((token) => result.set(token, (result.get(token) ?? 0) + 1));
  return result;
};
const textTokens = (text: string) => {
  const tokens = normalizeExplainerText(text).tokens;
  if (!tokens.length) throw new ExplainerTextError('SEMANTICALLY-EMPTY');
  return tokens;
};
const compareText = (expectedText: string, observedText: string): Comparison => {
  const expected = textTokens(expectedText);
  const observed = textTokens(observedText);
  const expectedCounts = tokenCounts(expected);
  const observedCounts = tokenCounts(observed);
  const consumed = new Map<string, number>();
  const unexpected: string[] = [];
  const repeated: string[] = [];
  for (const token of observed) {
    const expectedCount = expectedCounts.get(token) ?? 0;
    const used = consumed.get(token) ?? 0;
    if (expectedCount === 0) unexpected.push(token);
    else if (used >= expectedCount) repeated.push(token);
    else consumed.set(token, used + 1);
  }
  const remaining = new Map(observedCounts);
  const omitted = expected.filter((token) => {
    const count = remaining.get(token) ?? 0;
    if (count === 0) return true;
    remaining.set(token, count - 1);
    return false;
  });
  const sameMultiset = omitted.length === 0 && unexpected.length === 0 && repeated.length === 0;
  const exact = sameTokenSequence(expected, observed);
  return {exact, omitted, unexpected, repeated, reordered: sameMultiset && !exact};
};
const addComparisonReasons = (
  reasons: Set<string>,
  beatId: string,
  channel: 'ASR' | 'CAPTION' | 'CUES',
  result: Comparison,
) => {
  if (result.omitted.length) reasons.add(`${beatId}:${channel}_OMITTED`);
  if (result.unexpected.length) reasons.add(`${beatId}:${channel}_UNEXPECTED`);
  if (result.repeated.length) reasons.add(`${beatId}:${channel}_REPEATED`);
  if (result.reordered) reasons.add(`${beatId}:${channel}_REORDERED`);
};
export const inspectAsrCaptionDeclaration = (raw: unknown) => {
  const envelope = MethodExplainerAsrCaptionInspectionInputSchema.safeParse(raw);
  if (!envelope.success) return blocked();
  const frameReasons = inspectExpectedVoiceFrames(envelope.data.voice_bundle);
  if (frameReasons.length) return blocked(frameReasons);
  const bundleResult = MethodExplainerVoiceBundleV1Schema.safeParse(envelope.data.voice_bundle);
  const declarationResult = MethodExplainerAsrCaptionV1Schema.safeParse(envelope.data.declaration);
  const hashesResult = MethodExplainerAsrCaptionExpectedHashesSchema.safeParse(
    envelope.data.expected_hashes,
  );
  if (!bundleResult.success || !declarationResult.success || !hashesResult.success)
    return blocked();
  const bundle = bundleResult.data;
  const declaration = declarationResult.data;
  const expectedHashes = hashesResult.data;
  const reasons = new Set<string>();
  const actual = {
    voice_bundle_sha256: canonicalSha256(bundle),
    voice_contract_sha256: canonicalSha256(bundle.voice_contract),
    spec_sha256: bundle.spec_sha256,
    beat_budget_sha256: bundle.beat_budget_sha256,
    declaration_sha256: canonicalSha256(declaration),
  };
  for (const key of Object.keys(actual) as (keyof typeof actual)[]) {
    if (actual[key] !== expectedHashes[key]) reasons.add(`EXPECTED_${key.toUpperCase()}_MISMATCH`);
    if (key !== 'declaration_sha256' && actual[key] !== declaration.bindings[key])
      reasons.add(`DECLARATION_${key.toUpperCase()}_MISMATCH`);
  }
  const voiceBeats = bundle.voice_contract.beats;
  if (declaration.beats.length !== voiceBeats.length) reasons.add('BEAT_COUNT_MISMATCH');
  const beatIds = new Set<string>();
  const cueIds = new Set<string>();
  const reports: {beat_id: string; asr: Comparison; caption: Comparison; cues: Comparison}[] = [];
  try {
    declaration.beats.forEach((beat, index) => {
      if (beatIds.has(beat.beat_id)) reasons.add('BEAT_ID_DUPLICATE');
      beatIds.add(beat.beat_id);
      const expectedBeat = voiceBeats[index];
      if (!expectedBeat || beat.beat_id !== expectedBeat.beat_id) {
        reasons.add('BEAT_ORDER_MISMATCH');
        return;
      }
      const plannedBeat = bundle.tts_candidate_plan.beats[index]!;
      textTokens(expectedBeat.voiceover);
      textTokens(expectedBeat.caption.text);
      textTokens(plannedBeat.text);
      if (
        beat.start_frame !== expectedBeat.start_frame ||
        beat.end_frame !== expectedBeat.end_frame
      )
        reasons.add(`${beat.beat_id}:BEAT_FRAME_MISMATCH`);
      let previousEnd = -1;
      let previousStart = -1;
      for (const cue of beat.cues) {
        textTokens(cue.text);
        if (cueIds.has(cue.cue_id)) reasons.add('CUE_ID_DUPLICATE');
        cueIds.add(cue.cue_id);
        if (cue.end_frame <= cue.start_frame) reasons.add(`${beat.beat_id}:CUE_FRAME_ORDER`);
        if (cue.start_frame < previousStart) reasons.add(`${beat.beat_id}:CUE_ORDER`);
        if (cue.start_frame < previousEnd) reasons.add(`${beat.beat_id}:CUE_OVERLAP`);
        if (
          cue.start_frame < expectedBeat.caption.start_frame ||
          cue.end_frame > expectedBeat.caption.end_frame
        )
          reasons.add(`${beat.beat_id}:CUE_OUTSIDE_AUDIBLE_WINDOW`);
        previousStart = cue.start_frame;
        previousEnd = cue.end_frame;
      }
      const asr = compareText(expectedBeat.voiceover, beat.declared_asr_text);
      const caption = compareText(expectedBeat.voiceover, beat.accessibility_caption);
      const cues = compareText(expectedBeat.voiceover, beat.cues.map(({text}) => text).join(' '));
      addComparisonReasons(reasons, beat.beat_id, 'ASR', asr);
      addComparisonReasons(reasons, beat.beat_id, 'CAPTION', caption);
      addComparisonReasons(reasons, beat.beat_id, 'CUES', cues);
      reports.push({beat_id: beat.beat_id, asr, caption, cues});
    });
  } catch (error) {
    if (!(error instanceof ExplainerTextError)) throw error;
    return blocked(['TEXT_INVALID']);
  }
  return {
    scope: 'DECLARATIVE_ONLY' as const,
    declarative_status: reasons.size ? ('BLOCK' as const) : ('PASS' as const),
    material_status: 'NOT_MATERIAL' as const,
    promotion_authorized: false,
    reasons: [...reasons].sort(),
    beats: reports,
  };
};
