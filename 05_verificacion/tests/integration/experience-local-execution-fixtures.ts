import {createHash} from 'node:crypto';
import {mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';

import {hashExperienceValue} from 'core/contracts/index.ts';
import {runFirstTurnGatewayV1, type LocalExperienceExecutionInputV1} from 'workflows/core/index.ts';

import {materializeDecisionFunnelFixture} from '../fixtures/experience/decision-funnel-fixture.ts';

export type LocalContentExecutionInput = Extract<LocalExperienceExecutionInputV1, {routeId: 'R6'}>;
export type LocalMaterialReference = {ref: string; sha256: string};

const roots: string[] = [];
export const timestamps = {
  started_at: '2026-08-09T12:00:00.000Z',
  completed_at: '2026-08-09T12:00:01.000Z',
};

export const cleanupWorkspaces = (): void => {
  for (const root of roots.splice(0)) rmSync(root, {recursive: true, force: true});
};

export const workspace = (): string => {
  const root = mkdtempSync(resolve(tmpdir(), 'frames-local-experience-'));
  roots.push(root);
  return root;
};

export const materializeAuthorizedSource = (
  root: string,
  input: {
    sourceId: string;
    slug: string;
    contents: string;
    authority: 'user_assertion';
    rights: 'restricted';
  },
) => {
  mkdirSync(resolve(root, 'evidence'), {recursive: true});
  const source = {
    ref: `evidence/${input.slug}.md`,
    sha256: createHash('sha256').update(input.contents).digest('hex'),
  };
  writeFileSync(resolve(root, source.ref), input.contents, 'utf8');
  const briefSource = {
    source_id: input.sourceId,
    ...source,
    authority: input.authority,
    rights: input.rights,
  };
  const receiptDraft = {
    schemaVersion: 'brief-source-authority-receipt-v1' as const,
    receiptId: `RCP-${input.sourceId}`,
    source: briefSource,
    authorityMode: 'LOCAL_SIMULATION' as const,
    authorityActorId: 'LOCAL-USER-ASSERTION' as const,
    rightsBasis: 'user_supplied_for_local_brief' as const,
    allowedUseScope: 'local_internal_brief_only' as const,
    restrictions: ['no_external_distribution', 'no_claim_promotion'] as const,
    recordedAt: timestamps.started_at,
  };
  const receipt = {...receiptDraft, canonicalSha256: hashExperienceValue(receiptDraft)};
  const receiptBytes = `${JSON.stringify(receipt, null, 2)}\n`;
  const authorityReceipt = {
    ref: `evidence/${input.slug}.authority.json`,
    sha256: createHash('sha256').update(receiptBytes).digest('hex'),
  };
  writeFileSync(resolve(root, authorityReceipt.ref), receiptBytes, 'utf8');
  return {source, briefSource, authorityReceipt};
};

export const writeAuthorityReceiptBytes = (
  root: string,
  authorityReceipt: LocalMaterialReference,
  bytes: string,
): LocalMaterialReference => {
  writeFileSync(resolve(root, authorityReceipt.ref), bytes, 'utf8');
  return {
    ref: authorityReceipt.ref,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  };
};

export const rewriteAuthorityReceipt = (
  root: string,
  authorityReceipt: LocalMaterialReference,
  mutate: (receipt: Record<string, unknown>) => void,
  recomputeCanonical = true,
): LocalMaterialReference => {
  const receipt = JSON.parse(readFileSync(resolve(root, authorityReceipt.ref), 'utf8')) as Record<
    string,
    unknown
  >;
  mutate(receipt);
  if (recomputeCanonical) receipt.canonicalSha256 = hashExperienceValue(receipt);
  return writeAuthorityReceiptBytes(
    root,
    authorityReceipt,
    `${JSON.stringify(receipt, null, 2)}\n`,
  );
};

export const selectedLocalInput = (
  root: string,
  aliasRefs = false,
  outputDirectoryRef = 'work/private/experience/content',
): LocalContentExecutionInput => {
  const prompt = 'Ayúdame a generar una pieza';
  const handler = () => ({
    routeId: 'R6' as const,
    workflowPlan: ['P03'],
    activeStep: 'P03',
    skillBindings: [{stepId: 'P03', primarySkillId: 'content-os-creative'}],
    briefPreview: {briefKind: 'content-brief', summary: 'Brief sintético.', materialized: false},
    recommendedNextAction: 'Revisar y aprobar el brief.',
  });
  const requestHash = runFirstTurnGatewayV1({prompt}, {R6: handler, R7: handler}).requestHash;
  const decision = materializeDecisionFunnelFixture(requestHash);
  const envelope = runFirstTurnGatewayV1(
    {prompt, decisionFunnel: decision.funnel, decisionSelection: decision.selection},
    {R6: handler, R7: handler},
  );
  return {
    root,
    routeId: 'R6',
    envelope,
    decision,
    decisionRefs: {
      funnel: {ref: 'evidence/decision-funnel.json', sha256: decision.funnel.canonicalSha256},
      selection: {
        ref: aliasRefs ? 'evidence/./decision-funnel.json' : 'evidence/decision-selection.json',
        sha256: decision.selection.canonicalSha256,
      },
    },
    sourceMaterials: [],
    briefSources: [],
    outputDirectoryRef,
    actorId: 'RT-04-EXPERIENCE',
    startedAt: timestamps.started_at,
    completedAt: timestamps.completed_at,
    domainIntent: {
      request: prompt,
      request_hash: requestHash,
      content_class: 'educational',
      audience: 'Líderes de producto',
      outcome: 'Comprender una decisión responsable',
      selected_stage_path: ['P03'],
      channels: ['web'],
      restrictions: [],
    },
  };
};
