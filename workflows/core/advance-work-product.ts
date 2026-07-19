import {
  WorkProductSchema,
  type GlobalWorkState,
  type WorkProduct,
} from '../../core/contracts/index.ts';
import {
  transitionGlobalState,
  TransitionRequestSchema,
  type TransitionRequest,
} from '../../core/state-machine/index.ts';

export function advanceWorkProduct(
  workProductInput: unknown,
  nextState: GlobalWorkState,
  transitionInput: unknown,
): WorkProduct {
  const workProduct = WorkProductSchema.parse(workProductInput);
  const transition = TransitionRequestSchema.parse(transitionInput);

  if (
    transition.artifactId !== workProduct.artifactId ||
    transition.artifactHash !== workProduct.contentHash ||
    transition.producerActorId !== workProduct.producerActorId
  ) {
    throw new Error('Transition request is not bound to this work product');
  }

  const state = transitionGlobalState(workProduct.state, nextState, transition);
  return WorkProductSchema.parse({...workProduct, state});
}

export function transitionRequestFor(
  workProductInput: unknown,
  input: Omit<TransitionRequest, 'artifactHash' | 'artifactId' | 'producerActorId'>,
): TransitionRequest {
  const workProduct = WorkProductSchema.parse(workProductInput);
  return TransitionRequestSchema.parse({
    ...input,
    artifactId: workProduct.artifactId,
    artifactHash: workProduct.contentHash,
    producerActorId: workProduct.producerActorId,
  });
}
