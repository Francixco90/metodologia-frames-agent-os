import {describe, expect, it} from 'vitest';

import {
  CareerClaimV1Schema,
  EvidenceItemV1Schema,
  RequirementEvidenceMapV1Schema,
} from 'workflows/career/_schema/index.ts';

const HASH = 'a'.repeat(64);

describe('Career evidence boundary', () => {
  it.each(['verified', 'user_confirmed'] as const)(
    'allows %s evidence to remain explicitly classified',
    (confidence) => {
      const material = EvidenceItemV1Schema.parse({
        evidence_id: `EVD-${confidence.toUpperCase().replace('_', '-')}-001`,
        claim: 'Resultado profesional sintético.',
        context: 'Contexto sintético.',
        action_method: 'Método sintético.',
        result: 'Resultado sintético.',
        metric: null,
        source_ref: confidence === 'verified' ? 'work/private/evidence/result.md' : null,
        source_sha256: confidence === 'verified' ? HASH : null,
        confidence,
        allowed_channels: ['cv'],
        constraints: [],
      });
      expect(material.confidence).toBe(confidence);
    },
  );

  it.each(['inferred', 'missing'] as const)(
    'requires %s to be treated as a gap rather than a proven claim',
    (confidence) => {
      const evidence = EvidenceItemV1Schema.parse({
        evidence_id: `EVD-${confidence.toUpperCase()}-001`,
        claim: 'Capacidad todavía no demostrada.',
        context: 'Contexto incompleto.',
        action_method: 'No verificado.',
        result: 'No verificado.',
        metric: null,
        source_ref: null,
        source_sha256: null,
        confidence,
        allowed_channels: [],
        constraints: ['No usar como claim demostrado.'],
      });
      expect(evidence.constraints).toContain('No usar como claim demostrado.');
      expect(evidence.allowed_channels).toEqual([]);
    },
  );

  it('requires every document claim to bind evidence ids and hashes', () => {
    expect(
      CareerClaimV1Schema.parse({
        claim_id: 'CLM-SYNTHETIC-001',
        text: 'Claim con evidencia.',
        evidence_ids: ['EVD-VERIFIED-001'],
        evidence_hashes: [HASH],
      }),
    ).toMatchObject({evidence_ids: ['EVD-VERIFIED-001'], evidence_hashes: [HASH]});
    expect(
      CareerClaimV1Schema.safeParse({
        claim_id: 'CLM-SYNTHETIC-001',
        text: 'Claim huérfano.',
        evidence_ids: [],
        evidence_hashes: [],
      }).success,
    ).toBe(false);
  });

  it('records an unsupported mandatory requirement as blocked rather than inventing evidence', () => {
    const map = RequirementEvidenceMapV1Schema.parse({
      schema_version: 'requirement-evidence-map-v1',
      job_id: 'JOB-SYNTHETIC-001',
      mappings: [
        {
          requirement_id: 'REQ-MANDATORY-001',
          evidence_ids: [],
          fit: 'blocked',
          treatment: 'block',
          rationale: 'No existe evidencia autorizada para este requisito obligatorio.',
        },
      ],
    });
    expect(map.mappings[0]).toMatchObject({evidence_ids: [], fit: 'blocked', treatment: 'block'});
  });
});
