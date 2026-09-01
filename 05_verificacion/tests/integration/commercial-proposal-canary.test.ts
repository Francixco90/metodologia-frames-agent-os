import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {afterEach, describe, expect, it} from 'vitest';

import {FramesWorkOrderV1Schema} from 'core/contracts/index.ts';
import {canonicalize} from 'core/evidence/canonical-json.ts';
import {hashCanonical} from 'core/evidence/hash.ts';
import * as CP from 'workflows/multimedia/_schema/commercial-proposal-v1.schema.ts';
import {parseFramesDeliverableMarkdown} from 'workflows/multimedia/_runner/deliverable-model.ts';
import {verifyDeliverableParity} from 'workflows/multimedia/_runner/deliverable-parity.ts';
import {stableStringify} from 'workflows/multimedia/_runner/brief-model.ts';
import * as Profile from 'workflows/multimedia/_runner/commercial-proposal-profile-v1.ts';
import {
  createCommercialProposalProjections,
  createCommercialProposalAuthorizationV1,
  commercialProposalWorkOrderInputsV1,
  verifyCommercialProposalProjections,
  type CommercialProposalProjectionBundleV1,
} from 'workflows/multimedia/_runner/commercial-proposal-projections-v1.ts';
import {encodeRfc4180} from 'workflows/multimedia/_runner/rfc4180-v1.ts';
import {
  commercialProposalClaim as claim,
  commercialProposalReadiness as readiness,
  commercialProposalReadinessDraft as readinessDraft,
  commercialProposalSources as sources,
  commercialProposalSpecDraft as specDraft,
  makeCommercialProposalBundle as bundle,
  makeCommercialProposalMaterials,
  parseCommercialProposalSpec as parseSpec,
  runCommercialProposalKernel as runKernel,
} from 'tests/fixtures/commercial-proposal-v1.fixture.ts';
import {cleanupTransactionFixtures} from 'tests/fixtures/transaction-kernel-v1.fixture.ts';

const sha = (character: string): string => character.repeat(64);

afterEach(cleanupTransactionFixtures);

describe('R6 commercial-proposal governed canary', () => {
  it('produces deterministic governed MD/HTML/JSON/CSV without a deck', () => {
    const projection = bundle();
    const byFormat = new Map(projection.artifacts.map((artifact) => [artifact.format, artifact]));
    const text = (format: 'md' | 'html' | 'json' | 'csv'): string =>
      new TextDecoder().decode(byFormat.get(format)?.bytes);
    const document = parseFramesDeliverableMarkdown(text('md'));

    expect(projection.artifacts.map(({format}) => format)).toEqual(['md', 'html', 'json', 'csv']);
    expect(projection.artifacts.every(({relativePath}) => !relativePath.includes('deck'))).toBe(
      true,
    );
    expect(projection.manifest).toMatchObject({
      maximumAutomaticState: 'RENDERED_DRAFT',
      deck: {requested: false, explicitConfirmation: false, materialized: false},
      template: projection.spec.template,
      sectionSequence: CP.COMMERCIAL_PROPOSAL_SECTION_SEQUENCE_V1,
      workOrderSha256: hashCanonical(projection.workOrder),
      authorizationSha256: hashCanonical(projection.authorization),
    });
    expect(
      createHash('sha256')
        .update(readFileSync(resolve(process.cwd(), CP.COMMERCIAL_PROPOSAL_TEMPLATE_REF_V1)))
        .digest('hex'),
    ).toBe(CP.COMMERCIAL_PROPOSAL_TEMPLATE_SHA256_V1);
    let sequenceCursor = -1;
    for (const section of CP.COMMERCIAL_PROPOSAL_SECTION_SEQUENCE_V1) {
      const next = text('md').indexOf(`### ${section}`, sequenceCursor + 1);
      expect(next).toBeGreaterThan(sequenceCursor);
      sequenceCursor = next;
    }
    expect(projection.workOrder.inputs).toEqual(
      commercialProposalWorkOrderInputsV1(projection.spec),
    );
    expect(projection.authorization).toEqual(
      createCommercialProposalAuthorizationV1(projection.spec, projection.workOrder),
    );
    expect(document.frontmatter).toMatchObject({state: 'RENDERED_DRAFT', next_gate: 'G14'});
    expect(
      verifyDeliverableParity(
        text('md'),
        text('html').replace('.section-body,.note{overflow-wrap:anywhere}', ''),
      ).status,
    ).toBe('PASS');
    expect(text('html')).toContain('.section-body,.note{overflow-wrap:anywhere}');
    expect(text('json')).toBe(`${stableStringify(projection.spec)}\n`);
    expect(text('csv')).toContain('"Valor, ""verificable""\r\nsegunda línea."');
    expect(text('csv')).toBe(
      encodeRfc4180([
        ['claim_id', 'classification', 'statement', 'evidence_source_ids', 'limitations'],
        [
          'claim-cycle-time',
          'INFERRED',
          'Valor, "verificable"\nsegunda línea.',
          sources[0]!.source_id,
          'Synthetic evidence; no production commitment.',
        ],
      ]),
    );
    expect(verifyCommercialProposalProjections(projection, 'verification-pass').verdict).toBe(
      'PASS',
    );
  });

  // prettier-ignore
  it.each([
    ['artifact-path', (candidate: CommercialProposalProjectionBundleV1) => { candidate.artifacts[0]!.relativePath = 'rogue.md'; }, 'artifactBinding'],
    ['format-media', (candidate: CommercialProposalProjectionBundleV1) => { candidate.artifacts[0]!.format = 'csv'; candidate.artifacts[0]!.mediaType = 'text/csv'; }, 'artifactBinding'],
    ['physical-bytes', (candidate: CommercialProposalProjectionBundleV1) => { candidate.artifacts[0]!.bytes = new TextEncoder().encode('rogue'); }, 'artifactBinding'],
    ['html-parity', (candidate: CommercialProposalProjectionBundleV1) => { candidate.artifacts[1]!.bytes = new TextEncoder().encode('<html>rogue</html>'); }, 'markdownHtmlParity'],
    ['declared-hash', (candidate: CommercialProposalProjectionBundleV1) => { candidate.artifacts[0]!.sha256 = sha('9'); }, 'artifactBinding'],
    ['material-byte', (candidate: CommercialProposalProjectionBundleV1) => { (candidate.materialBinding.materials[0] as {bytes: Uint8Array}).bytes = new TextEncoder().encode('fabricated'); }, 'materialBinding'],
    ['source-authority-manifest', (candidate: CommercialProposalProjectionBundleV1) => { (candidate.materialBinding.sourceAuthorityManifest as {manifestId: string}).manifestId = 'source-authority-rogue'; }, 'materialBinding'],
    ['commercial-authority-manifest', (candidate: CommercialProposalProjectionBundleV1) => { (candidate.materialBinding.commercialAuthorityManifest as {manifestId: string}).manifestId = 'commercial-authority-rogue'; }, 'materialBinding'],
    ['extra-duplicate', (candidate: CommercialProposalProjectionBundleV1) => { candidate.artifacts.push(structuredClone(candidate.artifacts[0]!)); }, 'artifactBinding'],
    ['manifest-duplicate', (candidate: CommercialProposalProjectionBundleV1) => { candidate.manifest.artifacts.push(structuredClone(candidate.manifest.artifacts[0]!)); }, 'contracts'],
    ['spec-drift', (candidate: CommercialProposalProjectionBundleV1) => { candidate.spec.objective = 'mutated after projection'; }, 'contracts'],
    ['manifest-drift', (candidate: CommercialProposalProjectionBundleV1) => { candidate.manifest.specSha256 = sha('8'); }, 'contractBinding'],
    ['template-ref', (candidate: CommercialProposalProjectionBundleV1) => { (candidate.spec.template as {ref: string}).ref = 'rogue.md'; }, 'contracts'],
    ['template-hash', (candidate: CommercialProposalProjectionBundleV1) => { (candidate.spec.template as {sha256: string}).sha256 = sha('9'); }, 'contracts'],
    ['section-sequence', (candidate: CommercialProposalProjectionBundleV1) => { candidate.spec.sectionSequence.reverse(); }, 'contracts'],
    ['workorder-input', (candidate: CommercialProposalProjectionBundleV1) => { candidate.workOrder.inputs[0]!.sha256 = sha('9'); }, 'executionBinding'],
    ['authorization', (candidate: CommercialProposalProjectionBundleV1) => { candidate.authorization.specSha256 = sha('9'); }, 'executionBinding'],
  ])('returns REVISE for %s', (label, mutate, failedCheck) => {
    const candidate = structuredClone(bundle());
    mutate(candidate);
    const receipt = verifyCommercialProposalProjections(candidate, `verification-${label}`);
    expect(receipt.verdict).toBe('REVISE');
    expect(receipt.checks[failedCheck as keyof typeof receipt.checks]).toBe('FAIL');
  });

  it('rejects a spec, WorkOrder, or authorization that is not the exact execution binding', () => {
    const projection = bundle();
    const changedOrder = structuredClone(projection.workOrder);
    changedOrder.inputs[0]!.sha256 = sha('9');
    expect(() =>
      createCommercialProposalProjections(
        projection.spec,
        readiness(),
        {
          workOrder: changedOrder,
          authorization: projection.authorization,
        },
        projection.materialBinding,
      ),
    ).toThrow(/COMMERCIAL_PROPOSAL_EXECUTION_BINDING_MISMATCH/u);
    expect(() =>
      createCommercialProposalProjections(
        projection.spec,
        readiness(),
        {
          workOrder: projection.workOrder,
          authorization: {...projection.authorization, readinessSha256: sha('9')},
        },
        projection.materialBinding,
      ),
    ).toThrow(/COMMERCIAL_PROPOSAL_EXECUTION_BINDING_MISMATCH/u);
    const changedSpec = parseSpec({workOrderSha256: sha('9')});
    expect(() =>
      createCommercialProposalProjections(
        changedSpec,
        readiness(),
        {
          workOrder: projection.workOrder,
          authorization: createCommercialProposalAuthorizationV1(changedSpec, projection.workOrder),
        },
        makeCommercialProposalMaterials(changedSpec),
      ),
    ).toThrow(/COMMERCIAL_PROPOSAL_EXECUTION_BINDING_MISMATCH/u);
  });

  it.each([
    ['skillId', {skillId: 'attacker.skill'}],
    ['workflowId', {workflowId: 'workflow.attacker'}],
    ['stepId', {stepId: 'step.attacker'}],
    ['actorId', {actorId: 'actor.attacker'}],
    ['tools', {tools: ['network.fetch']}],
    ['stopRule', {stopRule: 'Continue automatically.'}],
    ['budget', {budget: {targetFiles: 4, maxFiles: 5, targetTokens: 1, maxTokens: 100}}],
  ])('rejects a self-consistent WorkOrder with %s drift', (_label, override) => {
    const projection = bundle();
    const base = structuredClone(projection.workOrder);
    Reflect.deleteProperty(base, 'canonicalSha256');
    const draft = {...base, ...override};
    const order = FramesWorkOrderV1Schema.parse({...draft, canonicalSha256: hashCanonical(draft)});
    const spec = parseSpec({workOrderSha256: hashCanonical(order)});
    const authorization = createCommercialProposalAuthorizationV1(spec, order);
    expect(() =>
      createCommercialProposalProjections(
        spec,
        readiness(),
        {workOrder: order, authorization},
        makeCommercialProposalMaterials(spec),
      ),
    ).toThrow(/COMMERCIAL_PROPOSAL_EXECUTION_BINDING_MISMATCH/u);
  });

  it('rejects PASS with an empty or incomplete verification check set', () => {
    const valid = verifyCommercialProposalProjections(bundle(), 'verification-exact-checks');
    const draft = structuredClone(valid);
    Reflect.deleteProperty(draft, 'canonicalSha256');
    expect(() =>
      CP.CommercialProposalVerificationV1Schema.parse(
        Profile.sealCommercialProposalContract({...draft, checks: {}}),
      ),
    ).toThrow();
    expect(Object.keys(valid.checks).sort()).toEqual([
      'artifactBinding',
      'canonicalJson',
      'contractBinding',
      'contracts',
      'deckBoundary',
      'executionBinding',
      'markdownHtmlParity',
      'materialBinding',
      'rfc4180',
      'templateProjection',
    ]);
  });

  it('requires physical material bytes for every WorkOrder input', () => {
    const projection = bundle();
    const materialBinding = {
      ...structuredClone(projection.materialBinding),
      materials: structuredClone(projection.materialBinding.materials.slice(0, -1)),
    };
    expect(() =>
      createCommercialProposalProjections(
        projection.spec,
        projection.readiness,
        {workOrder: projection.workOrder, authorization: projection.authorization},
        materialBinding,
      ),
    ).toThrow(/COMMERCIAL_PROPOSAL_MATERIAL_BINDING_MISMATCH/u);
  });

  // prettier-ignore
  it.each([
    ['readiness status/issue drift', () => CP.CommercialProposalReadinessV1Schema.parse(Profile.sealCommercialProposalContract({...readinessDraft, issues: ['unresolved']}))],
    ['blank claim', () => claim({statement: ' '})],
    ['empty claim evidence', () => claim({evidence: []})],
    ['spec without claims', () => parseSpec({claims: []})],
    ['evidence hash drift', () => parseSpec({claims: [claim({evidence: [{sourceId: sources[0]!.source_id, sourceSha256: sha('9')}]})]})],
    ['unknown source rights', () => { const changed = [{...sources[0]!, rights: 'unknown' as const}]; return parseSpec({sources: changed, sourceManifestSha256: hashCanonical(changed)}); }],
    ['unknown source authority', () => { const changed = [{...sources[0]!, authority: 'unknown' as const}]; return parseSpec({sources: changed, sourceManifestSha256: hashCanonical(changed)}); }],
    ['template ref drift', () => parseSpec({template: {...specDraft().template, ref: 'rogue.md'}})],
    ['template hash drift', () => parseSpec({template: {...specDraft().template, sha256: sha('9')}})],
    ['template sequence drift', () => parseSpec({sectionSequence: [...specDraft().sectionSequence].reverse()})],
    ['missing commercial input', () => parseSpec({clientContext: ' '})],
    ['conflated commercial inputs', () => parseSpec({offerScope: specDraft().clientContext})],
    ['incomplete ROI', () => parseSpec({roi: {baseline: specDraft().roi.baseline}})],
    ['pricing without authority', () => parseSpec({pricing: [{item: 'x', amount: 1, currency: 'USD', cadence: 'ONE_TIME'}]})],
    ['commitment without authority', () => parseSpec({commitments: [{statement: 'x', owner: 'x', acceptanceMeasure: 'x'}]})],
  ])('fails closed for %s', (_label, execute) => {
    expect(execute).toThrow();
  });

  it('blocks PII and redaction until a durable privacy receipt V2 exists', () => {
    expect(() =>
      parseSpec({privacy: {piiStatus: 'PRESENT', privacyReviewReceiptSha256: null}}),
    ).toThrow();
    expect(() =>
      parseSpec({privacy: {piiStatus: 'REDACTED', privacyReviewReceiptSha256: null}}),
    ).toThrow();
    expect(() =>
      parseSpec({privacy: {piiStatus: 'REDACTED', privacyReviewReceiptSha256: sha('7')}}),
    ).toThrow();
  });

  it('blocks P08 until a durable V2 receipt proves causal actor separation', () => {
    const ready = readiness();
    const projection = bundle();
    const changed = structuredClone(projection);
    changed.artifacts[3]!.bytes = new TextEncoder().encode('drift\r\n');
    const fabricated = verifyCommercialProposalProjections(changed, 'verification-revise');
    const canonicalBytes = new TextEncoder().encode(stableStringify(fabricated));
    const revisions = [
      {receipt: fabricated, physicalSha256: hashCanonical(fabricated)},
      {
        receiptBytes: canonicalBytes,
        producerTaskId: 'task.same',
        verifierTaskId: 'task.same',
        producerActorId: 'actor.same',
        verifierActorId: 'actor.same',
      },
      {
        receiptBytes: new Uint8Array([0xff, 0xfe]),
        producerTaskId: 'task.producer',
        verifierTaskId: 'task.verifier',
      },
      {
        receiptBytes: canonicalBytes,
        readbackSha256: sha('9'),
        producerTaskId: 'task.producer',
        verifierTaskId: 'task.verifier',
      },
    ];
    const base = {readiness: ready, readinessCanonicalSha256: ready.canonicalSha256};
    expect(Profile.resolveCommercialProposalProfile(base).stagePath).toEqual([
      'P01',
      'P02',
      'P03',
      'P05',
      'P06',
      'P07',
    ]);
    expect(Profile.resolveCommercialProposalProfile(base).stagePath).not.toEqual(
      expect.arrayContaining(['P04', 'P08', 'P09']),
    );
    for (const revision of revisions)
      expect(() => Profile.resolveCommercialProposalProfile({...base, revision})).toThrow(
        /P08_BLOCKED_PENDING_DURABLE_RECEIPT_V2/u,
      );
    expect(() =>
      Profile.resolveCommercialProposalProfile({
        readiness: ready,
        readinessCanonicalSha256: sha('0'),
      }),
    ).toThrow(/READINESS_CANONICAL_SHA256_MISMATCH/u);
  });

  it('replays identical bytes through fresh MaterialSkillAdapterV2 and kernel roots', async () => {
    const firstProjection = bundle();
    const secondProjection = bundle();
    const first = await runKernel(firstProjection);
    const second = await runKernel(secondProjection);

    expect(firstProjection.artifacts).toEqual(secondProjection.artifacts);
    expect(first.receipt).toMatchObject({state: 'EFFECT_SUCCEEDED', coverageGaps: []});
    expect(second.receipt.outputs).toEqual(first.receipt.outputs);
    expect(second.receipt.candidateSha256).toBe(first.receipt.candidateSha256);
    for (const artifact of firstProjection.artifacts) {
      const firstBytes = readFileSync(resolve(first.effect, artifact.relativePath));
      const secondBytes = readFileSync(resolve(second.effect, artifact.relativePath));
      expect(firstBytes).toEqual(Buffer.from(artifact.bytes));
      expect(secondBytes).toEqual(firstBytes);
    }
    expect(hashCanonical(first.receipt.outputs)).toBe(hashCanonical(second.receipt.outputs));
    expect(canonicalize(first.receipt.outputs)).toBe(canonicalize(second.receipt.outputs));
  });

  it('blocks authorization and WorkOrder input drift before adapter effects', async () => {
    const projection = bundle();
    await expect(
      runKernel(projection, {...projection.authorization, specSha256: sha('9')}),
    ).rejects.toMatchObject({code: 'AUTHORIZATION_DRIFT'});
    const changed = structuredClone(projection);
    changed.workOrder.inputs[0]!.sha256 = sha('9');
    await expect(runKernel(changed)).rejects.toMatchObject({code: 'AUTHORIZATION_DRIFT'});
  });
});
