import {TrainerStateSchema} from './trainer-run-manifest-v1.schema.ts';

export const STATES = TrainerStateSchema.options;
export type TrainerState = (typeof STATES)[number];

export const transition = (current: TrainerState, next: TrainerState): TrainerState => {
  const parsedCurrent = TrainerStateSchema.parse(current);
  const parsedNext = TrainerStateSchema.parse(next);
  const currentIndex = STATES.indexOf(parsedCurrent);
  const nextIndex = STATES.indexOf(parsedNext);
  if (nextIndex !== currentIndex + 1)
    throw new Error(`TRAINER_INVALID_TRANSITION:${parsedCurrent}->${parsedNext}`);
  return parsedNext;
};

export const invalidateFromIntake = () =>
  [
    'routeSpec',
    'designLock',
    'artifactPlan',
    'buildManifest',
    'verificationReceipt',
    'humanReviewReceipt',
  ] as const;

export const invalidateFromSpec = () =>
  [
    'designLock',
    'artifactPlan',
    'buildManifest',
    'verificationReceipt',
    'humanReviewReceipt',
  ] as const;
