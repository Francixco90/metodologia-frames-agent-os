const normalizeReasoningText = (value: string): string =>
  value
    .normalize('NFKC')
    .replace(/[\u2010-\u2015]/gu, '-')
    .toLocaleLowerCase('en-US');

const prohibitedReasoningPattern =
  /\b(?:chain[\s_-]+of[\s_-]+thought|hidden[\s_-]+reasoning|private[\s_-]+reasoning|scratchpad|cadena[\s_-]+de[\s_-]+pensamiento|razonamiento[\s_-]+privado)\b/iu;

export function containsProhibitedReasoningText(value: unknown): boolean {
  if (typeof value === 'string') {
    return prohibitedReasoningPattern.test(normalizeReasoningText(value));
  }
  if (Array.isArray(value)) {
    return value.some((item) => containsProhibitedReasoningText(item));
  }
  if (value !== null && typeof value === 'object') {
    return Object.values(value).some((item) => containsProhibitedReasoningText(item));
  }
  return false;
}
