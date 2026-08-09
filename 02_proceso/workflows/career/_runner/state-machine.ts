import {
  CareerEventV1Schema,
  SubmittedTransitionV1Schema,
  type CareerApplicationState,
  type CareerEventV1,
} from '../_schema/state-v1.schema.ts';
import {assertMaterialConfirmation} from './confirmation-evidence.ts';

const allowed: Readonly<Record<CareerApplicationState, readonly CareerApplicationState[]>> = {
  DISCOVERED: ['VALIDATED', 'BLOCKED', 'CLOSED'],
  VALIDATED: ['SHORTLISTED', 'BLOCKED', 'CLOSED'],
  SHORTLISTED: ['PACKAGED', 'BLOCKED', 'CLOSED'],
  PACKAGED: ['DRAFTED', 'BLOCKED', 'CLOSED'],
  DRAFTED: ['SUBMITTED', 'BLOCKED', 'CLOSED'],
  SUBMITTED: ['INTERVIEW', 'OFFER', 'REJECTED', 'CLOSED', 'BLOCKED'],
  BLOCKED: ['VALIDATED', 'SHORTLISTED', 'PACKAGED', 'DRAFTED', 'CLOSED'],
  CLOSED: [],
  REJECTED: ['CLOSED'],
  INTERVIEW: ['OFFER', 'REJECTED', 'CLOSED', 'BLOCKED'],
  OFFER: ['CLOSED'],
};

const expectedKind: Partial<Record<CareerApplicationState, CareerEventV1['kind']>> = {
  VALIDATED: 'job-validated',
  SHORTLISTED: 'fit-scored',
  PACKAGED: 'evidence-packaged',
  DRAFTED: 'documents-drafted',
  SUBMITTED: 'submission-confirmed',
  REJECTED: 'rejected',
  INTERVIEW: 'interview-confirmed',
  OFFER: 'offer-confirmed',
};

export class CareerStateTransitionError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'CareerStateTransitionError';
  }
}

const assertSubmittedEvidence = (input: unknown, root: string | undefined): CareerEventV1 => {
  const packet = SubmittedTransitionV1Schema.parse(input);
  const {authorization, confirmation, event} = packet;
  const actors = [
    packet.producer_actor_id,
    packet.verifier_actor_id,
    packet.guardian_actor_id,
    confirmation.submitted_by_actor_id,
  ];
  if (new Set(actors).size !== actors.length || actors.includes(authorization.approver_actor_id)) {
    throw new CareerStateTransitionError(
      'SUBMITTED requires distinct producer, verifier, Guardian, submitter and approver',
    );
  }
  if (authorization.status !== 'authorized' || !authorization.single_use) {
    throw new CareerStateTransitionError('SUBMITTED requires a current single-use authorization');
  }
  const bindings = [
    authorization.authorization_id === confirmation.authorization_id,
    authorization.candidate_id === confirmation.candidate_id,
    authorization.application_id === confirmation.application_id,
    authorization.application_id === event.application_id,
    authorization.channel === confirmation.channel,
    authorization.job_sha256 === confirmation.job_sha256,
    authorization.package_sha256 === confirmation.package_sha256,
    authorization.package_sha256 === event.artifact_sha256,
    confirmation.submitted_by_actor_id === event.actor_id,
    event.evidence_refs.includes(confirmation.confirmation_ref),
  ];
  if (bindings.some((binding) => !binding)) {
    throw new CareerStateTransitionError(
      'SUBMITTED authorization or confirmation binding mismatch',
    );
  }
  if (!root) throw new CareerStateTransitionError('SUBMITTED requires an explicit runtime root');
  assertMaterialConfirmation({
    root,
    ref: confirmation.confirmation_ref,
    sha256: confirmation.confirmation_sha256,
  });
  return event;
};

export const transitionCareerState = (
  input: unknown,
  runtime?: {root: string},
): CareerApplicationState => {
  const possibleEvent =
    typeof input === 'object' && input !== null && 'event' in input ? input.event : input;
  const event = CareerEventV1Schema.parse(possibleEvent);
  if (event.from === null) {
    if (event.to !== 'DISCOVERED' || event.kind !== 'job-captured') {
      throw new CareerStateTransitionError('Initial event must capture a DISCOVERED job');
    }
    return event.to;
  }
  if (!allowed[event.from].includes(event.to)) {
    throw new CareerStateTransitionError(`Illegal career transition: ${event.from} -> ${event.to}`);
  }
  const kind = expectedKind[event.to];
  if (kind && event.kind !== kind) {
    throw new CareerStateTransitionError(`${event.to} requires event kind ${kind}`);
  }
  if (event.to === 'SUBMITTED') assertSubmittedEvidence(input, runtime?.root);
  return event.to;
};
