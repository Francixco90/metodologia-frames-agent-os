import {createHash} from 'node:crypto';
import {
  FramesWorkOrderV1Schema,
  type FramesWorkOrderV1,
} from '../../../core/contracts/experience-execution-v1.ts';
import {hashExperienceValue} from '../../../core/contracts/experience-normalization.ts';
import {hashCanonical, sha256Text} from '../../../core/evidence/hash.ts';
import {FRAMES_DELIVERABLE_SECTIONS} from '../_schema/deliverable-v1.schema.ts';
import * as CP from '../_schema/commercial-proposal-v1.schema.ts';
import {stableStringify} from './brief-model.ts';
import {createFramesDeliverableMarkdown} from './deliverable-model.ts';
import {verifyDeliverableParity} from './deliverable-parity.ts';
import {renderFramesDeliverableHtml} from './deliverable-renderer.ts';
import * as Profile from './commercial-proposal-profile-v1.ts';
import {
  COMMERCIAL_PROPOSAL_ACCEPTANCE_V1,
  COMMERCIAL_PROPOSAL_PRODUCER_ACTOR_ID_V1,
  COMMERCIAL_PROPOSAL_SKILL_ID_V1,
  COMMERCIAL_PROPOSAL_STEP_ID_V1,
  COMMERCIAL_PROPOSAL_STOP_RULE_V1,
  COMMERCIAL_PROPOSAL_WORKFLOW_ID_V1,
  commercialProposalWorkOrderInputsV1,
  validateCommercialProposalMaterialBindingV1,
  type CommercialProposalMaterialBindingV1,
} from './commercial-proposal-materials-v1.ts';
import {encodeRfc4180} from './rfc4180-v1.ts';
export {commercialProposalWorkOrderInputsV1} from './commercial-proposal-materials-v1.ts';
const clean = (value: string): string => value.replaceAll('\r', ' ').replaceAll('\n', ' ').trim();
const bullets = (items: readonly string[]): string =>
  items.map((item) => `- ${clean(item)}`).join('\n');
const money = (amount: number, currency: string): string => `${currency} ${String(amount)}`;
// prettier-ignore
export type CommercialProposalArtifactIntentV1 = {format: 'md' | 'html' | 'json' | 'csv'; relativePath: string; mediaType: 'text/markdown' | 'text/html' | 'application/json' | 'text/csv'; bytes: Uint8Array; sha256: string};
// prettier-ignore
export type CommercialProposalProjectionBundleV1 = {spec: CP.CommercialProposalSpecV1; readiness: CP.CommercialProposalReadinessV1; workOrder: FramesWorkOrderV1; authorization: CP.CommercialProposalAuthorizationV1; materialBinding: CommercialProposalMaterialBindingV1; artifacts: CommercialProposalArtifactIntentV1[]; manifest: CP.CommercialProposalArtifactManifestV1};
// prettier-ignore
const EXPECTED = [['md', 'commercial-proposal.md', 'text/markdown'], ['html', 'commercial-proposal.html', 'text/html'], ['json', 'commercial-proposal.json', 'application/json'], ['csv', 'commercial-proposal.csv', 'text/csv']] as const;
// prettier-ignore
const safeCheck = (check: () => boolean): boolean => { try { return check(); } catch { return false; } };
const same = (left: unknown, right: unknown): boolean =>
  stableStringify(left) === stableStringify(right);
// prettier-ignore
const commercialInputHashes = (spec: CP.CommercialProposalSpecV1) => ({clientContext: sha256Text(spec.clientContext), offerScope: sha256Text(spec.offerScope), commercialStatus: sha256Text(spec.commercialStatus)});
// prettier-ignore
export const commercialProposalRequestSha256V1 = (spec: CP.CommercialProposalSpecV1): string => hashCanonical({contentClass: 'commercial-proposal', proposalId: spec.proposalId, readinessSha256: spec.readinessSha256, sourceManifestSha256: spec.sourceManifestSha256, objective: spec.objective});
// prettier-ignore
export const createCommercialProposalAuthorizationV1 = (spec: CP.CommercialProposalSpecV1, workOrder: FramesWorkOrderV1): CP.CommercialProposalAuthorizationV1 => CP.CommercialProposalAuthorizationV1Schema.parse({scope: 'PROJECT_LOCAL', contentClass: 'commercial-proposal', producerActorInstanceId: workOrder.actorId, workOrderSha256: hashCanonical(workOrder), specSha256: spec.canonicalSha256, readinessSha256: spec.readinessSha256, sourceManifestSha256: spec.sourceManifestSha256, sourceAuthorityManifestSha256: spec.sourceAuthorityManifestSha256, commercialAuthorityManifestSha256: spec.commercialAuthorityManifestSha256, templateSha256: spec.template.sha256, inputsSha256: hashCanonical(workOrder.inputs)});
const commercialStory = (spec: CP.CommercialProposalSpecV1): string => {
  // prettier-ignore
  const story = {'client situation': spec.clientContext, outcomes: spec.objective, approach: 'P01 → P02 → P03 → P05 → P06 → P07.', scope: `${spec.offerScope}\n\n**Incluido**\n${bullets(spec.scope.included)}\n\n**Excluido**\n${bullets(spec.scope.excluded)}`, evidence: spec.claims.map((claim) => `- **${clean(claim.claimId)}**: ${clean(claim.statement)}`).join('\n'), risks: [...spec.assumptions, ...spec.claims.flatMap(({limitations}) => limitations)].map(clean).join('; '), 'commercial boundary': `${spec.commercialStatus} Estado máximo: RENDERED_DRAFT.`, 'next step': 'G14 · revisión humana; sin publicación ni deck.'};
  return CP.COMMERCIAL_PROPOSAL_SECTION_SEQUENCE_V1.map(
    (section) => `### ${section}\n\n${story[section]}`,
  ).join('\n\n');
};
const proposalSections = (spec: CP.CommercialProposalSpecV1): Record<string, string> => ({
  'Resultado y decisión': `Objetivo: ${clean(spec.objective)} Estado máximo: RENDERED_DRAFT.`,
  'Audiencia y uso': `Audiencia: ${clean(spec.audience)}`,
  // prettier-ignore
  'Entradas, evidencia y supuestos': [`Template: ${spec.template.ref} · ${spec.template.sha256}.`, `Fuentes materiales: ${spec.sources.length}.`, `PII: ${spec.privacy.piiStatus}.`, '**Incluido**', bullets(spec.scope.included), '**Excluido**', bullets(spec.scope.excluded), '**Supuestos visibles**', bullets(spec.assumptions)].join('\n\n'),
  'Contenido estructurado': commercialStory(spec),
  // prettier-ignore
  'Componentes, activos y prompts': [spec.roi ? `ROI: baseline ${spec.roi.baseline.value} ${clean(spec.roi.baseline.unit)}; fórmula ${clean(spec.roi.formula)}; horizonte ${spec.roi.horizon.value} ${spec.roi.horizon.unit}; unidad ${clean(spec.roi.unit)}.` : 'ROI: no solicitado.', ...spec.pricing.map((price) => `Precio: ${clean(price.item)} · ${money(price.amount, price.currency)}.`), ...spec.commitments.map((item) => `Compromiso: ${clean(item.statement)} · ${clean(item.owner)}.`)].join('\n'),
  'Secuencia, hitos y dependencias': 'P01 → P02 → P03 → P05 → P06 → P07.',
  'Skills, ownership y handoffs': 'Producer, Verifier, Guardian y Recorder permanecen separados.',
  'Riesgos, límites y casos borde': 'Sin evidencia, derechos o autoridad hash-bound, bloquea.',
  'Criterios de aceptación y QA': 'Paridad MD/HTML, JSON canónico, CSV RFC4180 y manifest exacto.',
  'Estado, lineage y siguiente gate': 'RENDERED_DRAFT ≠ HUMAN_APPROVED. Siguiente gate: G14.',
});
// prettier-ignore
const claimStatus = (claim: CP.CommercialProposalSpecV1['claims'][number], sources: Map<string, CP.CommercialProposalSpecV1['sources'][number]>): 'observed' | 'inferred' | 'assumed' => claim.classification === 'ASSUMED' ? 'assumed' : claim.classification === 'OBSERVED' && claim.evidence.every(({sourceId}) => sources.get(sourceId)?.authority === 'verified') ? 'observed' : 'inferred';
const createMarkdown = (spec: CP.CommercialProposalSpecV1): string => {
  const copy = proposalSections(spec);
  const sources = new Map(spec.sources.map((source) => [source.source_id, source]));
  // prettier-ignore
  const metadata: Parameters<typeof createFramesDeliverableMarkdown>[0] = {schema_version: 'frames-deliverable-v1', instance_id: `DELIV-${spec.proposalId.toUpperCase().replace(/[^A-Z0-9-]/gu, '-')}`, deliverable_id: 'commercial-proposal-v1', display_name: 'Propuesta comercial', workflow_id: 'P07', deliverable_class: 'strategy', touchpoint: 'final', identity: {brand: 'MetodologIA', owner: 'Commercial Proposal Producer'}, audience: spec.audience, purpose: spec.objective, sources: spec.sources, formats: ['md', 'html', 'json', 'csv'], piece_families: ['other'], companion_for: null, skills: ['content-os-core'], fields: spec.claims.map((claim, index) => ({field_id: `claim-${index + 1}`, label: claim.claimId, value_type: 'text', status: claimStatus(claim, sources), value: claim.statement, source_refs: claim.evidence.map(({sourceId}) => sourceId)})), state: 'RENDERED_DRAFT', next_gate: 'G14'};
  return createFramesDeliverableMarkdown(
    metadata,
    FRAMES_DELIVERABLE_SECTIONS.map((id) => ({id, markdown: copy[id]!})),
  );
};
// prettier-ignore
const createCsv = (spec: CP.CommercialProposalSpecV1): string => encodeRfc4180([['claim_id', 'classification', 'statement', 'evidence_source_ids', 'limitations'], ...spec.claims.map((claim) => [claim.claimId, claim.classification, claim.statement, claim.evidence.map(({sourceId}) => sourceId).join('|'), claim.limitations.join('|')])]);
// prettier-ignore
const intent = (format: CommercialProposalArtifactIntentV1['format'], mediaType: CommercialProposalArtifactIntentV1['mediaType'], text: string): CommercialProposalArtifactIntentV1 => ({format, relativePath: `commercial-proposal.${format}`, mediaType, bytes: new TextEncoder().encode(text), sha256: sha256Text(text)});
const executionBound = (
  spec: CP.CommercialProposalSpecV1,
  workOrder: FramesWorkOrderV1,
  authorization: CP.CommercialProposalAuthorizationV1,
): boolean => {
  const expectedInputs = commercialProposalWorkOrderInputsV1(spec);
  const refs = expectedInputs.map(({ref}) => ref);
  const outputs = EXPECTED.map(([, ref]) => ref);
  // prettier-ignore
  return hashExperienceValue(workOrder) === workOrder.canonicalSha256 && hashCanonical(workOrder) === spec.workOrderSha256 && workOrder.workOrderId === `WO.R6.${spec.proposalId}` && workOrder.requestHash === commercialProposalRequestSha256V1(spec) && workOrder.routeId === 'R6' && workOrder.workflowId === COMMERCIAL_PROPOSAL_WORKFLOW_ID_V1 && workOrder.stepId === COMMERCIAL_PROPOSAL_STEP_ID_V1 && workOrder.skillId === COMMERCIAL_PROPOSAL_SKILL_ID_V1 && workOrder.actorId === COMMERCIAL_PROPOSAL_PRODUCER_ACTOR_ID_V1 && workOrder.actorId === authorization.producerActorInstanceId && same(workOrder.inputs, expectedInputs) && same(workOrder.readSet, refs) && same(workOrder.writeSet, outputs) && same(workOrder.expectedOutputs, outputs) && same(workOrder.tools, []) && workOrder.effectClass === 'LOCAL_REVERSIBLE' && same(workOrder.budget, {targetFiles: 4, maxFiles: 4, targetTokens: 1, maxTokens: 100}) && same(workOrder.acceptanceCriteria, COMMERCIAL_PROPOSAL_ACCEPTANCE_V1) && workOrder.stopRule === COMMERCIAL_PROPOSAL_STOP_RULE_V1 && same(authorization, createCommercialProposalAuthorizationV1(spec, workOrder));
};
export const createCommercialProposalProjections = (
  specInput: unknown,
  readinessInput: unknown,
  executionBindingInput: {workOrder: unknown; authorization: unknown},
  materialBindingInput: CommercialProposalMaterialBindingV1,
): CommercialProposalProjectionBundleV1 => {
  const spec = CP.CommercialProposalSpecV1Schema.parse(specInput);
  const readiness = CP.CommercialProposalReadinessV1Schema.parse(readinessInput);
  const workOrder = FramesWorkOrderV1Schema.parse(executionBindingInput.workOrder);
  const authorization = CP.CommercialProposalAuthorizationV1Schema.parse(
    executionBindingInput.authorization,
  );
  // prettier-ignore
  const bound = readiness.status === 'READY' && spec.proposalId === readiness.proposalId && spec.readinessSha256 === hashCanonical(readiness) && spec.sourceManifestSha256 === readiness.sourceManifestSha256;
  if (!bound || !executionBound(spec, workOrder, authorization))
    throw new Error('COMMERCIAL_PROPOSAL_EXECUTION_BINDING_MISMATCH');
  if (!validateCommercialProposalMaterialBindingV1(spec, readiness, materialBindingInput))
    throw new Error('COMMERCIAL_PROPOSAL_MATERIAL_BINDING_MISMATCH');
  const markdown = createMarkdown(spec);
  // prettier-ignore
  const artifacts = [intent('md', 'text/markdown', markdown), intent('html', 'text/html', renderFramesDeliverableHtml(markdown)), intent('json', 'application/json', `${stableStringify(spec)}\n`), intent('csv', 'text/csv', createCsv(spec))];
  const manifest = CP.CommercialProposalArtifactManifestV1Schema.parse(
    // prettier-ignore
    Profile.sealCommercialProposalContract({schemaVersion: 'commercial-proposal-artifact-manifest-v1' as const, manifestId: `${spec.proposalId}.manifest`, proposalId: spec.proposalId, specSha256: spec.canonicalSha256, readinessSha256: spec.readinessSha256, workOrderSha256: spec.workOrderSha256, authorizationSha256: hashCanonical(authorization), sourceAuthorityManifestSha256: spec.sourceAuthorityManifestSha256, commercialAuthorityManifestSha256: spec.commercialAuthorityManifestSha256, template: spec.template, sectionSequence: spec.sectionSequence, commercialInputsSha256: commercialInputHashes(spec), artifacts: artifacts.map(({bytes, ...artifact}) => ({...artifact, bytes: bytes.byteLength})), deck: {...readiness.deck, materialized: false as const}, maximumAutomaticState: 'RENDERED_DRAFT' as const}),
  );
  return {
    spec,
    readiness,
    workOrder,
    authorization,
    materialBinding: materialBindingInput,
    artifacts,
    manifest,
  };
};
export const verifyCommercialProposalProjections = (
  bundle: CommercialProposalProjectionBundleV1,
  receiptId: string,
): CP.CommercialProposalVerificationV1 => {
  const byFormat = new Map(bundle.artifacts.map((artifact) => [artifact.format, artifact]));
  const decode = (format: CommercialProposalArtifactIntentV1['format']): string =>
    new TextDecoder().decode(byFormat.get(format)?.bytes);
  // prettier-ignore
  const physical = bundle.artifacts.map(({bytes, ...artifact}) => ({...artifact, bytes: bytes.byteLength, sha256: createHash('sha256').update(bytes).digest('hex')}));
  const checks = {
    // prettier-ignore
    contracts: CP.CommercialProposalSpecV1Schema.safeParse(bundle.spec).success && CP.CommercialProposalReadinessV1Schema.safeParse(bundle.readiness).success && CP.CommercialProposalArtifactManifestV1Schema.safeParse(bundle.manifest).success && FramesWorkOrderV1Schema.safeParse(bundle.workOrder).success && CP.CommercialProposalAuthorizationV1Schema.safeParse(bundle.authorization).success,
    // prettier-ignore
    contractBinding: bundle.manifest.proposalId === bundle.spec.proposalId && bundle.manifest.specSha256 === bundle.spec.canonicalSha256 && bundle.manifest.readinessSha256 === bundle.spec.readinessSha256 && bundle.manifest.workOrderSha256 === bundle.spec.workOrderSha256 && bundle.manifest.authorizationSha256 === hashCanonical(bundle.authorization) && bundle.manifest.sourceAuthorityManifestSha256 === bundle.spec.sourceAuthorityManifestSha256 && bundle.manifest.commercialAuthorityManifestSha256 === bundle.spec.commercialAuthorityManifestSha256,
    executionBinding: safeCheck(() =>
      executionBound(bundle.spec, bundle.workOrder, bundle.authorization),
    ),
    materialBinding: safeCheck(() =>
      validateCommercialProposalMaterialBindingV1(
        bundle.spec,
        bundle.readiness,
        bundle.materialBinding,
      ),
    ),
    // prettier-ignore
    artifactBinding: bundle.artifacts.length === EXPECTED.length && same(physical, bundle.manifest.artifacts) && bundle.artifacts.every((artifact, index) => artifact.sha256 === physical[index]?.sha256 && artifact.format === EXPECTED[index]?.[0] && artifact.relativePath === EXPECTED[index]?.[1] && artifact.mediaType === EXPECTED[index]?.[2]),
    // prettier-ignore
    templateProjection: safeCheck(() => decode('md') === createMarkdown(bundle.spec) && decode('html') === renderFramesDeliverableHtml(createMarkdown(bundle.spec)) && same(bundle.manifest.template, bundle.spec.template) && same(bundle.manifest.sectionSequence, bundle.spec.sectionSequence) && same(bundle.manifest.commercialInputsSha256, commercialInputHashes(bundle.spec))),
    markdownHtmlParity: safeCheck(
      () => verifyDeliverableParity(decode('md'), decode('html')).status === 'PASS',
    ),
    canonicalJson: safeCheck(() => decode('json') === `${stableStringify(bundle.spec)}\n`),
    rfc4180: safeCheck(() => decode('csv') === createCsv(bundle.spec)),
    deckBoundary: bundle.manifest.deck.materialized === false && !byFormat.has('deck' as 'md'),
  };
  // prettier-ignore
  const issues = Object.entries(checks).filter(([, passed]) => !passed).map(([name]) => name);
  return Profile.sealCommercialProposalVerification({
    schemaVersion: 'commercial-proposal-verification-v1',
    receiptId,
    proposalId: bundle.spec.proposalId,
    specSha256: bundle.spec.canonicalSha256,
    manifestSha256: bundle.manifest.canonicalSha256,
    evidenceSha256: hashCanonical({
      checks,
      artifacts: physical,
      readiness: bundle.readiness,
      workOrder: bundle.workOrder,
      authorization: bundle.authorization,
      sourceAuthorityManifest: bundle.materialBinding.sourceAuthorityManifest,
      commercialAuthorityManifest: bundle.materialBinding.commercialAuthorityManifest,
      materials: bundle.materialBinding.materials.map(({ref, bytes}) => ({
        ref,
        bytes: bytes.byteLength,
        sha256: createHash('sha256').update(bytes).digest('hex'),
      })),
    }),
    verdict: issues.length === 0 ? 'PASS' : 'REVISE',
    checks: Object.fromEntries(
      Object.entries(checks).map(([name, passed]) => [name, passed ? 'PASS' : 'FAIL']),
    ) as CP.CommercialProposalVerificationV1['checks'],
    issues,
    environment: 'LOCAL_SIMULATION',
  });
};
