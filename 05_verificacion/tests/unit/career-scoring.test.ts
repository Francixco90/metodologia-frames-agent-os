import {createHash} from 'node:crypto';

import {describe, expect, it, vi} from 'vitest';

import {normalizeOpportunitySource} from 'workflows/career/adapters/opportunity-source.ts';
import {CAREER_SCORE_WEIGHTS, scoreCareerOpportunity} from 'workflows/career/_runner/scoring.ts';

const perfect = {
  evidence: 1,
  hard_requirements: 1,
  constraints: 1,
  transferability: 1,
  publication_quality: 1,
  sector: 1,
  application_friction: 1,
  legitimate_contact: 1,
  mandatory_blockers: [],
};

describe('Career opportunity scoring', () => {
  it('keeps the approved weights at exactly 100 points', () => {
    expect(CAREER_SCORE_WEIGHTS).toEqual({
      evidence: 30,
      hard_requirements: 20,
      constraints: 15,
      transferability: 10,
      publication_quality: 10,
      sector: 5,
      application_friction: 5,
      legitimate_contact: 5,
    });
    expect(Object.values(CAREER_SCORE_WEIGHTS).reduce((sum, weight) => sum + weight, 0)).toBe(100);
  });

  it('returns an explainable perfect score', () => {
    expect(scoreCareerOpportunity(perfect)).toEqual({
      score: 100,
      components: CAREER_SCORE_WEIGHTS,
      decision: 'SCORED',
      mandatory_blockers: [],
    });
  });

  it('blocks on mandatory constraints regardless of numeric score', () => {
    const result = scoreCareerOpportunity({
      ...perfect,
      mandatory_blockers: ['Work authorization unavailable'],
    });
    expect(result.score).toBe(100);
    expect(result.decision).toBe('BLOCKED');
    expect(result.mandatory_blockers).toEqual(['Work authorization unavailable']);
  });

  it('rejects out-of-range and undeclared scoring dimensions', () => {
    expect(() => scoreCareerOpportunity({...perfect, evidence: 1.01})).toThrow();
    expect(() => scoreCareerOpportunity({...perfect, popularity: 1} as never)).toThrow();
  });

  it('rounds every component and total deterministically', () => {
    const input = {
      ...perfect,
      evidence: 1 / 3,
      hard_requirements: 2 / 3,
      constraints: 0.5,
    };
    expect(scoreCareerOpportunity(input)).toEqual(scoreCareerOpportunity(input));
    expect(scoreCareerOpportunity(input).components).toMatchObject({
      evidence: 10,
      hard_requirements: 13.33,
      constraints: 7.5,
    });
  });
});

describe('Career opportunity source adapter', () => {
  const description =
    'Product Operations Lead\r\nEmpresa sintética\r\nLiderar procesos de producto.   ';
  const descriptionHash = createHash('sha256').update(description, 'utf8').digest('hex');
  const credentialKey = ['coo', 'kie'].join('');
  const credentialMaterial = `Product role\n${credentialKey}: session=value`;
  const linkedin = {
    schema_version: 'opportunity-source-input-v1',
    source_type: 'linkedin',
    canonical_url:
      'https://www.linkedin.com/jobs/view/synthetic?utm_source=test&trk=feed&position=1#details',
    description,
    description_sha256: descriptionHash,
    captured_ref: 'work/private/career/jobs/linkedin-synthetic.md',
  } as const;

  it('normalizes a hash-bound LinkedIn snapshot deterministically without network', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    try {
      const first = normalizeOpportunitySource(linkedin);
      const second = normalizeOpportunitySource(linkedin);

      expect(first).toEqual(second);
      expect(first).toMatchObject({
        status: 'PASS',
        source_type: 'linkedin',
        canonical_url: 'https://www.linkedin.com/jobs/view/synthetic?position=1',
        captured_ref: linkedin.captured_ref,
        normalized_description:
          'Product Operations Lead\nEmpresa sintética\nLiderar procesos de producto.\n',
        raw_sha256: descriptionHash,
        reason_codes: ['SNAPSHOT_NORMALIZED'],
        network_used: false,
      });
      expect(first.normalized_sha256).toMatch(/^[a-f0-9]{64}$/u);
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it.each([
    ['credential field', {...linkedin, credential: 'secret'}, 'CREDENTIAL_FIELD_FORBIDDEN'],
    ['cookie field', {...linkedin, [credentialKey]: 'session=value'}, 'CREDENTIAL_FIELD_FORBIDDEN'],
    [
      'cookie material',
      {
        ...linkedin,
        description: credentialMaterial,
        description_sha256: createHash('sha256').update(credentialMaterial).digest('hex'),
      },
      'CREDENTIAL_OR_PII_DETECTED',
    ],
  ])('blocks %s before creating a usable snapshot', (_label, input, reason) => {
    expect(normalizeOpportunitySource(input)).toMatchObject({
      status: 'BLOCKED',
      normalized_description: null,
      normalized_sha256: null,
      reason_codes: [reason],
      network_used: false,
    });
  });

  it('returns UNKNOWN rather than approving a snapshot with no material hash', () => {
    expect(normalizeOpportunitySource({...linkedin, description_sha256: undefined})).toMatchObject({
      status: 'UNKNOWN',
      reason_codes: ['DESCRIPTION_HASH_MISSING'],
      raw_sha256: null,
      normalized_sha256: null,
      network_used: false,
    });
  });

  it('blocks a stale hash and never silently rebaselines it', () => {
    expect(
      normalizeOpportunitySource({...linkedin, description_sha256: 'f'.repeat(64)}),
    ).toMatchObject({
      status: 'BLOCKED',
      reason_codes: ['DESCRIPTION_HASH_MISMATCH'],
      raw_sha256: descriptionHash,
      normalized_sha256: null,
    });
  });
});
