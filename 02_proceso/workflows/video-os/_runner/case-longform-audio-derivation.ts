import type {z} from 'zod';

import type {CaseLongformSourceSet} from './case-longform-graph-structure.ts';
import type {CaseLongformSourceSegmentMap} from './case-longform-prerender-authority.ts';
import type {
  CaseLongformAudioDictionaryReceipt,
  CaseLongformAudioTranscript,
} from './case-longform-prerender-review-authority.ts';

type Transcript = z.infer<typeof CaseLongformAudioTranscript>;
type Dictionary = z.infer<typeof CaseLongformAudioDictionaryReceipt>;
type Segments = z.infer<typeof CaseLongformSourceSegmentMap>;
const same = (left: unknown, right: unknown): boolean =>
  JSON.stringify(left) === JSON.stringify(right);
const folded = (value: string): string =>
  value.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase();
export const compactCaseLongformAudioToken = (value: string): string =>
  folded(value)
    .replace(/[^\p{L}\p{N}]/gu, '')
    .replace(/^(?:https?www|https?|www)/u, '');

export const deriveCaseLongformAudioMatches = (transcript: Transcript, dictionary: Dictionary) =>
  transcript.sources
    .flatMap((source) =>
      source.segments.flatMap((segment) => {
        if (segment.kind !== 'speech') return [];
        const text = compactCaseLongformAudioToken(segment.text);
        return dictionary.entries.flatMap((entry) =>
          entry.variants.flatMap((variant) => {
            const needle = compactCaseLongformAudioToken(variant);
            if (needle !== text && needle !== '' && text.includes(needle))
              throw new Error('VIDEO-OS-CASE-AUDIO-SENSITIVE-CUE-NOT-ISOLATED');
            return needle === text
              ? [
                  {
                    match_id: `${entry.dictionary_id}:${source.role}:${segment.id}`,
                    dictionary_id: entry.dictionary_id,
                    role: source.role,
                    source_sha256: source.source_sha256,
                    transcript_segment_id: segment.id,
                    source_start_frame: segment.start_frame,
                    source_end_frame: segment.end_frame,
                    variant,
                    occurrence: 0 as const,
                  },
                ]
              : [];
          }),
        );
      }),
    )
    .sort((left, right) => left.match_id.localeCompare(right.match_id));

export const validateCaseLongformAudioTranscript = (
  transcript: Transcript,
  sourceSet: z.infer<typeof CaseLongformSourceSet>,
  sourceFrameCounts: Map<string, number>,
): void => {
  const ids = transcript.sources.flatMap(({segments}) => segments.map(({id}) => id));
  if (new Set(ids).size !== ids.length) throw new Error('VIDEO-OS-CASE-TRANSCRIPT-ID-DUPLICATE');
  transcript.sources.forEach((source, index) => {
    const expected = sourceSet.sources[index];
    const ordered = [...source.segments].sort((a, b) => a.start_frame - b.start_frame);
    if (
      !expected ||
      source.source_sha256 !== expected.media.sha256 ||
      !same(source.media, expected.media) ||
      source.audio_stream_index !== 0 ||
      source.frame_count !== sourceFrameCounts.get(source.role) ||
      !same(source.segments, ordered) ||
      ordered[0]?.start_frame !== 0 ||
      ordered.at(-1)?.end_frame !== source.frame_count - 1 ||
      ordered.some(
        (item, itemIndex) =>
          item.start_frame > item.end_frame ||
          (itemIndex > 0 && item.start_frame !== ordered[itemIndex - 1]!.end_frame + 1),
      )
    )
      throw new Error('VIDEO-OS-CASE-TRANSCRIPT-COVERAGE-DRIFT');
  });
};

export const deriveCaseLongformAudioOperations = (
  matches: ReturnType<typeof deriveCaseLongformAudioMatches>,
  dictionary: Dictionary,
  segments: Segments,
) =>
  matches.map((match) => {
    const entry = dictionary.entries.find(
      ({dictionary_id}) => dictionary_id === match.dictionary_id,
    )!;
    const included = segments.segments
      .filter(({role}) => role === match.role)
      .sort((a, b) => a.source_start_frame - b.source_start_frame);
    const common = {
      operation_id: `audio:${match.match_id}`,
      match_id: match.match_id,
      dictionary_id: match.dictionary_id,
      role: match.role,
      source_sha256: match.source_sha256,
      source_start_frame: match.source_start_frame,
      source_end_frame: match.source_end_frame,
      caption_replacement: entry.caption_replacement,
    };
    if (entry.required_treatment === 'CUT_CLAUSE') {
      const exactGap = included.some(
        (item, index) =>
          index > 0 &&
          included[index - 1]!.source_end_frame + 1 === match.source_start_frame &&
          item.source_start_frame - 1 === match.source_end_frame,
      );
      if (!exactGap) throw new Error('VIDEO-OS-CASE-AUDIO-CUT-NOT-SOURCE-GAP');
      return {...common, treatment: 'CUT_CLAUSE' as const};
    }
    const containing = included.filter(
      (item) =>
        item.source_start_frame <= match.source_start_frame &&
        item.source_end_frame >= match.source_end_frame,
    );
    if (containing.length !== 1) throw new Error('VIDEO-OS-CASE-AUDIO-ROOM-TONE-NOT-INCLUDED');
    const item = containing[0]!;
    return {
      ...common,
      treatment: 'ROOM_TONE_IDENTIFIER' as const,
      output_start_frame:
        item.output_start_frame + match.source_start_frame - item.source_start_frame,
      output_end_frame: item.output_start_frame + match.source_end_frame - item.source_start_frame,
    };
  });
