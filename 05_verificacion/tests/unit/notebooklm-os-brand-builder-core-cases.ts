import {describe, expect, it} from 'vitest';

import {
  BrandEvidenceSetV1Schema,
  BrandKnowledgePackV1Schema,
  BrandQaReceiptV1Schema,
  hashExperienceValue,
} from '../../../02_proceso/core/contracts/index.ts';
import {
  applyBrandFeedback,
  compileBrandEvidence,
  compileBrandKnowledgePack,
  normalizeBrandInputs,
} from '../../../02_proceso/workflows/notebooklm-os/brand-runtime.ts';
import {
  routeBrandNotebooklmV1,
  routeNotebooklmV1,
} from '../../../02_proceso/workflows/notebooklm-os/route-notebooklm-v1.ts';
import {evaluateSourceSafety} from '../../../02_proceso/workflows/notebooklm-os/index.ts';
import {digest, fixtures, packFor, packetFor} from './notebooklm-os-brand-builder-fixtures.ts';

describe('NotebookLM OS public Brand Builder core', () => {
  it('normalizes two synthetic brands deterministically without mixing identities', () => {
    expect(fixtures.brands).toHaveLength(2);
    const [firstBrand, secondBrand] = fixtures.brands;
    if (!firstBrand || !secondBrand) throw new Error('Synthetic fixtures are incomplete.');
    for (const brand of fixtures.brands) {
      const packet = packetFor(brand);
      const reordered = {
        ...packet,
        audiences: [...packet.audiences].reverse(),
        inputRefs: [...packet.inputRefs].reverse(),
        observations: [...packet.observations].reverse(),
      };
      expect(normalizeBrandInputs(reordered)).toEqual(normalizeBrandInputs(packet));
      expect(compileBrandEvidence(reordered)).toEqual(compileBrandEvidence(packet));
    }
    const versioned = packetFor(firstBrand);
    const firstInput = versioned.inputRefs[0];
    if (!firstInput) throw new Error('Synthetic input is missing.');
    versioned.inputRefs.push({
      ...firstInput,
      inputId: `${firstInput.inputId}-successor`,
      contentSha256: digest('successor content'),
      extractedTextSha256: digest('successor content'),
    });
    expect(normalizeBrandInputs(versioned).inputRefs).toHaveLength(
      packetFor(firstBrand).inputRefs.length + 1,
    );
    const first = packFor(firstBrand).pack;
    const second = packFor(secondBrand).pack;
    expect(first.brandId).not.toBe(second.brandId);
    expect(JSON.stringify(first.sections)).not.toContain(secondBrand.expected.canonical_phrase);
    expect(JSON.stringify(second.sections)).not.toContain(firstBrand.expected.canonical_phrase);
  });

  it('keeps generic R10 routing default and selects brand capability explicitly', () => {
    expect(
      routeNotebooklmV1().skillBindings.some(({primarySkillId}) =>
        primarySkillId.includes('brand'),
      ),
    ).toBe(false);
    expect(routeBrandNotebooklmV1().skillBindings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({primarySkillId: 'notebooklm-brand-intake'}),
      ]),
    );
    expect(
      routeNotebooklmV1({
        prompt: 'Create a brand-ready content notebook from these attachments',
        requestHash: digest('route request'),
        routeId: 'R10',
      }).skillBindings,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({primarySkillId: 'notebooklm-brand-content-director'}),
      ]),
    );
  });

  it('keeps open conflicts blocked until explicit resolution', () => {
    const brand = fixtures.brands[0];
    if (!brand) throw new Error('Synthetic fixture is missing.');
    const packet = packetFor(brand);
    packet.observations.push({
      observationId: `${brand.brand_id}:voice-conflict`,
      category: 'voice',
      statement: 'Use an aggressive and absolute voice.',
      status: 'OBSERVED',
      confidence: 0.5,
      inputIds: [brand.inputs[0]?.input_id ?? 'missing-input'],
      sourceRefs: [],
    });
    packet.conflicts.push({
      conflictId: `${brand.brand_id}:voice-open`,
      observationIds: [`${brand.brand_id}:voice`, `${brand.brand_id}:voice-conflict`],
      description: 'Two incompatible voice directions.',
      resolution: 'OPEN',
      winningObservationId: null,
    });
    const evidence = compileBrandEvidence(packet);
    expect(
      BrandEvidenceSetV1Schema.safeParse({
        ...evidence,
        evidence: evidence.evidence.map((item, index) =>
          index === 0 ? {...item, statement: 'Tampered evidence'} : item,
        ),
      }).success,
    ).toBe(false);
    const pack = compileBrandKnowledgePack(evidence, {
      brandName: brand.display_name,
      version: 'v1.0',
      defaultLocale: brand.primary_locale,
      responseLocales: [brand.primary_locale],
    });
    expect(pack.status).toBe('BLOCKED');
    expect(
      BrandKnowledgePackV1Schema.safeParse({...pack, brandName: 'Tampered without successor'})
        .success,
    ).toBe(false);
  });

  it('applies confirmed feedback as a review successor and rejects cross-brand feedback', () => {
    const [firstBrand, secondBrand] = fixtures.brands;
    if (!firstBrand || !secondBrand) throw new Error('Synthetic fixtures are incomplete.');
    const {pack} = packFor(firstBrand);
    const target = pack.sections.voice[0];
    if (!target) throw new Error('Voice rule is missing.');
    const event = {
      schemaVersion: 'brand-feedback-event-v1' as const,
      feedbackId: 'feedback-voice-01',
      brandId: firstBrand.brand_id,
      actorId: 'synthetic-reviewer',
      targetRuleId: target.ruleId,
      action: 'REPLACE' as const,
      replacementStatement: 'Calm, practical, and candid.',
      evidenceIds: target.evidenceIds,
      reason: 'Synthetic user correction.',
      successorVersion: 'v1.1' as const,
    };
    const successor = applyBrandFeedback(pack, event);
    expect(successor).toEqual(
      expect.objectContaining({
        version: 'v1.1',
        status: 'REVIEW',
        approvalGate: null,
        approvalReceiptSha256: null,
        reviewedPredecessorSha256: null,
      }),
    );
    expect(successor.sections.voice).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          statement: 'Calm, practical, and candid.',
          supersedesRuleId: target.ruleId,
        }),
      ]),
    );
    expect(() => applyBrandFeedback(pack, {...event, brandId: secondBrand.brand_id})).toThrow(
      /different brand/iu,
    );
  });

  it('fails closed on unsafe sources and requires every QA dimension', () => {
    const base = {
      inScope: true,
      containsPromptInjection: false,
      containsUnnecessaryPii: false,
      hasUnsupportedStrongClaim: false,
      rights: 'APPROVED' as const,
    };
    const cases = [
      [{...base, containsPromptInjection: true}, 'PROMPT_INJECTION'],
      [{...base, containsUnnecessaryPii: true}, 'UNNECESSARY_PII'],
      [{...base, hasUnsupportedStrongClaim: true}, 'UNSUPPORTED_STRONG_CLAIM'],
      [{...base, rights: 'REVIEW' as const}, 'ASSET_RIGHTS_NOT_APPROVED'],
    ] as const;
    for (const [input, reason] of cases)
      expect(evaluateSourceSafety(input)).toEqual({status: 'BLOCKED', reasonCodes: [reason]});
    const checks = {
      voice: 'PASS',
      claims: 'PASS',
      assets: 'PASS',
      visuals: 'PASS',
      channel: 'PASS',
      language: 'PASS',
      accessibility: 'PASS',
      brandSeparation: 'PASS',
      internalInstructionLeakage: 'PASS',
    } as const;
    const payload = {
      schemaVersion: 'brand-qa-receipt-v1',
      receiptId: 'brand-qa-synthetic-01',
      briefSha256: digest('brief'),
      checks,
      findings: [],
      state: 'VERIFIED_DRAFT',
    } as const;
    const receipt = {...payload, canonicalSha256: hashExperienceValue(payload)};
    expect(BrandQaReceiptV1Schema.safeParse(receipt).success).toBe(true);
    expect(
      BrandQaReceiptV1Schema.safeParse({
        ...receipt,
        checks: {...checks, brandSeparation: 'UNKNOWN'},
      }).success,
    ).toBe(false);
  });
});
