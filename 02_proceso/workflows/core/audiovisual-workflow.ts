import {z} from 'zod';

import {
  ActorIdSchema,
  AudiovisualWorkStateSchema,
  PortableIdSchema,
  Sha256Schema,
  type AudiovisualWorkState,
} from '../../core/contracts/index.ts';
import {
  transitionAudiovisualState,
  TransitionRequestSchema,
} from '../../core/state-machine/index.ts';

export const AudiovisualWorkflowRecordSchema = z.strictObject({
  schemaVersion: z.literal('audiovisual-workflow-v1'),
  artifactId: PortableIdSchema,
  artifactHash: Sha256Schema,
  producerActorId: ActorIdSchema,
  state: AudiovisualWorkStateSchema,
});

export type AudiovisualWorkflowRecord = z.infer<typeof AudiovisualWorkflowRecordSchema>;

export function advanceAudiovisualWorkflow(
  recordInput: unknown,
  nextState: AudiovisualWorkState,
  transitionInput: unknown,
): AudiovisualWorkflowRecord {
  const record = AudiovisualWorkflowRecordSchema.parse(recordInput);
  const transition = TransitionRequestSchema.parse(transitionInput);
  if (
    transition.artifactId !== record.artifactId ||
    transition.artifactHash !== record.artifactHash ||
    transition.producerActorId !== record.producerActorId
  ) {
    throw new Error('Transition request is not bound to this audiovisual artifact');
  }

  const state = transitionAudiovisualState(record.state, nextState, transition);
  return AudiovisualWorkflowRecordSchema.parse({...record, state});
}
