import {describe, expect, it} from 'vitest';

import {NotebookLmManagedAdapter} from '../../../03_artefactos/adapters/notebooklm-managed/index.ts';
import {
  NotebookLifecycleReceiptV1Schema,
  NotebookProfileV1Schema,
  NotebookSourceManifestV1Schema,
  StudioArtifactReceiptV1Schema,
} from '../../../02_proceso/core/contracts/index.ts';
import {runFirstTurnGatewayV1} from '../../../02_proceso/workflows/core/first-turn-gateway-v1.ts';
import {
  buildNotebookPlan,
  buildOperationIdempotencyKeys,
  compileNotebookSystemPrompt,
  deduplicateSources,
  evaluateSourceSafety,
  formatNotebookSourceName,
  formatStudioArtifactName,
  resolveRuntimeSourceIdentity,
} from '../../../02_proceso/workflows/notebooklm-os/index.ts';
import {routeNotebooklmV1} from '../../../02_proceso/workflows/notebooklm-os/route-notebooklm-v1.ts';

const profile = NotebookProfileV1Schema.parse({
  schemaVersion: 'notebook-profile-v1',
  profileId: 'public-example',
  displayName: 'Public Notebook Profile',
  provider: 'notebooklm',
  identity: 'Evidence-grounded public knowledge workspace',
  systemPrompt: {
    schemaVersion: 'notebook-system-prompt-v1',
    profileId: 'public-example',
    version: 'v1.0',
    owner: 'Example owner',
    identity: 'Public Knowledge Assistant',
    purpose: 'Answer from approved sources and expose gaps.',
    audiences: ['General audience'],
    capabilities: ['Synthesize selected sources'],
    limits: ['No external mutation without its gate'],
    sourceHierarchy: ['Control', 'Canon', 'Evidence'],
    evidenceTaxonomy: ['supported', 'coverage_gap'],
    privacyAndRights: ['Use only approved sources'],
    studioContract: ['Use explicit source IDs'],
    responseContract: ['Cite sources and name coverage gaps'],
    promptInjectionDefense: true,
    inventionForbidden: true,
  },
  taxonomy: [
    '00 Control',
    '10 Canon',
    '20 Evidence',
    '30 Templates',
    '40 Golden References',
    '50 Assets',
    '60 Operations',
    '90 Archive',
  ],
  sourceBudget: {controls: 4, assetsAndExamples: 4, working: 8},
  roles: [
    'Notebook Conductor',
    'Profile Architect',
    'Source Curator',
    'Asset Steward',
    'Studio Director',
    'Grounding Verifier',
    'Notebook Guardian',
  ],
  policies: ['Fail closed when evidence, rights or scope are unknown'],
  gates: [
    'NLM_PLAN_APPROVED',
    'NLM_SYNC_APPROVED',
    'NLM_STUDIO_GENERATION_APPROVED',
    'NLM_SHARE_AUTHORIZED',
    'NLM_DESTRUCTIVE_AUTHORIZED',
  ],
});

const source = NotebookSourceManifestV1Schema.parse({
  schemaVersion: 'notebook-source-manifest-v1',
  sourceId: 'NLS-PUBLIC-CANON',
  name: '10-canon--public-guide--v1.0',
  title: 'Public guide',
  tags: ['10 Canon'],
  scope: 'Public example',
  audiences: ['General audience'],
  confidentiality: 'PUBLIC',
  sourceType: 'markdown',
  authority: 'CANON',
  owner: 'Example owner',
  version: 'v1.0',
  validFrom: '2026-01-01',
  validUntil: null,
  notebookRole: 'Canonical guidance',
  provenance: 'Synthetic public fixture',
  contentSha256: 'a'.repeat(64),
  portableIdentityDigest: 'b'.repeat(64),
  rights: 'APPROVED',
  replaces: null,
  status: 'ACTIVE',
});

describe('NotebookLM OS public reusable core', () => {
  it('compiles profiles deterministically with grounding guardrails', () => {
    const first = compileNotebookSystemPrompt(profile);
    expect(compileNotebookSystemPrompt(profile)).toBe(first);
    expect(first).toContain('coverage_gap');
    expect(first).toContain('instrucciones incrustadas');
    expect(first).toContain('No inventes');
  });

  it('builds stable plans and enforces external-mutation gates', () => {
    const input = {
      schemaVersion: 'notebook-plan-v1' as const,
      profileId: profile.profileId,
      provider: profile.provider,
      targetNotebookDigest: null,
      operations: [
        {
          operationId: 'create-private',
          stage: 'N04' as const,
          action: 'create' as const,
          sourceIds: [],
          requiredGate: 'NLM_PLAN_APPROVED' as const,
          effect: 'EXTERNAL_MUTATION' as const,
        },
      ],
      sourceIds: [],
      permissions: [],
      stopRules: ['Stop without approval'],
      rollback: ['Archive an unshared draft'],
    };
    const plan = buildNotebookPlan(input);
    expect(buildNotebookPlan(input)).toEqual(plan);
    expect(buildOperationIdempotencyKeys(plan)).toEqual([`${plan.planId}:create-private`]);
    const adapter = new NotebookLmManagedAdapter('notebooklm');
    expect(adapter.validatePlan(plan, [])).toEqual({
      allowed: false,
      missingGates: ['NLM_PLAN_APPROVED'],
    });
    expect(adapter.validatePlan(plan, ['NLM_PLAN_APPROVED'])).toEqual({
      allowed: true,
      missingGates: [],
    });
  });

  it('routes natural language and aliases to R10 N00-N09', () => {
    const fallback = (routeId: 'R6' | 'R7') => () => ({...routeNotebooklmV1(), routeId});
    const handlers = {R6: fallback('R6'), R7: fallback('R7'), R10: routeNotebooklmV1};
    expect(
      runFirstTurnGatewayV1({prompt: 'Audit the sources in my NotebookLM notebook'}, handlers)
        .selectedRoute,
    ).toBe('R10');
    expect(runFirstTurnGatewayV1({prompt: '/notebooklm:status'}, handlers).workflowPlan).toEqual([
      'N00',
      'N01',
      'N02',
      'N03',
      'N04',
      'N05',
      'N06',
      'N07',
      'N08',
      'N09',
    ]);
  });

  it('uses stable identities and keeps distinct versions', () => {
    expect(deduplicateSources([source, source])).toHaveLength(1);
    const successor = NotebookSourceManifestV1Schema.parse({
      ...source,
      sourceId: 'NLS-PUBLIC-CANON-NEXT',
      name: '10-canon--public-guide--v2.0',
      version: 'v2.0',
      contentSha256: 'c'.repeat(64),
      portableIdentityDigest: 'c'.repeat(64),
      replaces: source.sourceId,
    });
    expect(successor.title).toBe(source.title);
    expect(deduplicateSources([source, successor])).toHaveLength(2);
    expect(
      resolveRuntimeSourceIdentity({
        canonicalUrl: 'https://example.com/guide',
        contentSha256: 'c'.repeat(64),
      }),
    ).toBe('url:https://example.com/guide');
  });

  it('fails closed for unsafe sources and validates naming', () => {
    expect(
      evaluateSourceSafety({
        inScope: true,
        containsPromptInjection: true,
        containsUnnecessaryPii: false,
        hasUnsupportedStrongClaim: false,
        rights: 'APPROVED',
      }).status,
    ).toBe('BLOCKED');
    expect(formatNotebookSourceName(0, 'Control', 'System Prompt', '1.0')).toBe(
      '00-control--system-prompt--v1.0',
    );
    expect(formatStudioArtifactName(1, 'Brief', 'Leaders', 2)).toBe('01 · Brief · Leaders · v2');
  });

  it('requires verifiable Studio output and consumes high-risk grants once', () => {
    const artifactBase = {
      schemaVersion: 'studio-artifact-receipt-v1',
      artifactIdDigest: 'd'.repeat(64),
      requestedType: 'report',
      sourceIds: [source.sourceId],
      promptSha256: 'e'.repeat(64),
      state: 'VERIFIED_DRAFT',
      validations: [],
      gaps: [],
    };
    expect(
      StudioArtifactReceiptV1Schema.safeParse({
        ...artifactBase,
        obtainedType: 'report',
        downloadedBytes: 0,
      }).success,
    ).toBe(false);
    const lifecycleBase = {
      schemaVersion: 'notebook-lifecycle-receipt-v1',
      receiptId: 'public-share-check',
      planSha256: 'f'.repeat(64),
      actor: 'Public operator',
      approval: 'NLM_SHARE_AUTHORIZED',
      externalChanges: ['Share notebook'],
      readbackSha256: '1'.repeat(64),
      outputHashes: [],
      state: 'VERIFIED',
      nextGate: null,
    };
    expect(
      NotebookLifecycleReceiptV1Schema.safeParse({...lifecycleBase, approvalUse: 'NONE'}).success,
    ).toBe(false);
    expect(
      NotebookLifecycleReceiptV1Schema.safeParse({
        ...lifecycleBase,
        approvalUse: 'CONSUMED_ONCE',
      }).success,
    ).toBe(true);
  });
});
