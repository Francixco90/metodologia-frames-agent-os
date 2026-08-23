import {canonicalJsonSha256, sha256Utf8} from '../../../core/canonical-json-sha256.ts';

const MAX_NORMALIZATION_CODE_UNITS = 10_000;
const MAX_POLICY_TOKENS = 2_048;

export class ExplainerTextError extends Error {
  constructor(code: string) {
    super(`METHOD-EXPLAINER-TEXT-${code}`);
    this.name = 'ExplainerTextError';
  }
}

export type NormalizedExplainerText = Readonly<{
  verbatim: string;
  tokens: readonly string[];
}>;

export const normalizeExplainerText = (raw: string): NormalizedExplainerText => {
  if (raw.length > MAX_NORMALIZATION_CODE_UNITS) throw new ExplainerTextError('TEXT-LIMIT');
  if (/\p{C}/u.test(raw)) throw new ExplainerTextError('UNSAFE-UNICODE-CATEGORY');
  const verbatim = raw.normalize('NFKC').replace(/\s+/gu, ' ').trim();
  if (/\p{C}/u.test(verbatim)) throw new ExplainerTextError('UNSAFE-UNICODE-CATEGORY');
  if (/\p{Script=Cyrillic}/u.test(verbatim)) throw new ExplainerTextError('CYRILLIC-SCRIPT');
  const tokens = verbatim.toLocaleLowerCase('es-419').match(/[\p{L}\p{M}\p{N}]+/gu) ?? [];
  return {verbatim, tokens};
};

export const sameTokenSequence = (left: readonly string[], right: readonly string[]) =>
  left.length === right.length && left.every((token, index) => token === right[index]);

const counts = (tokens: readonly string[]) => {
  const result = new Map<string, number>();
  tokens.forEach((token) => result.set(token, (result.get(token) ?? 0) + 1));
  return result;
};

const assertTokenBudget = (...lists: readonly (readonly string[])[]) => {
  if (lists.some((tokens) => tokens.length > MAX_POLICY_TOKENS))
    throw new ExplainerTextError('TOKEN-LIMIT');
};

export const multisetMetrics = (left: readonly string[], right: readonly string[]) => {
  assertTokenBudget(left, right);
  const leftCounts = counts(left);
  const rightCounts = counts(right);
  let shared = 0;
  for (const [token, count] of leftCounts) shared += Math.min(count, rightCounts.get(token) ?? 0);
  const shorter = Math.min(left.length, right.length);
  return {
    shared,
    containment: shorter >= 2 && shared === shorter,
    overlap_gt_70: shorter >= 2 && shared * 100 > shorter * 70,
    overlap_percent: shorter === 0 ? 0 : Math.floor((shared * 100) / shorter),
  } as const;
};

export const longestCommonSubsequenceLength = (
  left: readonly string[],
  right: readonly string[],
) => {
  assertTokenBudget(left, right);
  const row = new Uint32Array(right.length + 1);
  for (const leftToken of left) {
    let diagonal = 0;
    for (let index = 1; index <= right.length; index++) {
      const previous = row[index]!;
      row[index] =
        leftToken === right[index - 1] ? diagonal + 1 : Math.max(row[index]!, row[index - 1]!);
      diagonal = previous;
    }
  }
  return row[right.length] ?? 0;
};

export const sharedNgramCount = (left: readonly string[], right: readonly string[], size = 2) => {
  assertTokenBudget(left, right);
  if (!Number.isInteger(size) || size < 1 || size > 8) throw new ExplainerTextError('NGRAM-SIZE');
  const grams = (tokens: readonly string[]) =>
    new Set(
      tokens
        .slice(0, Math.max(0, tokens.length - size + 1))
        .map((_, index) => tokens.slice(index, index + size).join('\u0000')),
    );
  const leftGrams = grams(left);
  return [...grams(right)].filter((gram) => leftGrams.has(gram)).length;
};

const KNOWN_VOSEO = new Set([
  'vos',
  'sos',
  'hablás',
  'trabajás',
  'planificás',
  'acelerás',
  'delegás',
  'usás',
  'probás',
  'empezás',
  'pensás',
  'lográs',
  'creás',
  'aplicás',
  'necesitás',
  'tenés',
  'podés',
  'querés',
  'sabés',
  'hacés',
  'decís',
  'venís',
  'elegís',
  'seguís',
  'sentís',
  'decidís',
  'hablá',
  'trabajá',
  'planificá',
  'acelerá',
  'delegá',
  'vení',
  'mirá',
  'usá',
  'probá',
  'empezá',
  'poné',
  'hacé',
  'decí',
  'escribí',
  'seguí',
]);

export const containsKnownVoseo = (texts: readonly NormalizedExplainerText[]) =>
  texts.some(({tokens}) => tokens.some((token) => KNOWN_VOSEO.has(token)));

type CopyRoles = Readonly<{
  voiceover: string;
  accessibility_caption: string;
  on_screen: readonly string[];
}>;
export const deriveCopyRoleHashes = (input: CopyRoles) => {
  const voice = normalizeExplainerText(input.voiceover);
  const caption = normalizeExplainerText(input.accessibility_caption);
  const screen = input.on_screen.map(normalizeExplainerText);
  return {
    voiceover: sha256Utf8(voice.verbatim),
    accessibility_caption: sha256Utf8(caption.verbatim),
    on_screen: canonicalJsonSha256(screen.map(({verbatim}) => verbatim)),
  } as const;
};
