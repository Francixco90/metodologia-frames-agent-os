import {type CvSpecV2} from '../_schema/index.ts';
import {
  assertCvEvidenceAuthorityCurrent,
  type CvEvidenceAuthority,
  parseCareerEvidenceReadiness,
  parseEvidenceCandidatePacket,
} from './career-discovery.ts';
import {createCvSpecV2, parseCvSpecV2} from './cv-spec-v2.ts';

export const assertCvSpecV2EvidenceCurrent = (input: unknown, authority: CvEvidenceAuthority) => {
  const spec = parseCvSpecV2(input);
  const {packet, readiness} = assertCvEvidenceAuthorityCurrent(spec, authority);
  return {spec, packet, readiness};
};

export const bindCvSpecV2EvidenceReadiness = (
  input: unknown,
  authority: CvEvidenceAuthority,
): CvSpecV2 => {
  const spec = parseCvSpecV2(input);
  const packet = parseEvidenceCandidatePacket(authority.packet);
  const readiness = parseCareerEvidenceReadiness(authority.readiness);
  if (
    readiness.status !== 'READY' ||
    packet.candidate_id !== spec.candidate_id ||
    readiness.candidate_id !== spec.candidate_id ||
    packet.evidence_bank_sha256 !== spec.evidence_bank_sha256 ||
    readiness.evidence_bank_sha256 !== spec.evidence_bank_sha256 ||
    readiness.candidate_packet_sha256 !== packet.packet_sha256
  ) {
    throw new Error('CV_SPEC_V2_EVIDENCE_READINESS_STALE');
  }
  const {spec_sha256, ...draft} = spec;
  void spec_sha256;
  const bound = createCvSpecV2({
    ...draft,
    evidence_candidate_packet_ref: authority.packet_ref,
    evidence_candidate_packet_sha256: packet.packet_sha256,
    evidence_readiness_ref: authority.readiness_ref,
    evidence_readiness_sha256: readiness.readiness_sha256,
    state: 'DRAFT',
    approval: null,
  });
  assertCvEvidenceAuthorityCurrent(bound, authority);
  return bound;
};
