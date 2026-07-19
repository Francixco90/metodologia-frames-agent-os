import {z} from 'zod';

import {
  ActorIdSchema,
  ApprovalSchema,
  AudiovisualWorkStateSchema,
  CANONICAL_GUARDIAN_ACTOR_ID,
  CANONICAL_HUMAN_APPROVER_ACTOR_ID,
  GlobalWorkStateSchema,
  PortableIdSchema,
  ReleaseReceiptSchema,
  Sha256Schema,
  type Approval,
  type AudiovisualWorkState,
  type GlobalWorkState,
} from '../contracts/index.ts';

export const TransitionEvidenceKindSchema = z.enum([
  'classification',
  'source-lock',
  'discovery',
  'definition',
  'ideation',
  'committee-decision',
  'spec',
  'beat-map',
  'visual-system',
  'component-registry',
  'build',
  'test-report',
  'review-shots',
  'render-receipt',
  'postproduction-receipt',
  'guardian-verdict',
  'human-approval',
  'release-proposal',
  'release-authorization',
  'publish-receipt',
]);

export const TransitionRequestSchema = z
  .strictObject({
    artifactId: PortableIdSchema,
    artifactHash: Sha256Schema,
    producerActorId: ActorIdSchema,
    actorId: ActorIdSchema,
    actorRole: z.enum(['producer', 'committee', 'guardian', 'human', 'release-owner', 'system']),
    evidence: z
      .array(
        z.strictObject({
          kind: TransitionEvidenceKindSchema,
          hash: Sha256Schema,
        }),
      )
      .min(1),
    approval: ApprovalSchema.optional(),
    releaseReceipt: ReleaseReceiptSchema.optional(),
  })
  .superRefine((request, context) => {
    if (
      request.producerActorId === CANONICAL_GUARDIAN_ACTOR_ID ||
      request.producerActorId === CANONICAL_HUMAN_APPROVER_ACTOR_ID
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Producer cannot be the canonical Guardian or human approver.',
        path: ['producerActorId'],
      });
    }
    if (request.actorRole === 'guardian' && request.actorId !== CANONICAL_GUARDIAN_ACTOR_ID) {
      context.addIssue({
        code: 'custom',
        message: `Guardian transitions must be executed by ${CANONICAL_GUARDIAN_ACTOR_ID}.`,
        path: ['actorId'],
      });
    }
    if (request.actorRole === 'human' && request.actorId !== CANONICAL_HUMAN_APPROVER_ACTOR_ID) {
      context.addIssue({
        code: 'custom',
        message: `Human transitions must be executed by ${CANONICAL_HUMAN_APPROVER_ACTOR_ID}.`,
        path: ['actorId'],
      });
    }
    if (request.actorId === CANONICAL_HUMAN_APPROVER_ACTOR_ID && request.actorRole !== 'human') {
      context.addIssue({
        code: 'custom',
        message: `${CANONICAL_HUMAN_APPROVER_ACTOR_ID} cannot act outside the human approver role.`,
        path: ['actorRole'],
      });
    }
    if (request.actorId === CANONICAL_GUARDIAN_ACTOR_ID && request.actorRole !== 'guardian') {
      context.addIssue({
        code: 'custom',
        message: `${CANONICAL_GUARDIAN_ACTOR_ID} cannot act outside the Guardian role.`,
        path: ['actorRole'],
      });
    }
  });

export type TransitionRequest = z.infer<typeof TransitionRequestSchema>;

type EvidenceKind = z.infer<typeof TransitionEvidenceKindSchema>;
type ApprovalRole = Approval['approverRole'];

interface GatePolicy {
  readonly approvalRole?: ApprovalRole;
  readonly evidence: readonly EvidenceKind[];
  readonly independentRole?: 'guardian';
  readonly releaseReceipt?: true;
}

export class StateTransitionError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'StateTransitionError';
  }
}

const globalOrder = GlobalWorkStateSchema.options;
const audiovisualOrder = AudiovisualWorkStateSchema.options;

const globalPolicies: Readonly<Record<GlobalWorkState, GatePolicy>> = {
  INGESTED: {evidence: []},
  CLASSIFIED: {evidence: ['classification']},
  SOURCE_LOCKED: {evidence: ['source-lock']},
  DISCOVERED: {evidence: ['discovery']},
  DEFINED: {evidence: ['definition']},
  IDEATED: {evidence: ['ideation']},
  DIRECTION_APPROVED: {
    approvalRole: 'committee',
    evidence: ['committee-decision'],
  },
  SPECIFIED: {evidence: ['spec']},
  BUILT: {evidence: ['build']},
  VALIDATED: {evidence: ['test-report']},
  GUARDIAN_PASS: {
    evidence: ['guardian-verdict'],
    independentRole: 'guardian',
  },
  HUMAN_APPROVED: {
    approvalRole: 'human',
    evidence: ['human-approval'],
  },
  READY: {evidence: ['human-approval']},
  RELEASE_PROPOSED: {evidence: ['release-proposal']},
  RELEASE_AUTHORIZED: {
    approvalRole: 'release-owner',
    evidence: ['release-authorization'],
  },
  PUBLISHED: {
    evidence: ['publish-receipt'],
    releaseReceipt: true,
  },
};

const audiovisualPolicies: Readonly<Record<AudiovisualWorkState, GatePolicy>> = {
  SOURCE_LOCKED: {evidence: []},
  SPEC_APPROVED: {
    approvalRole: 'committee',
    evidence: ['spec', 'committee-decision'],
  },
  BEATS_APPROVED: {
    approvalRole: 'committee',
    evidence: ['beat-map', 'committee-decision'],
  },
  VISUAL_SYSTEM_APPROVED: {
    approvalRole: 'committee',
    evidence: ['visual-system', 'committee-decision'],
  },
  REGISTRY_APPROVED: {
    approvalRole: 'committee',
    evidence: ['component-registry', 'committee-decision'],
  },
  BUILD_VALIDATED: {evidence: ['build', 'test-report']},
  REVIEW_SHOTS_APPROVED: {
    approvalRole: 'committee',
    evidence: ['review-shots', 'committee-decision'],
  },
  RENDER_VALIDATED: {evidence: ['render-receipt']},
  POSTPRODUCTION_VALIDATED: {evidence: ['postproduction-receipt']},
  GUARDIAN_PASS: {
    evidence: ['guardian-verdict'],
    independentRole: 'guardian',
  },
  HUMAN_APPROVED: {
    approvalRole: 'human',
    evidence: ['human-approval'],
  },
  READY: {evidence: ['human-approval']},
};

function assertDirectTransition<State extends string>(
  order: readonly State[],
  current: State,
  next: State,
): void {
  const currentIndex = order.indexOf(current);
  const nextIndex = order.indexOf(next);
  if (currentIndex < 0 || nextIndex < 0 || nextIndex !== currentIndex + 1) {
    throw new StateTransitionError(`Illegal state transition: ${current} -> ${next}`);
  }
}

function assertEvidence(policy: GatePolicy, request: TransitionRequest): void {
  const supplied = new Set(request.evidence.map((item) => item.kind));
  const missing = policy.evidence.filter((kind) => !supplied.has(kind));
  if (missing.length > 0) {
    throw new StateTransitionError(`Missing transition evidence: ${missing.join(', ')}`);
  }
}

function assertApproval(
  approvalRole: ApprovalRole,
  current: string,
  next: string,
  request: TransitionRequest,
): void {
  const approval = request.approval;
  if (approval === undefined) {
    throw new StateTransitionError(`Transition ${current} -> ${next} requires approval`);
  }
  if (approval.decision !== 'approved') {
    throw new StateTransitionError(`Approval decision is ${approval.decision}`);
  }
  if (approval.approverRole !== approvalRole) {
    throw new StateTransitionError(
      `Expected ${approvalRole} approval, received ${approval.approverRole}`,
    );
  }
  if (request.actorId !== approval.approverActorId || request.actorRole !== approval.approverRole) {
    throw new StateTransitionError('Transition actor does not match the bound approver');
  }
  if (
    approval.artifactId !== request.artifactId ||
    approval.artifactHash !== request.artifactHash ||
    approval.producerActorId !== request.producerActorId
  ) {
    throw new StateTransitionError('Approval is not bound to this artifact and producer');
  }
  if (approval.fromState !== current || approval.toState !== next) {
    throw new StateTransitionError('Approval is not bound to this state transition');
  }
  const requestEvidenceHashes = new Set(request.evidence.map(({hash}) => hash));
  const approvalEvidenceHashes = new Set(approval.evidenceHashes);
  if (
    requestEvidenceHashes.size !== approvalEvidenceHashes.size ||
    [...requestEvidenceHashes].some((hash) => !approvalEvidenceHashes.has(hash))
  ) {
    throw new StateTransitionError(
      'Approval evidence hashes do not match the transition evidence hashes',
    );
  }
}

function assertIndependentGuardian(policy: GatePolicy, request: TransitionRequest): void {
  if (policy.independentRole !== 'guardian') {
    return;
  }
  if (request.actorRole !== 'guardian') {
    throw new StateTransitionError('Guardian gate requires a guardian actor');
  }
  if (request.actorId !== CANONICAL_GUARDIAN_ACTOR_ID) {
    throw new StateTransitionError(
      `Guardian gate requires canonical actor ${CANONICAL_GUARDIAN_ACTOR_ID}`,
    );
  }
}

function assertReleaseReceipt(policy: GatePolicy, request: TransitionRequest): void {
  if (policy.releaseReceipt !== true) {
    return;
  }
  const receipt = request.releaseReceipt;
  if (receipt === undefined) {
    throw new StateTransitionError('Publishing requires a release receipt');
  }
  if (
    receipt.status !== 'published' ||
    receipt.dryRun ||
    receipt.artifactId !== request.artifactId ||
    receipt.artifactHash !== request.artifactHash
  ) {
    throw new StateTransitionError('Release receipt does not authorize this publication');
  }
}

function executeTransition<State extends string>(
  order: readonly State[],
  policies: Readonly<Record<State, GatePolicy>>,
  current: State,
  next: State,
  input: unknown,
): State {
  const request = TransitionRequestSchema.parse(input);
  assertDirectTransition(order, current, next);
  const policy = policies[next];
  assertEvidence(policy, request);
  assertIndependentGuardian(policy, request);
  if (policy.approvalRole !== undefined) {
    assertApproval(policy.approvalRole, current, next, request);
  }
  assertReleaseReceipt(policy, request);
  return next;
}

export function transitionGlobalState(
  current: GlobalWorkState,
  next: GlobalWorkState,
  request: unknown,
): GlobalWorkState {
  return executeTransition(globalOrder, globalPolicies, current, next, request);
}

export function transitionAudiovisualState(
  current: AudiovisualWorkState,
  next: AudiovisualWorkState,
  request: unknown,
): AudiovisualWorkState {
  return executeTransition(audiovisualOrder, audiovisualPolicies, current, next, request);
}

export function nextGlobalState(current: GlobalWorkState): GlobalWorkState | undefined {
  return globalOrder[globalOrder.indexOf(current) + 1];
}

export function nextAudiovisualState(
  current: AudiovisualWorkState,
): AudiovisualWorkState | undefined {
  return audiovisualOrder[audiovisualOrder.indexOf(current) + 1];
}
