import {describe, expect, it} from 'vitest';

import {
  BrandContentBriefV1Schema,
  StudioBriefV1Schema,
  StudioBriefV2Schema,
  hashExperienceValue,
} from '../../../02_proceso/core/contracts/index.ts';
import {
  buildBrandContentBrief,
  buildBrandStudioBrief,
  compileBrandNotebookBuild,
} from '../../../02_proceso/workflows/notebooklm-os/brand-runtime.ts';
import {
  approvedContextFor,
  buildInputFor,
  digest,
  fixtures,
  packFor,
} from './notebooklm-os-brand-builder-fixtures.ts';

describe('NotebookLM OS public Brand Builder content', () => {
  it('requires approval-bound build context and explicit bounded sources', () => {
    const brand = fixtures.brands[0];
    if (!brand) throw new Error('Synthetic fixture is missing.');
    const context = approvedContextFor(brand);
    const briefInput = {
      brandId: brand.brand_id,
      channel: 'linkedin-post',
      locale: 'en',
      audience: 'Adult learners',
      objective: 'Explain a practical learning loop.',
      templateId: 'linkedin-post',
      sourceIds: ['NLS-SYNTHETIC-VOICE', 'NLS-SYNTHETIC-CONTROL'],
      claimIds: [],
      assetIds: [],
      exclusions: ['No unsupported outcomes.'],
      acceptance: ['Matches the approved voice.'],
    };
    const first = buildBrandContentBrief(briefInput, context);
    expect(
      buildBrandContentBrief(
        {...briefInput, sourceIds: [...briefInput.sourceIds].reverse()},
        context,
      ),
    ).toEqual(first);
    expect(first.sourceSelection).toBe('EXPLICIT');
    expect(first.sourceIds).toEqual([...briefInput.sourceIds].sort());
    expect(
      BrandContentBriefV1Schema.safeParse({
        ...first,
        sourceIds: [],
        sourceSetSha256: digest('empty'),
      }).success,
    ).toBe(false);
    expect(BrandContentBriefV1Schema.safeParse({...first, sourceSelection: 'ALL'}).success).toBe(
      false,
    );
    expect(
      BrandContentBriefV1Schema.safeParse({...first, sourceSetSha256: digest('forged')}).success,
    ).toBe(false);
    expect(() => buildBrandContentBrief({...briefInput, brandId: 'cross-brand'}, context)).toThrow(
      /different brand/iu,
    );
    expect(() =>
      buildBrandContentBrief({...briefInput, sourceIds: ['NLS-SYNTHETIC-OUTSIDE']}, context),
    ).toThrow(/outside the approved source set/iu);
    expect(() =>
      buildBrandContentBrief({...briefInput, claimIds: ['unknown-claim']}, context),
    ).toThrow(/unknown claim/iu);

    const otherBrand = fixtures.brands[1];
    if (!otherBrand) throw new Error('Second synthetic fixture is missing.');
    const foreignContext = approvedContextFor(otherBrand);
    expect(() =>
      buildBrandContentBrief(briefInput, {
        ...context,
        approvalReceipt: foreignContext.approvalReceipt,
      }),
    ).toThrow(/not bound/iu);
    expect(() =>
      buildBrandContentBrief(briefInput, {...context, notebookBuild: foreignContext.notebookBuild}),
    ).toThrow(/not bound/iu);

    const {evidence} = packFor(brand);
    const allBuildInput = buildInputFor(brand, context.knowledgePack, evidence);
    const allIds = allBuildInput.notebookPlan.sourceIds;
    allBuildInput.sourceSets = [
      {sourceSetId: 'source-set-all', purpose: 'Invalid all-sources selection', sourceIds: allIds},
    ];
    allBuildInput.groundingCases = [
      {
        caseId: 'ground-all-01',
        route: 'voice',
        query: 'Invalid broad query.',
        sourceSetId: 'source-set-all',
        acceptance: ['Must block all sources.'],
      },
    ];
    const allBuild = compileBrandNotebookBuild(allBuildInput);
    expect(() =>
      buildBrandContentBrief(
        {...briefInput, sourceIds: allIds},
        {...context, notebookBuild: allBuild, sourceSetId: 'source-set-all'},
      ),
    ).toThrow(/BLOCKED_ALL_SOURCES/u);
  });

  it('keeps Studio v1 compatible and binds v2 to the content brief', () => {
    const brand = fixtures.brands[0];
    if (!brand) throw new Error('Synthetic fixture is missing.');
    const context = approvedContextFor(brand);
    const first = buildBrandContentBrief(
      {
        brandId: brand.brand_id,
        channel: 'report',
        locale: 'en',
        audience: 'Operators',
        objective: 'Summarize evidence',
        templateId: 'report',
        sourceIds: ['NLS-SYNTHETIC-CONTROL'],
        claimIds: [],
        assetIds: [],
        exclusions: ['No invention'],
        acceptance: ['Citations present'],
      },
      context,
    );
    const v1 = StudioBriefV1Schema.parse({
      schemaVersion: 'studio-brief-v1',
      briefId: 'legacy-brief',
      type: 'report',
      audience: 'Operators',
      objective: 'Summarize evidence',
      thesis: 'Evidence comes before claims.',
      sourceIds: ['NLS-SYNTHETIC-CONTROL'],
      structure: ['Summary'],
      style: 'Plain language',
      duration: 'Five minutes',
      constraints: ['No invention'],
      acceptance: ['Citations present'],
    });
    expect(v1.schemaVersion).toBe('studio-brief-v1');
    const validV2 = {
      ...v1,
      schemaVersion: 'studio-brief-v2' as const,
      brandId: brand.brand_id,
      profileSha256: context.knowledgePack.canonicalSha256,
      locale: 'en',
      channel: 'report',
      claimEvidence: [{claimId: 'claim-01', sourceIds: ['NLS-SYNTHETIC-CONTROL'], condition: null}],
      assetIds: [],
      exclusions: [],
      finalFormat: 'markdown',
      sourceSetSha256: hashExperienceValue(['NLS-SYNTHETIC-CONTROL']),
      brandContentBriefSha256: digest('synthetic content brief'),
      negativePrompt: ['Do not invent claims.'],
      idempotencyKey: digest('brief'),
    };
    expect(StudioBriefV2Schema.safeParse(validV2).success).toBe(true);
    expect(
      StudioBriefV2Schema.safeParse({...validV2, sourceSetSha256: digest('forged')}).success,
    ).toBe(false);
    expect(
      StudioBriefV2Schema.safeParse({
        ...validV2,
        claimEvidence: [
          {claimId: 'claim-01', sourceIds: ['NLS-SYNTHETIC-OUTSIDE'], condition: null},
        ],
      }).success,
    ).toBe(false);

    const studioInput = {
      type: 'report' as const,
      audience: first.audience,
      objective: first.objective,
      thesis: 'Evidence comes before claims.',
      structure: ['Summary'],
      style: 'Plain language',
      duration: 'Five minutes',
      constraints: ['No invention'],
      acceptance: first.acceptance,
      locale: first.locale,
      channel: first.channel,
      claimEvidence: [],
      exclusions: first.exclusions,
      finalFormat: 'markdown',
      negativePrompt: ['Do not invent claims.'],
    };
    const studio = buildBrandStudioBrief(studioInput, {...context, contentBrief: first});
    expect(studio.brandId).toBe(first.brandId);
    expect(studio.profileSha256).toBe(context.knowledgePack.canonicalSha256);
    expect(studio.brandContentBriefSha256).toBe(hashExperienceValue(first));
    expect(() =>
      buildBrandStudioBrief(
        {
          ...studioInput,
          claimEvidence: [{claimId: 'unknown-claim', sourceIds: first.sourceIds, condition: null}],
        },
        {...context, contentBrief: first},
      ),
    ).toThrow(/claim evidence/iu);
  });
});
