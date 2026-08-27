import {readFileSync} from 'node:fs';
import {basename} from 'node:path';

import {
  CANON_V3_DUPLICATE_CONTAINMENT_LIMIT,
  type DuplicatePair,
  type ParsedKnowledgeDocument,
} from './model.ts';
import {walkFiles} from './io.ts';

interface DuplicateJustification {
  left_document_id: string;
  right_document_id: string;
  reason: string;
}

const duplicateTokens = (body: string): string[] => {
  const substantive = body
    .replace(/<navigation(?:\s[^>]*)?>[\s\S]*?<\/navigation>/gu, ' ')
    .replace(/<related_documents(?:\s[^>]*)?>[\s\S]*?<\/related_documents>/gu, ' ')
    .replace(/<change_log(?:\s[^>]*)?>[\s\S]*?<\/change_log>/gu, ' ')
    .replace(/^\s*<\/?[a-z_][^>]*>\s*$/gimu, ' ')
    .replace(/^#{1,6}\s+.*$/gmu, ' ');
  return substantive.toLocaleLowerCase('en').match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu) ?? [];
};

const fiveGrams = (tokens: string[]): Set<string> => {
  const grams = new Set<string>();
  for (let index = 0; index <= tokens.length - 5; index += 1)
    grams.add(tokens.slice(index, index + 5).join(' '));
  return grams;
};

const containment = (left: Set<string>, right: Set<string>): number => {
  const denominator = Math.min(left.size, right.size);
  if (denominator === 0) return 0;
  let intersection = 0;
  for (const gram of left) if (right.has(gram)) intersection += 1;
  return intersection / denominator;
};

const pairKey = (left: string, right: string): string => [left, right].sort().join('\u0000');

const loadJustifications = (root: string): Map<string, string> => {
  const candidates = walkFiles(root).filter(
    (path) => basename(path) === 'duplicate-justifications.json',
  );
  if (candidates.length === 0) return new Map();
  if (candidates.length > 1) throw new Error('More than one duplicate-justifications.json found.');
  const entries =
    (
      JSON.parse(readFileSync(candidates[0]!, 'utf8')) as {
        justifications?: DuplicateJustification[];
      }
    ).justifications ?? [];
  const result = new Map<string, string>();
  for (const entry of entries) {
    if (!entry.left_document_id || !entry.right_document_id || entry.reason.trim().length < 20)
      throw new Error(
        'Duplicate justifications require two document IDs and a 20+ character reason.',
      );
    result.set(pairKey(entry.left_document_id, entry.right_document_id), entry.reason.trim());
  }
  return result;
};

export const validateSimilarity = (
  root: string,
  active: ParsedKnowledgeDocument[],
): {errors: string[]; pairs: DuplicatePair[]} => {
  const errors: string[] = [];
  const pairs: DuplicatePair[] = [];
  const justifications = loadJustifications(root);
  const grams = active.map((document) => ({
    document,
    grams: fiveGrams(duplicateTokens(document.body)),
  }));
  let unapproved = 0;
  for (let left = 0; left < grams.length; left += 1) {
    for (let right = left + 1; right < grams.length; right += 1) {
      const leftItem = grams[left]!;
      const rightItem = grams[right]!;
      const score = containment(leftItem.grams, rightItem.grams);
      if (score <= CANON_V3_DUPLICATE_CONTAINMENT_LIMIT) continue;
      const pair = {
        left: leftItem.document.metadata.document_id,
        right: rightItem.document.metadata.document_id,
        containment: Number(score.toFixed(4)),
      };
      pairs.push(pair);
      if (justifications.has(pairKey(pair.left, pair.right))) continue;
      unapproved += 1;
      if (unapproved <= 20)
        errors.push(
          `${pair.left}/${pair.right}: 5-gram containment ${pair.containment} exceeds ${CANON_V3_DUPLICATE_CONTAINMENT_LIMIT}.`,
        );
    }
  }
  if (unapproved > 20)
    errors.push(
      `${unapproved - 20} additional duplicate pairs exceed the threshold; inspect metrics.duplicatePairs.`,
    );
  return {errors, pairs};
};
