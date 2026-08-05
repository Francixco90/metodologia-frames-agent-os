import type {
  Approval,
  GlobalWorkState,
  PortableRef,
  WorkProduct,
} from '../../../../core/contracts/index.ts';

export const HASH_A = 'a'.repeat(64);
export const HASH_B = 'b'.repeat(64);
export const HASH_C = 'c'.repeat(64);
export const NOW = '2026-07-19T12:00:00Z';

export function portableRef(kind: PortableRef['kind'], id: string): PortableRef {
  return {
    schemaVersion: 'portable-ref-v1',
    kind,
    id,
    digest: HASH_A,
  };
}

export function workProduct(state: GlobalWorkState = 'IDEATED'): WorkProduct {
  return {
    schemaVersion: 'work-product-v1',
    artifactId: 'artifact:vs001',
    artifactType: 'campaign',
    version: '1.0.0',
    contentHash: HASH_A,
    producerActorId: 'actor:producer',
    state,
    sourceIds: ['source:one'],
    claimIds: [],
    notebookBindingIds: [],
    metadata: {},
  };
}

export function approval(
  fromState: Approval['fromState'],
  toState: Approval['toState'],
  approverRole: Approval['approverRole'],
): Approval {
  const approverActorId =
    approverRole === 'guardian'
      ? 'RT-11'
      : approverRole === 'human'
        ? 'H01'
        : `actor:${approverRole}`;

  return {
    schemaVersion: 'approval-v1',
    approvalId: `approval:${fromState.toLowerCase()}:${toState.toLowerCase()}`,
    artifactId: 'artifact:vs001',
    artifactVersion: '1.0.0',
    artifactHash: HASH_A,
    fromState,
    toState,
    decision: 'approved',
    producerActorId: 'actor:producer',
    approverActorId,
    approverRole,
    conditions: [],
    risksAccepted: [],
    evidenceHashes: [HASH_B],
    decidedAt: NOW,
  };
}
