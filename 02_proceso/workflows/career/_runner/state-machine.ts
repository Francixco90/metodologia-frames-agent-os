import {
  CareerEventV1Schema,
  type CareerApplicationState,
  type CareerEventV1,
} from '../_schema/state-v1.schema.ts';

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

export const transitionCareerState = (input: unknown): CareerApplicationState => {
  const event = CareerEventV1Schema.parse(input);
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
  if (event.to === 'SUBMITTED' && event.evidence_refs.length === 0) {
    throw new CareerStateTransitionError('SUBMITTED requires material confirmation evidence');
  }
  return event.to;
};
