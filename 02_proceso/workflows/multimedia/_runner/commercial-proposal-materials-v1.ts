import {createHash} from 'node:crypto';

import {canonicalize} from '../../../core/evidence/canonical-json.ts';
import {hashCanonical, sha256Text} from '../../../core/evidence/hash.ts';
import * as Authority from '../_schema/commercial-proposal-authority-v1.schema.ts';
import * as CP from '../_schema/commercial-proposal-v1.schema.ts';

export const COMMERCIAL_PROPOSAL_WORKFLOW_ID_V1 = 'workflow.commercial-proposal-v1' as const;
export const COMMERCIAL_PROPOSAL_STEP_ID_V1 = 'step.commercial-proposal.render-v1' as const;
export const COMMERCIAL_PROPOSAL_SKILL_ID_V1 = 'content-os-commercial-proposal-v1' as const;
export const COMMERCIAL_PROPOSAL_PRODUCER_ACTOR_ID_V1 =
  'actor.commercial-proposal.producer-v1' as const;
export const COMMERCIAL_PROPOSAL_STOP_RULE_V1 =
  'Stop at RENDERED_DRAFT after four create-only local outputs; no deck, publication or delivery.' as const;
export const COMMERCIAL_PROPOSAL_ACCEPTANCE_V1 = [
  'Create exactly MD, HTML, canonical JSON and RFC4180 CSV as a local RENDERED_DRAFT.',
] as const;
export const COMMERCIAL_PROPOSAL_SOURCE_AUTHORITY_REF_V1 =
  'manifests/commercial-proposal-source-authority.json' as const;
export const COMMERCIAL_PROPOSAL_AUTHORITY_REF_V1 =
  'manifests/commercial-proposal-authority.json' as const;

export interface CommercialProposalInputMaterialV1 {
  readonly ref: string;
  readonly bytes: Uint8Array;
}
export interface CommercialProposalMaterialBindingV1 {
  readonly sourceAuthorityManifest: unknown;
  readonly commercialAuthorityManifest: unknown;
  readonly materials: readonly CommercialProposalInputMaterialV1[];
}

const sha256 = (bytes: Uint8Array): string => createHash('sha256').update(bytes).digest('hex');
const same = (left: unknown, right: unknown): boolean =>
  hashCanonical(left) === hashCanonical(right);
const authorityBindings = (spec: CP.CommercialProposalSpecV1) => [
  ...(spec.roi ? [spec.roi.authority] : []),
  ...spec.pricing.map(({authority}) => authority),
  ...spec.commitments.map(({authority}) => authority),
];

export const commercialProposalWorkOrderInputsV1 = (spec: CP.CommercialProposalSpecV1) => [
  {ref: CP.COMMERCIAL_PROPOSAL_TEMPLATE_REF_V1, sha256: CP.COMMERCIAL_PROPOSAL_TEMPLATE_SHA256_V1},
  {ref: 'receipts/commercial-proposal-readiness.json', sha256: spec.readinessSha256},
  {ref: 'manifests/commercial-proposal-sources.json', sha256: spec.sourceManifestSha256},
  {ref: COMMERCIAL_PROPOSAL_SOURCE_AUTHORITY_REF_V1, sha256: spec.sourceAuthorityManifestSha256},
  {ref: COMMERCIAL_PROPOSAL_AUTHORITY_REF_V1, sha256: spec.commercialAuthorityManifestSha256},
  {ref: 'inputs/client-context.txt', sha256: sha256Text(spec.clientContext)},
  {ref: 'inputs/offer-scope.txt', sha256: sha256Text(spec.offerScope)},
  {ref: 'inputs/commercial-status.txt', sha256: sha256Text(spec.commercialStatus)},
  ...spec.sources.map((source) => ({ref: source.ref, sha256: source.sha256 ?? ''})),
];

const canonicalMaterial = (value: unknown): Uint8Array =>
  new TextEncoder().encode(canonicalize(value));
const expectedCanonicalMaterials = (
  spec: CP.CommercialProposalSpecV1,
  readiness: CP.CommercialProposalReadinessV1,
  sourceAuthorityManifest: Authority.CommercialProposalSourceAuthorityManifestV1,
  commercialAuthorityManifest: Authority.CommercialProposalAuthorityManifestV1,
) =>
  new Map<string, Uint8Array>([
    ['receipts/commercial-proposal-readiness.json', canonicalMaterial(readiness)],
    ['manifests/commercial-proposal-sources.json', canonicalMaterial(spec.sources)],
    [COMMERCIAL_PROPOSAL_SOURCE_AUTHORITY_REF_V1, canonicalMaterial(sourceAuthorityManifest)],
    [COMMERCIAL_PROPOSAL_AUTHORITY_REF_V1, canonicalMaterial(commercialAuthorityManifest)],
    ['inputs/client-context.txt', new TextEncoder().encode(spec.clientContext)],
    ['inputs/offer-scope.txt', new TextEncoder().encode(spec.offerScope)],
    ['inputs/commercial-status.txt', new TextEncoder().encode(spec.commercialStatus)],
  ]);

export const validateCommercialProposalMaterialBindingV1 = (
  spec: CP.CommercialProposalSpecV1,
  readiness: CP.CommercialProposalReadinessV1,
  input: CommercialProposalMaterialBindingV1,
): boolean => {
  try {
    const sourceAuthorityManifest =
      Authority.CommercialProposalSourceAuthorityManifestV1Schema.parse(
        input.sourceAuthorityManifest,
      );
    const commercialAuthorityManifest = Authority.CommercialProposalAuthorityManifestV1Schema.parse(
      input.commercialAuthorityManifest,
    );
    if (
      hashCanonical(readiness) !== spec.readinessSha256 ||
      hashCanonical(spec.sources) !== spec.sourceManifestSha256 ||
      hashCanonical(sourceAuthorityManifest) !== spec.sourceAuthorityManifestSha256 ||
      hashCanonical(commercialAuthorityManifest) !== spec.commercialAuthorityManifestSha256 ||
      !same(
        sourceAuthorityManifest.entries.map(({source}) => source),
        spec.sources,
      )
    )
      return false;
    const expectedAuthorities = authorityBindings(spec);
    const expectedAuthorityHashes = expectedAuthorities
      .map(({receiptSha256}) => receiptSha256)
      .sort();
    const manifestAuthorityHashes = commercialAuthorityManifest.entries
      .map((receipt) => hashCanonical(receipt))
      .sort();
    if (!same(expectedAuthorityHashes, manifestAuthorityHashes)) return false;
    for (const binding of expectedAuthorities) {
      const receipt = commercialAuthorityManifest.entries.find(
        ({receiptId}) => receiptId === binding.receiptId,
      );
      if (
        !receipt ||
        receipt.kind !== binding.kind ||
        receipt.subjectSha256 !== binding.subjectSha256 ||
        receipt.authorizedScope !== binding.authorizedScope ||
        hashCanonical(receipt) !== binding.receiptSha256
      )
        return false;
    }
    const expectedInputs = commercialProposalWorkOrderInputsV1(spec);
    const materials = new Map(input.materials.map((material) => [material.ref, material]));
    if (materials.size !== input.materials.length || materials.size !== expectedInputs.length)
      return false;
    const canonical = expectedCanonicalMaterials(
      spec,
      readiness,
      sourceAuthorityManifest,
      commercialAuthorityManifest,
    );
    for (const expected of expectedInputs) {
      const material = materials.get(expected.ref);
      if (!material || sha256(material.bytes) !== expected.sha256) return false;
      const expectedBytes = canonical.get(expected.ref);
      if (expectedBytes && !Buffer.from(material.bytes).equals(Buffer.from(expectedBytes)))
        return false;
    }
    return true;
  } catch {
    return false;
  }
};
