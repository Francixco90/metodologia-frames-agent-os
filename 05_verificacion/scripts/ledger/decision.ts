// ledger/decision.ts — resolves the disposition decision for a baseline path
// (immutable_history | quarantined | superseded | verified_no_change |
// generator_fixed | refactored) plus current-byte lookup and authored/generated
// classification. [CÓDIGO]
import {existsSync, lstatSync, readFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {
  type Disposition,
  generatedPaths,
  isHistoricalEvidence,
  isRuntimeGeneratedEvidence,
  ledgerProjectionPaths,
  quarantinePrefix,
  supersessionByPath,
} from '../lib/file-disposition-policy-v3.ts';
import {generatorRefFor} from './generator-refs.ts';

export const currentBytesFor = (root: string, path: string): Buffer | null => {
  const currentPath = resolve(root, path);
  return existsSync(currentPath) && lstatSync(currentPath).isFile()
    ? readFileSync(currentPath)
    : null;
};

export const isGeneratedProjection = (path: string): boolean =>
  generatedPaths.has(path) ||
  ledgerProjectionPaths.has(path) ||
  path.startsWith('brand/generated/') ||
  /^content\/[^/]+\/generated\//u.test(path) ||
  /^workflows\/multimedia\/p\d{2}-[^/]+\/templates\/[^/]+\.template\.(?:md|html)$/u.test(path) ||
  isRuntimeGeneratedEvidence(path) ||
  /^projects\/[^/]+\/artifacts\//u.test(path);

export const isAuthoredEligible = (path: string): boolean =>
  !isHistoricalEvidence(path) && !isGeneratedProjection(path);

export const decisionFor = (
  path: string,
  byteIdentical: boolean,
): {
  decision: Disposition;
  justification: string;
  generatorRef: string | null;
  successorPath: string | null;
} => {
  if (isHistoricalEvidence(path)) {
    return {
      decision: 'immutable_history',
      justification:
        'Historical evidence is excluded from refactoring and must preserve its baseline bytes.',
      generatorRef: null,
      successorPath: null,
    };
  }
  if (path.startsWith(quarantinePrefix)) {
    return {
      decision: 'quarantined',
      justification:
        'The locally authored legacy Stitch wrapper remains audit-only and cannot enter production routing.',
      generatorRef: null,
      successorPath: null,
    };
  }
  const successorPath = supersessionByPath.get(path);
  if (successorPath !== undefined) {
    return {
      decision: 'superseded',
      justification: `A real versioned successor exists at ${successorPath}; lineage remains explicit.`,
      generatorRef: null,
      successorPath,
    };
  }
  if (byteIdentical) {
    return {
      decision: 'verified_no_change',
      justification:
        'Working-tree bytes equal the baseline; no material improvement is claimed for this file.',
      generatorRef: null,
      successorPath: null,
    };
  }
  const generatorRef = generatorRefFor(path);
  if (generatorRef !== null) {
    return {
      decision: 'generator_fixed',
      justification:
        'The canonical generator changed; derived outputs must be regenerated and verified, never patched as source.',
      generatorRef,
      successorPath: null,
    };
  }
  return {
    decision: 'refactored',
    justification:
      'Baseline bytes changed under the resolved owner; compatibility and repository checks are required.',
    generatorRef: null,
    successorPath: null,
  };
};
