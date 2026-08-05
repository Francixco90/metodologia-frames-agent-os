import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {z} from 'zod';

import {N8nDryRunTransport, N8nEvidenceResolutionError} from '../../adapters/n8n/index.ts';

const nodeSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  credentials: z.never().optional(),
});

const workflowSchema = z.object({
  name: z.string(),
  active: z.literal(false),
  nodes: z.array(nodeSchema).min(1),
  meta: z.object({
    governance: z.literal('inactive-no-credentials-no-network'),
  }),
});

const policySchema = z.object({
  enabled: z.literal(true),
  effect: z.literal('block_live_execution'),
});

const callbackSchema = z.object({
  mode: z.literal('receipt-only'),
  network_callback_enabled: z.literal(false),
});

const root = process.cwd();
const workflow = workflowSchema.parse(
  JSON.parse(
    readFileSync(resolve(root, 'workflows/adapters/vs-001-approved-package-dry-run.json'), 'utf8'),
  ),
);
policySchema.parse(
  JSON.parse(readFileSync(resolve(root, 'adapters/n8n/kill-switch.json'), 'utf8')),
);
callbackSchema.parse(
  JSON.parse(readFileSync(resolve(root, 'adapters/n8n/callback-policy.json'), 'utf8')),
);

const forbiddenNodePattern = /(http|webhook|email|slack|telegram|drive|calendar|publish)/iu;
const unsafeNodes = workflow.nodes.filter(({type}) => forbiddenNodePattern.test(type));
const digest = (character: string): string => character.repeat(64);
let unresolvedEvidenceRejected = false;
try {
  new N8nDryRunTransport().propose({
    schemaVersion: 'n8n-approved-render-package-v2',
    artifactId: 'VID:FORGED',
    artifactRef: 'missing/artifact.mp4',
    artifactHash: digest('a'),
    compositionId: 'MissingComposition',
    renderReceiptRef: 'missing/render-receipt.json',
    renderReceiptHash: digest('b'),
    inputPropsRef: 'missing/input-props.json',
    inputPropsHash: digest('c'),
    assetManifestRef: 'missing/assets.yml',
    assetManifestHash: digest('d'),
    idempotencyKey: 'forged-evidence-check-001',
    approvalState: 'HUMAN_APPROVED',
    humanApproverActorId: 'H01',
    approvalReceiptId: 'APR:FORGED:001',
    approvalReceiptRef: 'missing/approval.json',
    approvalReceiptHash: digest('e'),
    callbackPolicyRef: 'missing/callback.json',
    callbackPolicyHash: digest('f'),
    retryPolicyRef: 'missing/retry.json',
    retryPolicyHash: digest('1'),
    killSwitchRef: 'missing/kill-switch.json',
    killSwitchHash: digest('2'),
    dryRun: true,
  });
} catch (error) {
  unresolvedEvidenceRejected = error instanceof N8nEvidenceResolutionError;
}

if (unsafeNodes.length > 0) {
  console.error(
    `n8n workflow contiene nodos live: ${unsafeNodes.map(({type}) => type).join(', ')}`,
  );
  process.exitCode = 1;
} else if (!unresolvedEvidenceRejected) {
  console.error('n8n transport no rechazó evidencia inexistente en un package shape-valid.');
  process.exitCode = 1;
} else {
  console.info(
    `PASS N8N: workflow inactive, ${workflow.nodes.length} nodos, sin credenciales, red ni publicación; evidence resolution fail-closed.`,
  );
}
