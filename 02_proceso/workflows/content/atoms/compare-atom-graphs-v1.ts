import type {ContentAtomGraphV1} from '../../../core/contracts/creation-atoms-v1.ts';

export type GraphBoundApprovalV1 = {
  approvalId: string;
  graphSha256: string;
};

export type AtomGraphComparisonV1 = {
  previousGraphSha256: string;
  currentGraphSha256: string;
  unchangedAtomIds: string[];
  changedAtomIds: string[];
  newAtomIds: string[];
  removedAtomIds: string[];
  invalidatedAtomIds: string[];
  staleApprovalIds: string[];
  currentApprovalIds: string[];
};

const compareText = (left: string, right: string): number =>
  left < right ? -1 : left > right ? 1 : 0;

export const compareAtomGraphsV1 = (
  previous: ContentAtomGraphV1,
  current: ContentAtomGraphV1,
  approvals: readonly GraphBoundApprovalV1[] = [],
): AtomGraphComparisonV1 => {
  const previousById = new Map(
    previous.atoms.filter(({status}) => status === 'active').map((atom) => [atom.atomId, atom]),
  );
  const currentById = new Map(
    current.atoms.filter(({status}) => status === 'active').map((atom) => [atom.atomId, atom]),
  );
  const unchangedAtomIds: string[] = [];
  const changedAtomIds: string[] = [];
  const newAtomIds: string[] = [];
  const removedAtomIds: string[] = [];
  for (const [atomId, atom] of currentById) {
    const prior = previousById.get(atomId);
    if (prior === undefined) newAtomIds.push(atomId);
    else if (prior.outputSha256 === atom.outputSha256) unchangedAtomIds.push(atomId);
    else changedAtomIds.push(atomId);
  }
  for (const atomId of previousById.keys()) {
    if (!currentById.has(atomId)) removedAtomIds.push(atomId);
  }

  const invalidated = new Set([...changedAtomIds, ...newAtomIds, ...removedAtomIds]);
  const outgoingHard = new Map<string, string[]>();
  for (const edge of current.edges) {
    if (edge.propagationPolicy !== 'hard') continue;
    outgoingHard.set(edge.sourceAtomId, [
      ...(outgoingHard.get(edge.sourceAtomId) ?? []),
      edge.targetAtomId,
    ]);
  }
  const queue = [...invalidated];
  while (queue.length > 0) {
    const atomId = queue.shift();
    if (atomId === undefined) break;
    for (const targetId of outgoingHard.get(atomId) ?? []) {
      if (invalidated.has(targetId)) continue;
      invalidated.add(targetId);
      queue.push(targetId);
    }
  }

  return {
    previousGraphSha256: previous.graphSha256,
    currentGraphSha256: current.graphSha256,
    unchangedAtomIds: unchangedAtomIds.sort(compareText),
    changedAtomIds: changedAtomIds.sort(compareText),
    newAtomIds: newAtomIds.sort(compareText),
    removedAtomIds: removedAtomIds.sort(compareText),
    invalidatedAtomIds: [...invalidated].sort(compareText),
    staleApprovalIds: approvals
      .filter(({graphSha256}) => graphSha256 !== current.graphSha256)
      .map(({approvalId}) => approvalId)
      .sort(compareText),
    currentApprovalIds: approvals
      .filter(({graphSha256}) => graphSha256 === current.graphSha256)
      .map(({approvalId}) => approvalId)
      .sort(compareText),
  };
};
