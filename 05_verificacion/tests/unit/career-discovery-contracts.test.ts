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
  dimension: 'achievement' as const,
  severity: 'blocking' as const,
  status: 'open' as const,
  prompt_hint: 'Clarify the observable result.',
};
const question = {
  question_id: 'QUESTION-001',
  gap_ids: ['GAP-001'],
  kind: 'result' as const,
  prompt: 'What changed and how did you observe it?',
  answer: null,
};
const sessionPayload = {
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
const session = {...sessionPayload, session_sha256: calculateDiscoverySessionHash(sessionPayload)};

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
      statement: 'Program leadership is supported by the described intervention.',
      confidence: 'verified' as const,
      source_ids: ['SOURCE-001'],
      evidence_ids: ['EVIDENCE-001'],
      role_families: ['program leadership'],
      attribution_limit: 'Preserve the documented team scope and contribution.',
      allowed_channels: ['cv' as const],
      forbidden_claims: ['Sole ownership of the team result'],
    },
  ],
};
const packet = {...packetPayload, packet_sha256: calculateCandidatePacketHash(packetPayload)};

const passedCheck = {passed: true, evidence_ids: ['EVIDENCE-001'], accepted_gap_ids: []};
const readinessPayload = {
  schema_version: 'career-evidence-readiness-v1' as const,
  readiness_id: 'READINESS-001',
  candidate_id: 'CANDIDATE-001',
  evidence_bank_sha256: SHA,
  candidate_packet_sha256: packet.packet_sha256,
  checks: {
    identity_and_chronology: passedCheck,
    competency_evidence: passedCheck,
    recent_role_interventions: passedCheck,
    contradictions_resolved: passedCheck,
    role_family_selected: passedCheck,
    privacy_boundary: passedCheck,
    gaps_accepted: passedCheck,
  },
  blocking_gap_ids: [],
  status: 'READY' as const,
  next_gate: 'CR_CAREER_EVIDENCE_READY' as const,
};

describe('career discovery contracts', () => {
  it('accepts source-first sessions and verifies cross-bindings', () => {
    expect(parseCareerDiscoverySession(session)).toEqual(session);
    expect(parseEvidenceCandidatePacket(packet)).toEqual(packet);
    expect(() =>
      assertEvidenceCandidatePacketBindings(packet, session, {
        candidateId: 'CANDIDATE-001',
        evidenceBankSha256: SHA,
        evidence: new Map([['EVIDENCE-001', 'verified']]),
      }),
    ).not.toThrow();
    const readiness = {
      ...readinessPayload,
      readiness_sha256: calculateEvidenceReadinessHash(readinessPayload),
    };
    expect(parseCareerEvidenceReadiness(readiness)).toEqual(readiness);
    expect(() =>
      assertCareerEvidenceReadinessBindings(readiness, packet, {
        candidateId: 'CANDIDATE-001',
        evidenceBankSha256: SHA,
        evidenceIds: new Set(['EVIDENCE-001']),
        gapIds: new Set(['GAP-001']),
        acceptedGapIds: new Set(),
      }),
    ).not.toThrow();
  });

  it('rejects locators, broken rounds, unknown gaps and contradictory gates', () => {
    const rejectedLocators = [
      ['', 'Users', 'person', 'cv.pdf'].join('/'),
      ['file:', '', '', 'Users', 'person', 'cv.pdf'].join('/'),
      ['C:', 'cv.pdf'].join('\\'),
      '~/private-cv.pdf',
    ];
    for (const source_ref of rejectedLocators) {
      const payload = {...sessionPayload, source_inventory: [{...source, source_ref}]};
      expect(() =>
        parseCareerDiscoverySession({
          ...payload,
          session_sha256: calculateDiscoverySessionHash(payload),
        }),
      ).toThrow();
    }
    const broken = {
      ...sessionPayload,
      rounds: [
        {
          round_number: 4,
          status: 'completed' as const,
          questions: [{...question, gap_ids: ['GAP-UNKNOWN']}],
        },
      ],
      state: 'READY_FOR_CONFIRMATION' as const,
    };
    expect(() =>
      parseCareerDiscoverySession({
        ...broken,
        session_sha256: calculateDiscoverySessionHash(broken),
      }),
    ).toThrow();
  });

  it('keeps inferred items out of publishable channels and external requirements out of evidence', () => {
    const promoted = {
      ...packetPayload,
      items: [
        {
          ...packetPayload.items[0]!,
          confidence: 'inferred' as const,
          allowed_channels: ['cv' as const],
        },
      ],
    };
    expect(() =>
      parseEvidenceCandidatePacket({
        ...promoted,
        packet_sha256: calculateCandidatePacketHash(promoted),
      }),
    ).toThrow(/interview-only/u);
    const externalSessionPayload = {
      ...sessionPayload,
      source_inventory: [{...source, authority: 'external_requirement' as const}],
    };
    const externalSession = {
      ...externalSessionPayload,
      session_sha256: calculateDiscoverySessionHash(externalSessionPayload),
    };
    const externalPacketPayload = {
      ...packetPayload,
      discovery_session_sha256: externalSession.session_sha256,
    };
    const externalPacket = {
      ...externalPacketPayload,
      packet_sha256: calculateCandidatePacketHash(externalPacketPayload),
    };
    expect(() =>
      assertEvidenceCandidatePacketBindings(externalPacket, externalSession, {
        candidateId: 'CANDIDATE-001',
        evidenceBankSha256: SHA,
        evidence: new Map([['EVIDENCE-001', 'verified']]),
      }),
    ).toThrow(/external requirements/u);
  });

  it('rejects READY without material packet, evidence and gap bindings', () => {
    expect(() =>
      parseCareerEvidenceReadiness({...readinessPayload, candidate_packet_sha256: null}),
    ).toThrow();
    const readiness = {
      ...readinessPayload,
      readiness_sha256: calculateEvidenceReadinessHash(readinessPayload),
    };
    expect(() =>
      assertCareerEvidenceReadinessBindings(readiness, packet, {
        candidateId: 'CANDIDATE-001',
        evidenceBankSha256: SHA,
        evidenceIds: new Set(),
        gapIds: new Set(),
        acceptedGapIds: new Set(),
      }),
    ).toThrow(/evidence missing/u);
  });
});
