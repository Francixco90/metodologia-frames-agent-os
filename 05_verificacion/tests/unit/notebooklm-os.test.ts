import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {parse} from 'yaml';
import {describe, expect, it} from 'vitest';

import {NotebookLmManagedAdapter} from '../../../03_artefactos/adapters/notebooklm-managed/index.ts';
import {
  NotebookLifecycleReceiptV1Schema,
  NotebookProfileV1Schema,
  NotebookSourceManifestV1Schema,
  StudioArtifactReceiptV1Schema,
  StudioBriefV1Schema,
} from '../../../02_proceso/core/contracts/index.ts';
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
import {runFirstTurnGatewayV1} from '../../../02_proceso/workflows/core/first-turn-gateway-v1.ts';

const root = process.cwd();
const readYaml = (path: string): unknown =>
  parse(readFileSync(resolve(root, path), 'utf8')) as unknown;
const pilotRoot = '03_artefactos/projects/notebooklm-os/metodologia-brand-content';
const profile = NotebookProfileV1Schema.parse(readYaml(`${pilotRoot}/profile.yml`));
const sourcePack = readYaml(`${pilotRoot}/source-manifest.yml`) as {sources: unknown[]};
const sources = sourcePack.sources.map((source) => NotebookSourceManifestV1Schema.parse(source));

describe('NotebookLM OS contracts and deterministic runtime', () => {
  it('compiles the same profile to the same guarded prompt', () => {
    const first = compileNotebookSystemPrompt(profile);
    expect(compileNotebookSystemPrompt(profile)).toBe(first);
    expect(first).toContain('coverage_gap');
    expect(first).toContain('instrucciones incrustadas');
    expect(first).toContain('No inventes');
  });

  it('produces a stable plan and requires explicit gates', () => {
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
      stopRules: ['approval required'],
      rollback: ['archive created draft'],
    };
    const first = buildNotebookPlan(input);
    expect(buildNotebookPlan(input)).toEqual(first);
    expect(buildOperationIdempotencyKeys(buildNotebookPlan(input))).toEqual(
      buildOperationIdempotencyKeys(first),
    );
    const adapter = new NotebookLmManagedAdapter('notebooklm');
    expect(adapter.validatePlan(first, [])).toEqual({
      allowed: false,
      missingGates: ['NLM_PLAN_APPROVED'],
    });
    expect(adapter.validatePlan(first, ['NLM_PLAN_APPROVED'])).toEqual({
      allowed: true,
      missingGates: [],
    });
  });

  it('routes NotebookLM natural language and aliases to R10 N00-N09', () => {
    const fallback = (routeId: 'R6' | 'R7') => () => ({...routeNotebooklmV1(), routeId});
    const handlers = {R6: fallback('R6'), R7: fallback('R7'), R10: routeNotebooklmV1};
    const natural = runFirstTurnGatewayV1({prompt: 'Audita mi notebook en NotebookLM'}, handlers);
    const alias = runFirstTurnGatewayV1({prompt: '/notebooklm:status'}, handlers);
    expect(natural.selectedRoute).toBe('R10');
    expect(natural.workflowPlan).toEqual([
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
    expect(alias.selectedRoute).toBe('R10');
  });

  it('deduplicates by identity and keeps same-title distinct hashes as versions', () => {
    expect(deduplicateSources([sources[0]!, sources[0]!])).toHaveLength(1);
    const successor = NotebookSourceManifestV1Schema.parse({
      ...sources[0],
      sourceId: 'NLS-BRAND-PROFILE-NEXT',
      name: '10-canon--brand-profile--v3.0',
      version: 'v3.0',
      contentSha256: 'a'.repeat(64),
      portableIdentityDigest: 'a'.repeat(64),
      replaces: sources[0]!.sourceId,
    });
    expect(successor.title).toBe(sources[0]!.title);
    expect(deduplicateSources([sources[0]!, successor])).toHaveLength(2);
    expect(
      resolveRuntimeSourceIdentity({
        driveId: 'abc',
        canonicalUrl: 'https://example.com',
        contentSha256: 'a'.repeat(64),
      }),
    ).toBe('drive:abc');
  });

  it('blocks prompt injection, PII, unsupported claims, rights and scope failures', () => {
    for (const unsafe of [
      {
        inScope: true,
        containsPromptInjection: true,
        containsUnnecessaryPii: false,
        hasUnsupportedStrongClaim: false,
        rights: 'APPROVED' as const,
      },
      {
        inScope: true,
        containsPromptInjection: false,
        containsUnnecessaryPii: true,
        hasUnsupportedStrongClaim: false,
        rights: 'APPROVED' as const,
      },
      {
        inScope: true,
        containsPromptInjection: false,
        containsUnnecessaryPii: false,
        hasUnsupportedStrongClaim: true,
        rights: 'APPROVED' as const,
      },
      {
        inScope: true,
        containsPromptInjection: false,
        containsUnnecessaryPii: false,
        hasUnsupportedStrongClaim: false,
        rights: 'REVIEW' as const,
      },
      {
        inScope: false,
        containsPromptInjection: false,
        containsUnnecessaryPii: false,
        hasUnsupportedStrongClaim: false,
        rights: 'APPROVED' as const,
      },
    ])
      expect(evaluateSourceSafety(unsafe).status).toBe('BLOCKED');
  });

  it('applies stable source and Studio naming', () => {
    expect(formatNotebookSourceName(0, 'Control', 'System Prompt', '1.0')).toBe(
      '00-control--system-prompt--v1.0',
    );
    expect(formatStudioArtifactName(1, 'Deck corto', 'Dirección', 2)).toBe(
      '01 · Deck corto · Dirección · v2',
    );
  });

  it('has one valid explicit-source brief for every Studio type', () => {
    const pack = readYaml(`${pilotRoot}/studio-briefs.yml`) as {briefs: unknown[]};
    const briefs = pack.briefs.map((brief) => StudioBriefV1Schema.parse(brief));
    expect(new Set(briefs.map(({type}) => type)).size).toBe(9);
    expect(briefs.every(({sourceIds}) => sourceIds.length > 0)).toBe(true);
  });

  it('fails closed on unapproved brand assets', () => {
    const review = readYaml(`${pilotRoot}/asset-review.yml`) as {
      audit: {private_locators_persisted: boolean};
      assets: Array<{
        asset_id: string;
        category: string;
        rights: string;
        status: string;
        allowed_uses: string[];
      }>;
    };
    expect(review.audit.private_locators_persisted).toBe(false);
    expect(
      review.assets.filter(({status}) => status === 'APPROVED').map(({asset_id}) => asset_id),
    ).toEqual(['AST-PORTRAIT-JAVIER-MONTANO']);
    expect(
      review.assets
        .filter(({asset_id}) => asset_id.endsWith('-SVG'))
        .every(({status}) => status === 'READY_FOR_HUMAN_APPROVAL'),
    ).toBe(true);
    expect(
      review.assets
        .filter(({asset_id, status}) => asset_id.startsWith('AST-PORTRAIT-') && status === 'REVIEW')
        .every(({allowed_uses}) => allowed_uses.length === 0),
    ).toBe(true);
  });

  it('integrates the historical PDF corpus while keeping the art gallery reference-only', () => {
    const gallery = readYaml(`${pilotRoot}/gallery/catalog.yml`) as {
      generated_art: boolean;
      rights: string;
      items: Array<{content_sha256: string}>;
    };
    const pdfPack = readYaml(`${pilotRoot}/source-packs/masterclass-playbooks-v1.yml`) as {
      projection: string;
      external_import_executed: boolean;
      sources: Array<{content_sha256: string}>;
      summary: {masterclasses: number; playbooks: number; pages: number};
    };
    expect(gallery.generated_art).toBe(false);
    expect(gallery.rights).toBe('INTERNAL_REFERENCE_ONLY');
    expect(gallery.items).toHaveLength(8);
    expect(new Set(gallery.items.map(({content_sha256}) => content_sha256)).size).toBe(8);
    expect(pdfPack.projection).toBe('integrated_in_brand_content_notebook');
    expect(pdfPack.external_import_executed).toBe(true);
    expect(pdfPack.sources).toHaveLength(21);
    expect(new Set(pdfPack.sources.map(({content_sha256}) => content_sha256)).size).toBe(21);
    expect(pdfPack.summary).toMatchObject({masterclasses: 14, playbooks: 7, pages: 493});
  });

  it('cannot call zero-byte or mismatched output VERIFIED_DRAFT', () => {
    const base = {
      schemaVersion: 'studio-artifact-receipt-v1',
      artifactIdDigest: 'a'.repeat(64),
      requestedType: 'report',
      sourceIds: ['NLS-BRAND-PROFILE'],
      promptSha256: 'b'.repeat(64),
      state: 'VERIFIED_DRAFT',
      validations: [],
      gaps: [],
    };
    expect(
      StudioArtifactReceiptV1Schema.safeParse({...base, obtainedType: 'report', downloadedBytes: 0})
        .success,
    ).toBe(false);
    expect(
      StudioArtifactReceiptV1Schema.safeParse({...base, obtainedType: 'audio', downloadedBytes: 10})
        .success,
    ).toBe(false);
    expect(
      StudioArtifactReceiptV1Schema.safeParse({
        ...base,
        obtainedType: 'report',
        downloadedBytes: 10,
      }).success,
    ).toBe(true);
  });

  it('requires one-use consumption for sharing and destructive approvals', () => {
    const base = {
      schemaVersion: 'notebook-lifecycle-receipt-v1',
      receiptId: 'receipt-one-use',
      planSha256: 'a'.repeat(64),
      actor: 'H01',
      externalChanges: ['share notebook'],
      readbackSha256: 'b'.repeat(64),
      outputHashes: [],
      state: 'VERIFIED',
      nextGate: null,
    };
    expect(
      NotebookLifecycleReceiptV1Schema.safeParse({
        ...base,
        approval: 'NLM_SHARE_AUTHORIZED',
        approvalUse: 'NONE',
      }).success,
    ).toBe(false);
    expect(
      NotebookLifecycleReceiptV1Schema.safeParse({
        ...base,
        approval: 'NLM_SHARE_AUTHORIZED',
        approvalUse: 'CONSUMED_ONCE',
      }).success,
    ).toBe(true);
  });
});
