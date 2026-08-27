import {describe, expect, it} from 'vitest';

import {
  BrandKnowledgePackV1Schema,
  BrandNotebookBuildV1Schema,
  hashExperienceValue,
} from '../../../02_proceso/core/contracts/index.ts';
import {
  activateBrandKnowledgePack,
  compileBrandBootstrap,
  compileBrandNotebookBuild,
} from '../../../02_proceso/workflows/notebooklm-os/brand-runtime.ts';
import {
  approvePack,
  buildInputFor,
  digest,
  fixtures,
  packFor,
} from './notebooklm-os-brand-builder-fixtures.ts';

describe('NotebookLM OS public Brand Builder build', () => {
  it('compiles a bounded XML bootstrap and exact N00-N09 plan deterministically', () => {
    const brand = fixtures.brands[0];
    if (!brand) throw new Error('Synthetic fixture is missing.');
    const {evidence, pack} = packFor(brand);
    const bootstrapXml = compileBrandBootstrap(pack, {
      knowledgeMapDocumentId: 'knowledge-map-v1',
      operatingPromptDocumentId: 'operating-prompt-v1',
    });
    expect(bootstrapXml.length).toBeLessThanOrEqual(9_500);
    expect(bootstrapXml.startsWith('<notebook_bootstrap')).toBe(true);
    expect(bootstrapXml.endsWith('</notebook_bootstrap>')).toBe(true);
    expect(() =>
      compileBrandBootstrap(pack, {
        knowledgeMapDocumentId: 'knowledge-map-v1',
        operatingPromptDocumentId: 'operating-prompt-v1',
        maxCharacters: 999,
      }),
    ).toThrow(/at least 1,000/iu);

    const buildInput = buildInputFor(brand, pack, evidence);
    const reviewBuild = compileBrandNotebookBuild(buildInput);
    expect(compileBrandNotebookBuild(buildInput)).toEqual(reviewBuild);
    expect(reviewBuild.state).toBe('BRAND_PROFILE_REVIEW');
    expect(reviewBuild.stages.map(({stage}) => stage)).toEqual(
      Array.from({length: 10}, (_, index) => `N0${index}`),
    );
    expect(reviewBuild.stages[2]).toEqual(expect.objectContaining({stage: 'N02', status: 'READY'}));
    expect(() =>
      compileBrandNotebookBuild({
        ...buildInput,
        stageReceiptDigests: {N00: digest('receipt-n00')},
      }),
    ).toThrow(/N01/iu);
    expect(() =>
      compileBrandNotebookBuild({
        ...buildInput,
        bootstrapXml: '<wrong_wrapper />',
      }),
    ).toThrow(/notebook_bootstrap/iu);
    expect(() =>
      compileBrandNotebookBuild({
        ...buildInput,
        sourceSets: [
          {
            sourceSetId: 'source-set-voice',
            purpose: 'Verify voice',
            sourceIds: ['NLS-SYNTHETIC-OUTSIDE'],
          },
        ],
      }),
    ).toThrow(/outside the notebook plan/iu);

    const supersededPayload = {...pack, status: 'SUPERSEDED' as const};
    const supersededPack = {
      ...supersededPayload,
      canonicalSha256: hashExperienceValue(supersededPayload),
    };
    expect(compileBrandNotebookBuild(buildInputFor(brand, supersededPack, evidence)).state).toBe(
      'BLOCKED',
    );
  });

  it('binds ACTIVE profile to its reviewed predecessor and approval receipt', () => {
    const brand = fixtures.brands[0];
    if (!brand) throw new Error('Synthetic fixture is missing.');
    const {evidence, pack} = packFor(brand);
    const {activePack, approvalReceipt} = approvePack(pack);
    expect(activePack).toEqual(
      expect.objectContaining({
        approvalGate: 'NLM_BRAND_PROFILE_APPROVED',
        approvalReceiptSha256: approvalReceipt.canonicalSha256,
        reviewedPredecessorSha256: pack.canonicalSha256,
      }),
    );
    expect(
      BrandKnowledgePackV1Schema.safeParse({
        ...activePack,
        approvalReceiptSha256: null,
      }).success,
    ).toBe(false);
    const forgedApprovalPayload = {
      schemaVersion: 'brand-profile-approval-receipt-v1' as const,
      receiptId: 'approval-forged-pack',
      gate: 'NLM_BRAND_PROFILE_APPROVED' as const,
      brandId: pack.brandId,
      reviewPackSha256: digest('different reviewed pack'),
      actorDigest: digest('synthetic-human-reviewer'),
      decision: 'APPROVED' as const,
    };
    expect(() =>
      activateBrandKnowledgePack(pack, {
        ...forgedApprovalPayload,
        canonicalSha256: hashExperienceValue(forgedApprovalPayload),
      }),
    ).toThrow(/not bound/iu);
    const activeBuild = compileBrandNotebookBuild(buildInputFor(brand, activePack, evidence));
    expect(activeBuild.state).toBe('BRAND_NOTEBOOK_PLAN_READY');
    expect(activeBuild.stages[4]).toEqual(expect.objectContaining({stage: 'N04', status: 'READY'}));
    expect(
      BrandNotebookBuildV1Schema.safeParse({
        ...activeBuild,
        bootstrapXml: activeBuild.bootstrapXml.replace('Never invent', 'Invent freely'),
      }).success,
    ).toBe(false);
  });
});
