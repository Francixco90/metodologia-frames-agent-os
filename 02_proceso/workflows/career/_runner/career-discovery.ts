import {
  CareerDiscoverySessionV1Schema,
  type CareerDiscoverySessionV1,
} from '../_schema/career-discovery-v1.schema.ts';
import {
  CareerEvidenceReadinessV1Schema,
  EvidenceCandidatePacketV1Schema,
  type CareerEvidenceReadinessV1,
  type EvidenceCandidatePacketV1,
} from '../_schema/career-evidence-readiness-v1.schema.ts';
import {sha256Text, stableStringify} from './canonical.ts';

export const calculateDiscoverySessionHash = (
  input: Omit<CareerDiscoverySessionV1, 'session_sha256'>,
): string => sha256Text(stableStringify(input));

export const parseCareerDiscoverySession = (input: unknown): CareerDiscoverySessionV1 => {
  const parsed = CareerDiscoverySessionV1Schema.parse(input);
  const {session_sha256, ...payload} = parsed;
  const expected = sha256Text(stableStringify(payload));
  if (session_sha256 !== expected) throw new Error('career discovery session hash mismatch');
  return parsed;
};

const MATERIAL_GAP_DIMENSIONS = new Set(
  'achievement competency metric attribution contradiction evidence'.split(' '),
);

export const shouldDispatchCareerEvidenceInterview = (sessionInput: unknown): boolean => {
  const session = parseCareerDiscoverySession(sessionInput);
  if (session.state === 'PAUSED' || session.state === 'READY_FOR_CONFIRMATION') return false;
  return session.gaps.some(
    ({dimension, severity, status}) =>
      status === 'open' && (severity === 'blocking' || MATERIAL_GAP_DIMENSIONS.has(dimension)),
  );
};

export const calculateCandidatePacketHash = (
  input: Omit<EvidenceCandidatePacketV1, 'packet_sha256'>,
): string => sha256Text(stableStringify(input));

export const parseEvidenceCandidatePacket = (input: unknown): EvidenceCandidatePacketV1 => {
  const parsed = EvidenceCandidatePacketV1Schema.parse(input);
  const {packet_sha256, ...payload} = parsed;
  const expected = sha256Text(stableStringify(payload));
  if (packet_sha256 !== expected) throw new Error('evidence candidate packet hash mismatch');
  return parsed;
};

export const assertEvidenceCandidatePacketBindings = (
  packet: EvidenceCandidatePacketV1,
  session: CareerDiscoverySessionV1,
  observed: {
    candidateId: string;
    evidenceBankSha256: string;
    evidence: ReadonlyMap<string, 'verified' | 'user_confirmed' | 'inferred' | 'missing'>;
  },
): void => {
  if (
    packet.candidate_id !== session.candidate_id ||
    packet.candidate_id !== observed.candidateId ||
    packet.discovery_session_sha256 !== session.session_sha256 ||
    packet.evidence_bank_sha256 !== observed.evidenceBankSha256
  ) {
    throw new Error('candidate packet does not bind the discovery session');
  }
  const sources = new Map(session.source_inventory.map((source) => [source.source_id, source]));
  for (const item of packet.items) {
    const resolved = item.source_ids.map((sourceId) => sources.get(sourceId));
    if (resolved.some((source) => source === undefined)) {
      throw new Error('candidate item source missing');
    }
    if (resolved.some((source) => source?.authority === 'external_requirement')) {
      throw new Error('external requirements cannot support candidate items');
    }
    const evidenceConfidence = item.evidence_ids.map((evidenceId) =>
      observed.evidence.get(evidenceId),
    );
    if (evidenceConfidence.some((confidence) => confidence === undefined)) {
      throw new Error('candidate item evidence missing');
    }
    if (
      (item.confidence === 'verified' &&
        evidenceConfidence.some((confidence) => confidence !== 'verified')) ||
      (item.confidence === 'user_confirmed' &&
        evidenceConfidence.some(
          (confidence) => confidence !== 'verified' && confidence !== 'user_confirmed',
        ))
    ) {
      throw new Error('candidate item confidence exceeds observed evidence');
    }
    if (
      item.confidence === 'user_confirmed' &&
      resolved.some(
        (source) =>
          source?.source_type !== 'interview_answer' || source.authority !== 'candidate_statement',
      )
    ) {
      throw new Error('user_confirmed items require candidate interview answers');
    }
  }
};

export const calculateEvidenceReadinessHash = (
  input: Omit<CareerEvidenceReadinessV1, 'readiness_sha256'>,
): string => sha256Text(stableStringify(input));

export const parseCareerEvidenceReadiness = (input: unknown): CareerEvidenceReadinessV1 => {
  const parsed = CareerEvidenceReadinessV1Schema.parse(input);
  const {readiness_sha256, ...payload} = parsed;
  const expected = sha256Text(stableStringify(payload));
  if (readiness_sha256 !== expected) throw new Error('career evidence readiness hash mismatch');
  return parsed;
};

export type CvEvidenceAuthority = {
  packet: unknown;
  packet_ref: string;
  readiness: unknown;
  readiness_ref: string;
  evidence_ids: ReadonlySet<string>;
  gap_ids: ReadonlySet<string>;
  accepted_gap_ids: ReadonlySet<string>;
};

export const assertCvEvidenceAuthorityCurrent = (
  observed: {
    candidate_id: string;
    evidence_bank_sha256: string;
    evidence_candidate_packet_ref?: string | null | undefined;
    evidence_candidate_packet_sha256?: string | null | undefined;
    evidence_readiness_ref?: string | null | undefined;
    evidence_readiness_sha256?: string | null | undefined;
  },
  authority: CvEvidenceAuthority,
) => {
  const packet = parseEvidenceCandidatePacket(authority.packet);
  const readiness = parseCareerEvidenceReadiness(authority.readiness);
  assertCareerEvidenceReadinessBindings(readiness, packet, {
    candidateId: observed.candidate_id,
    evidenceBankSha256: observed.evidence_bank_sha256,
    evidenceIds: authority.evidence_ids,
    gapIds: authority.gap_ids,
    acceptedGapIds: authority.accepted_gap_ids,
  });
  if (
    readiness.status !== 'READY' ||
    observed.evidence_candidate_packet_ref !== authority.packet_ref ||
    observed.evidence_readiness_ref !== authority.readiness_ref ||
    observed.evidence_candidate_packet_sha256 !== packet.packet_sha256 ||
    observed.evidence_readiness_sha256 !== readiness.readiness_sha256
  ) {
    throw new Error('CV_SPEC_V2_EVIDENCE_READINESS_STALE');
  }
  return {packet, readiness};
};

export const assertCareerEvidenceReadinessBindings = (
  readiness: CareerEvidenceReadinessV1,
  packet: EvidenceCandidatePacketV1,
  observed: {
    candidateId: string;
    evidenceBankSha256: string;
    evidenceIds: ReadonlySet<string>;
    gapIds: ReadonlySet<string>;
    acceptedGapIds: ReadonlySet<string>;
  },
): void => {
  if (
    readiness.candidate_id !== packet.candidate_id ||
    readiness.candidate_id !== observed.candidateId ||
    readiness.candidate_packet_sha256 !== packet.packet_sha256 ||
    readiness.evidence_bank_sha256 !== observed.evidenceBankSha256 ||
    packet.evidence_bank_sha256 !== observed.evidenceBankSha256
  ) {
    throw new Error('readiness authority binding mismatch');
  }
  const packetEvidenceIds = new Set(
    packet.items
      .filter(({confidence}) => confidence !== 'inferred')
      .flatMap(({evidence_ids}) => evidence_ids),
  );
  for (const check of Object.values(readiness.checks)) {
    if (check.evidence_ids.some((id) => !observed.evidenceIds.has(id))) {
      throw new Error('readiness evidence missing');
    }
    if (check.evidence_ids.some((id) => !packetEvidenceIds.has(id))) {
      throw new Error('readiness evidence not represented in candidate packet');
    }
    if (check.accepted_gap_ids.some((id) => !observed.acceptedGapIds.has(id))) {
      throw new Error('readiness accepted gap missing');
    }
  }
  if (readiness.blocking_gap_ids.some((id) => !observed.gapIds.has(id))) {
    throw new Error('readiness blocking gap missing');
  }
};
