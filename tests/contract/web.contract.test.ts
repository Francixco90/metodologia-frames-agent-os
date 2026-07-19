import {describe, expect, it} from 'vitest';
import {z} from 'zod';

import {pageModelSchema} from '../../networks/web/src/model.ts';
import {renderPage} from '../../networks/web/src/render.ts';
import {
  readRepositoryJson,
  readRepositoryText,
  readRepositoryYaml,
  sha256,
} from '../fixtures/verifier/io.ts';

const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/u);
const BuildReceiptSchema = z.strictObject({
  schema_version: z.literal(1),
  receipt_id: z.string().min(1),
  artifact_id: z.string().min(1),
  source_snapshot_id: z.string().min(1),
  deterministic_timestamp: z.iso.datetime(),
  inputs: z.array(
    z.strictObject({
      path: z.string().min(1),
      sha256: Sha256Schema,
    }),
  ),
  output: z.strictObject({
    path: z.string().min(1),
    sha256: Sha256Schema,
  }),
  state: z.literal('RENDERED_DRAFT'),
  publish_authorized: z.literal(false),
});

const ClaimRegistrySchema = z.object({
  claims: z.array(
    z.object({
      claim_id: z.string(),
      state: z.literal('active'),
      source_id: z.string(),
      source_snapshot_id: z.string(),
      source_normalized_sha256: Sha256Schema,
      allowed_use_scope: z.literal('local_contract_testing_only'),
    }),
  ),
});

describe('A06 Web governed contract', () => {
  it('resolves every visible claim and section reference to the active claim registry', () => {
    const page = pageModelSchema.parse(
      readRepositoryJson('projects/vs-001-source-to-campaign/web/page.json'),
    );
    const registry = ClaimRegistrySchema.parse(
      readRepositoryYaml('registries/claims/claim-registry.yml'),
    );
    const claimsById = new Map(registry.claims.map((claim) => [claim.claim_id, claim]));

    expect(new Set(page.claims.map(({claimId}) => claimId)).size).toBe(page.claims.length);
    for (const claim of page.claims) {
      expect(claimsById.get(claim.claimId)).toMatchObject({
        source_id: claim.sourceId,
        source_snapshot_id: page.sourceSnapshotId,
      });
    }
    for (const section of page.sections) {
      expect(section.claimIds.every((claimId) => claimsById.has(claimId))).toBe(true);
    }
  });

  it('reproduces the checked-in HTML and verifies every declared build hash in memory', () => {
    const modelPath = 'projects/vs-001-source-to-campaign/web/page.json';
    const cssPath = 'networks/web/src/styles.css';
    const outputPath = 'projects/vs-001-source-to-campaign/web/artifact/index.html';
    const modelRaw = readRepositoryText(modelPath);
    const cssRaw = readRepositoryText(cssPath);
    const page = pageModelSchema.parse(JSON.parse(modelRaw) as unknown);
    const rendered = renderPage(page, cssRaw);
    const checkedIn = readRepositoryText(outputPath);
    const receipt = BuildReceiptSchema.parse(
      readRepositoryJson('projects/vs-001-source-to-campaign/web/artifact/build-receipt.json'),
    );
    const receiptInputs = new Map(receipt.inputs.map((input) => [input.path, input.sha256]));

    expect(rendered).toBe(checkedIn);
    expect(receiptInputs.get(modelPath)).toBe(sha256(modelRaw));
    expect(receiptInputs.get(cssPath)).toBe(sha256(cssRaw));
    expect(receipt.output).toEqual({
      path: outputPath,
      sha256: sha256(checkedIn),
    });
    expect(receipt.publish_authorized).toBe(false);
  });

  it('keeps the page at RENDERED_DRAFT while its source bundle is not locked', () => {
    const page = pageModelSchema.parse(
      readRepositoryJson('projects/vs-001-source-to-campaign/web/page.json'),
    );
    const sourceBundle = z
      .object({
        state: z.literal('PARTIAL_CONTROLLED'),
        source_locked: z.literal(false),
        source_snapshot_id: z.string(),
      })
      .parse(readRepositoryYaml('projects/vs-001-source-to-campaign/source-bundle.yml'));
    const html = readRepositoryText('projects/vs-001-source-to-campaign/web/artifact/index.html');

    expect(page.status).toBe('RENDERED_DRAFT');
    expect(page.sourceSnapshotId).toBe(sourceBundle.source_snapshot_id);
    expect(html).toContain('no simula una aprobación');
    expect(html).toContain('sin publicación');
  });
});
