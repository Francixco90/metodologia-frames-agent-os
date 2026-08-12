import {describe, expect, it} from 'vitest';

import {
  assertCareerEvidenceReadinessBindings,
  assertEvidenceCandidatePacketBindings,
  calculateCandidatePacketHash,
  calculateDiscoverySessionHash,
  calculateEvidenceReadinessHash,
  parseCareerDiscoverySession,
  parseCareerEvidenceReadiness,
  parseEvidenceCandidatePacket,
} from '../../../02_proceso/workflows/career/index.ts';

const SHA = 'a'.repeat(64);
const source = {
  source_id: 'SOURCE-001',
  source_type: 'cv' as const,
  source_ref: '03_artefactos/work/private/candidate/cv.pdf',
  source_sha256: SHA,
  authority: 'first_party_material' as const,
};
const gap = {
  gap_id: 'GAP-001',
  dimension: 'competency' as const,
  severity: 'blocking' as const,
  status: 'open' as const,
  prompt_hint: 'Clarify the competency.',
};
const question = {
  question_id: 'QUESTION-001',
  gap_ids: ['GAP-001'],
  kind: 'evidence' as const,
  prompt: 'What evidence supports this competency?',
  answer: null,
};
const baseSession = {
  schema_version: 'career-discovery-session-v1' as const,
  session_id: 'DISCOVERY-001',
  candidate_id: 'CANDIDATE-001',
  source_inventory: [source],
  role_families: ['program leadership'],
  gaps: [gap],
  rounds: [{round_number: 1, status: 'open' as const, questions: [question]}],
  state: 'INTERVIEW_REQUIRED' as const,
  next_gate: 'CR_CAREER_DISCOVERY_CONTINUE' as const,
};

describe('career discovery adversarial rules', () => {
  it('rejects non-terminal and multiple pending rounds', () => {
    for (const statuses of [
      ['open', 'completed'],
      ['open', 'open'],
    ] as const) {
      const payload = {
        ...baseSession,
        rounds: statuses.map((status, index) => ({
          round_number: index + 1,
          status,
          questions: [
            {
              ...question,
              question_id: `QUESTION-00${index + 1}`,
              answer: status === 'completed' ? 'Material answer' : null,
            },
          ],
        })),
      };
      expect(() =>
        parseCareerDiscoverySession({
          ...payload,
          session_sha256: calculateDiscoverySessionHash(payload),
        }),
      ).toThrow(/terminal round/u);
    }
  });

  it('rejects duplicate source and gap identifiers', () => {
    for (const payload of [
      {...baseSession, source_inventory: [source, source]},
      {...baseSession, gaps: [gap, gap]},
    ]) {
      expect(() =>
        parseCareerDiscoverySession({
          ...payload,
          session_sha256: calculateDiscoverySessionHash(payload),
        }),
      ).toThrow(/must be unique/u);
    }
  });

  it('rejects an empty candidate packet', () => {
    const payload = {
      schema_version: 'evidence-candidate-packet-v1' as const,
      packet_id: 'PACKET-001',
      candidate_id: 'CANDIDATE-001',
      discovery_session_sha256: SHA,
      evidence_bank_sha256: SHA,
      items: [],
    };
    expect(() =>
      parseEvidenceCandidatePacket({
        ...payload,
        packet_sha256: calculateCandidatePacketHash(payload),
      }),
    ).toThrow();
  });

  it('rejects readiness gaps and evidence not represented by packet items', () => {
    const session = parseCareerDiscoverySession({
      ...baseSession,
      session_sha256: calculateDiscoverySessionHash(baseSession),
    });
    const packetPayload = {
      schema_version: 'evidence-candidate-packet-v1' as const,
      packet_id: 'PACKET-001',
      candidate_id: 'CANDIDATE-001',
      discovery_session_sha256: session.session_sha256,
      evidence_bank_sha256: SHA,
      items: [
        {
          item_id: 'ITEM-001',
          kind: 'competency' as const,
          statement: 'Evidence-backed competency.',
          confidence: 'verified' as const,
          source_ids: ['SOURCE-001'],
          evidence_ids: ['EVIDENCE-001'],
          role_families: ['program leadership'],
          attribution_limit: 'Preserve team attribution.',
          allowed_channels: ['cv' as const],
          forbidden_claims: [],
        },
      ],
    };
    const packet = {...packetPayload, packet_sha256: calculateCandidatePacketHash(packetPayload)};
    expect(() =>
      assertEvidenceCandidatePacketBindings(packet, session, {
        candidateId: 'CANDIDATE-001',
        evidenceBankSha256: SHA,
        evidence: new Map([['EVIDENCE-001', 'inferred']]),
      }),
    ).toThrow(/confidence exceeds/u);
    expect(() =>
      assertEvidenceCandidatePacketBindings(packet, session, {
        candidateId: 'CANDIDATE-001',
        evidenceBankSha256: 'b'.repeat(64),
        evidence: new Map([['EVIDENCE-001', 'verified']]),
      }),
    ).toThrow(/does not bind/u);
    const check = {passed: false, evidence_ids: [], accepted_gap_ids: []};
    const readinessPayload = {
      schema_version: 'career-evidence-readiness-v1' as const,
      readiness_id: 'READINESS-001',
      candidate_id: 'CANDIDATE-001',
      evidence_bank_sha256: SHA,
      candidate_packet_sha256: packet.packet_sha256,
      checks: {
        identity_and_chronology: check,
        competency_evidence: check,
        recent_role_interventions: check,
        contradictions_resolved: check,
        role_family_selected: check,
        privacy_boundary: check,
        gaps_accepted: check,
      },
      blocking_gap_ids: ['GAP-UNKNOWN'],
      status: 'BLOCKED' as const,
      next_gate: 'CR_CAREER_EVIDENCE_READY' as const,
    };
    const readiness = parseCareerEvidenceReadiness({
      ...readinessPayload,
      readiness_sha256: calculateEvidenceReadinessHash(readinessPayload),
    });
    expect(() =>
      assertCareerEvidenceReadinessBindings(readiness, packet, {
        candidateId: 'CANDIDATE-001',
        evidenceBankSha256: SHA,
        evidenceIds: new Set(['EVIDENCE-001']),
        gapIds: new Set(['GAP-001']),
        acceptedGapIds: new Set(),
      }),
    ).toThrow(/blocking gap missing/u);
  });
});
