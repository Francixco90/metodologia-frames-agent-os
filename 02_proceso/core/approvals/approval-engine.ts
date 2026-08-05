import {
  ApprovalSchema,
  WorkProductSchema,
  type Approval,
  type GlobalWorkState,
  type WorkProduct,
} from '../contracts/index.ts';
import {
  transitionGlobalState,
  TransitionRequestSchema,
  type TransitionRequest,
} from '../state-machine/index.ts';

export class ApprovalValidationError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'ApprovalValidationError';
  }
}

export function validateApprovalBinding(
  workProductInput: unknown,
  approvalInput: unknown,
): {approval: Approval; workProduct: WorkProduct} {
  const workProduct = WorkProductSchema.parse(workProductInput);
  const approval = ApprovalSchema.parse(approvalInput);

  if (approval.artifactId !== workProduct.artifactId) {
    throw new ApprovalValidationError('Approval artifact ID does not match');
  }
  if (approval.artifactVersion !== workProduct.version) {
    throw new ApprovalValidationError('Approval artifact version does not match');
  }
  if (approval.artifactHash !== workProduct.contentHash) {
    throw new ApprovalValidationError('Approval artifact hash does not match');
  }
  if (approval.producerActorId !== workProduct.producerActorId) {
    throw new ApprovalValidationError('Approval producer does not match');
  }
  if (approval.approverActorId === workProduct.producerActorId) {
    throw new ApprovalValidationError('Producer cannot approve their own artifact');
  }
  if (approval.fromState !== workProduct.state) {
    throw new ApprovalValidationError('Approval is stale for the current artifact state');
  }
  if (approval.decision !== 'approved') {
    throw new ApprovalValidationError(`Approval decision is ${approval.decision}`);
  }

  return {approval, workProduct};
}

export function applyApprovedTransition(
  workProductInput: unknown,
  nextState: GlobalWorkState,
  approvalInput: unknown,
  transitionInput: Omit<TransitionRequest, 'approval' | 'actorId' | 'actorRole'>,
): WorkProduct {
  const {approval, workProduct} = validateApprovalBinding(workProductInput, approvalInput);
  if (approval.toState !== nextState) {
    throw new ApprovalValidationError('Approval targets a different state');
  }

  const request = TransitionRequestSchema.parse({
    ...transitionInput,
    actorId: approval.approverActorId,
    actorRole: approval.approverRole,
    approval,
  });
  const state = transitionGlobalState(workProduct.state, nextState, request);
  return WorkProductSchema.parse({...workProduct, state});
}
