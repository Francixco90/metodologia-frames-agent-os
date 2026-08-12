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
