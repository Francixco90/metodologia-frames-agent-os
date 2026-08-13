import {TrainerStateSchema} from './trainer-run-manifest-v1.schema.ts';

export const STATES = TrainerStateSchema.options;
export type TrainerState = (typeof STATES)[number];

export const transition = (current: TrainerState, next: TrainerState): TrainerState => {
  const currentIndex = STATES.indexOf(current);
  const nextIndex = STATES.indexOf(next);
  if (nextIndex !== currentIndex + 1)
    throw new Error(`TRAINER_INVALID_TRANSITION:${current}->${next}`);
  return next;
};

export const invalidateFromIntake = () =>
  ['routeSpec', 'designLock', 'artifactPlan', 'buildManifest', 'verificationReceipt'] as const;

export const invalidateFromSpec = () =>
  ['designLock', 'artifactPlan', 'buildManifest', 'verificationReceipt'] as const;
