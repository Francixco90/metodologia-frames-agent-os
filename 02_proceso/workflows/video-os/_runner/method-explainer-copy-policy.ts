import {
  type MethodExplainerCopyPolicyInput,
  MethodExplainerCopyPolicyInputSchema,
} from '../_schema/method-explainer-copy-exception-v1.schema.ts';
import {
  containsKnownVoseo,
  deriveCopyRoleHashes,
  ExplainerTextError,
  longestCommonSubsequenceLength,
  multisetMetrics,
  normalizeExplainerText,
  sameTokenSequence,
  sharedNgramCount,
} from './method-explainer-text-normalization.ts';

export type CopyPolicyInput = Readonly<MethodExplainerCopyPolicyInput>;
type CopyStatus = 'PASS' | 'REVIEW_REQUIRED' | 'BLOCK';
type Metrics = Readonly<{
  nodes: readonly Readonly<{
    overlap_percent: number;
    containment: boolean;
    shared_bigrams: number;
  }>[];
  aggregate_overlap_percent: number;
  aggregate_containment: boolean;
  lcs_length: number;
}>;
const invalidResult = (reason: string) => ({
  copy_status: 'BLOCK' as const,
  overall_status: 'BLOCK' as const,
  reasons: [reason] as readonly string[],
  metrics: null,
  exception: 'NOT_EVALUATED',
  neutrality: {coverage: 'NOT_EVALUATED', status: 'BLOCK'},
  approval_authorized: false,
});

export {deriveCopyRoleHashes};
export const inspectMethodExplainerCopy = (raw: unknown) => {
  const parsed = MethodExplainerCopyPolicyInputSchema.safeParse(raw);
  if (!parsed.success) return invalidResult('INPUT_INVALID');
  const input = parsed.data;
  const reasons = new Set<string>();
  let metrics: Metrics;
  let voseo: boolean;
  let roleHashes: ReturnType<typeof deriveCopyRoleHashes>;
  try {
    const voice = normalizeExplainerText(input.voiceover);
    const caption = normalizeExplainerText(input.accessibility_caption);
    const screen = input.on_screen.map(normalizeExplainerText);
    if (screen.some(({tokens}) => tokens.length === 0)) return invalidResult('INPUT_INVALID');
    const aggregate = screen.flatMap(({tokens}) => tokens);
    roleHashes = deriveCopyRoleHashes(input);
    if (!voice.tokens.length || !caption.tokens.length || !aggregate.length)
      reasons.add('COPY_EMPTY');
    if (!sameTokenSequence(voice.tokens, caption.tokens)) reasons.add('CAPTION_NOT_VERBATIM');
    voseo = containsKnownVoseo([voice, caption, ...screen]);
    if (voseo) reasons.add('VOSEO_KNOWN_FORM');
    const nodeMetrics = screen.map(({tokens}) => {
      const overlap = multisetMetrics(voice.tokens, tokens);
      if (sameTokenSequence(voice.tokens, tokens)) reasons.add('VOICE_SCREEN_LITERAL');
      if (overlap.containment) reasons.add('VOICE_SCREEN_CONTAINMENT');
      if (overlap.overlap_gt_70) reasons.add('VOICE_SCREEN_OVERLAP');
      return {
        overlap_percent: overlap.overlap_percent,
        containment: overlap.containment,
        shared_bigrams: sharedNgramCount(voice.tokens, tokens),
      };
    });
    const aggregateOverlap = multisetMetrics(voice.tokens, aggregate);
    if (sameTokenSequence(voice.tokens, aggregate)) reasons.add('VOICE_SCREEN_LITERAL');
    if (aggregateOverlap.containment) reasons.add('VOICE_SCREEN_CONTAINMENT');
    if (aggregateOverlap.overlap_gt_70) reasons.add('VOICE_SCREEN_OVERLAP');
    const lcs = longestCommonSubsequenceLength(voice.tokens, aggregate);
    const copiedNodes = nodeMetrics.filter(({shared_bigrams}) => shared_bigrams > 0).length;
    if (
      copiedNodes >= 2 ||
      (Math.min(voice.tokens.length, aggregate.length) >= 2 &&
        lcs * 100 > Math.min(voice.tokens.length, aggregate.length) * 70)
    )
      reasons.add('VOICE_SCREEN_SPLIT_COPY');
    metrics = {
      nodes: nodeMetrics,
      aggregate_overlap_percent: aggregateOverlap.overlap_percent,
      aggregate_containment: aggregateOverlap.containment,
      lcs_length: lcs,
    };
  } catch (error) {
    if (!(error instanceof ExplainerTextError)) throw error;
    return invalidResult('UNSAFE_OR_UNSUPPORTED_UNICODE');
  }
  const blocking = new Set([
    'COPY_EMPTY',
    'CAPTION_NOT_VERBATIM',
    'VOICE_SCREEN_LITERAL',
    'VOICE_SCREEN_CONTAINMENT',
  ]);
  let exception = 'ABSENT';
  if (input.exception) {
    const value = input.exception;
    const bound =
      value.beat_id === input.beat_id &&
      value.voice_contract_sha256 === input.voice_contract_sha256 &&
      value.role_hashes.voiceover === roleHashes.voiceover &&
      value.role_hashes.accessibility_caption === roleHashes.accessibility_caption &&
      value.role_hashes.on_screen === roleHashes.on_screen &&
      reasons.has(value.rule);
    if (!bound) {
      reasons.add('EXCEPTION_STALE');
      blocking.add('EXCEPTION_STALE');
      exception = 'STALE';
    } else {
      blocking.delete(value.rule);
      if (value.rule === 'VOICE_SCREEN_LITERAL') blocking.delete('VOICE_SCREEN_CONTAINMENT');
      reasons.add('EXCEPTION_PENDING_H01');
      exception = 'DECLARED_PENDING_H01';
    }
  }
  const orderedReasons = [...reasons].sort();
  const copyStatus: CopyStatus = orderedReasons.some((reason) => blocking.has(reason))
    ? 'BLOCK'
    : orderedReasons.some((reason) =>
          ['VOICE_SCREEN_OVERLAP', 'VOICE_SCREEN_SPLIT_COPY', 'EXCEPTION_PENDING_H01'].includes(
            reason,
          ),
        )
      ? 'REVIEW_REQUIRED'
      : 'PASS';
  const overallStatus = copyStatus === 'BLOCK' || voseo ? 'BLOCK' : 'REVIEW_REQUIRED';
  return {
    copy_status: copyStatus,
    overall_status: overallStatus,
    reasons: orderedReasons,
    metrics,
    exception,
    neutrality: {coverage: 'KNOWN_FORMS_ONLY', status: voseo ? 'BLOCK' : 'PENDING_H01'},
    approval_authorized: false,
  } as const;
};
