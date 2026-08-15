import {realpathSync} from 'node:fs';
import {isAbsolute, relative} from 'node:path';

import {probeCaseLongformMedia, readCaseLongformMaterial} from './case-longform-media.ts';
import {
  CaseLongformAuthority as Authority,
  CaseLongformFreeze as Freeze,
  CaseLongformPlan as Plan,
  CaseLongformPreflightSchema,
  CaseLongformPreviewBuild as PreviewBuild,
  CaseLongformProvenance as Provenance,
  caseLongformSourceSetSha256,
  type CaseLongformPreflight,
} from './case-longform-preflight-schema.ts';

export {CaseLongformPreflightSchema, caseLongformSourceSetSha256};
export type {CaseLongformPreflight};
const equal = (left: unknown, right: unknown): boolean =>
  JSON.stringify(left) === JSON.stringify(right);
const overlaps = (left: string, right: string): boolean => {
  const rel = relative(left, right);
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
};

export const assertCaseLongformPreflight = (
  raw: unknown,
  options: {
    projectRoot: string;
    trustPolicy: {
      authorityRoot: string;
      previewVerifierRoot: string;
      trustedAuthorityActorIds: readonly string[];
      trustedPreviewVerifierActorIds: readonly string[];
    };
  },
): CaseLongformPreflight => {
  const contract = CaseLongformPreflightSchema.parse(raw);
  const roots = [
    options.projectRoot,
    options.trustPolicy.authorityRoot,
    options.trustPolicy.previewVerifierRoot,
  ].map((root) => realpathSync(root));
  if (
    roots.some((root, index) =>
      roots.some((other, inner) => index !== inner && overlaps(root, other)),
    )
  )
    throw new Error('VIDEO-OS-CASE-PREFLIGHT-TRUST-ROOT-OVERLAP');
  if (
    !options.trustPolicy.trustedAuthorityActorIds.includes(contract.actors.authority) ||
    !options.trustPolicy.trustedPreviewVerifierActorIds.includes(contract.actors.preview_verifier)
  )
    throw new Error('VIDEO-OS-CASE-PREFLIGHT-UNTRUSTED-ACTOR');
  if (new Set(Object.values(contract.actors)).size !== 3)
    throw new Error('VIDEO-OS-CASE-PREFLIGHT-ACTORS-NOT-INDEPENDENT');
  const refs = [
    contract.plan,
    contract.preview.media,
    contract.preview.build_receipt,
    ...contract.sources.flatMap(
      ({media, provenance_receipt, authority_receipt, freeze_receipt}) => [
        media,
        provenance_receipt,
        authority_receipt,
        freeze_receipt,
      ],
    ),
  ];
  if (new Set(refs.map(({ref}) => ref)).size !== refs.length)
    throw new Error('VIDEO-OS-CASE-PREFLIGHT-REF-ALIAS');
  if (
    !contract.preview.media.ref.endsWith('.mp4') ||
    contract.sources.some(({media}) => !media.ref.endsWith('.mp4'))
  )
    throw new Error('VIDEO-OS-CASE-PREFLIGHT-MEDIA-TYPE');
  const sourceSetSha = caseLongformSourceSetSha256(contract.sources);
  const plan = Plan.parse(
    JSON.parse(readCaseLongformMaterial(options.projectRoot, contract.plan).bytes.toString('utf8')),
  );
  if (
    plan.job_id !== contract.job_id ||
    plan.source_set_sha256 !== sourceSetSha ||
    plan.actor_id !== contract.actors.producer
  )
    throw new Error('VIDEO-OS-CASE-PREFLIGHT-PLAN-MISMATCH');
  for (const item of contract.sources) {
    const measurements = probeCaseLongformMedia(
      readCaseLongformMaterial(options.projectRoot, item.media).bytes,
    );
    const provenanceRef = readCaseLongformMaterial(
      options.trustPolicy.authorityRoot,
      item.provenance_receipt,
    );
    const authorityRef = readCaseLongformMaterial(
      options.trustPolicy.authorityRoot,
      item.authority_receipt,
    );
    const freezeRef = readCaseLongformMaterial(options.projectRoot, item.freeze_receipt);
    const provenance = Provenance.parse(JSON.parse(provenanceRef.bytes.toString('utf8')));
    const authority = Authority.parse(JSON.parse(authorityRef.bytes.toString('utf8')));
    const freeze = Freeze.parse(JSON.parse(freezeRef.bytes.toString('utf8')));
    if (
      provenance.role !== item.role ||
      provenance.source_id !== item.source_id ||
      provenance.source_sha256 !== item.media.sha256 ||
      provenance.actor_id !== contract.actors.authority ||
      authority.role !== item.role ||
      authority.source_id !== item.source_id ||
      authority.source_sha256 !== item.media.sha256 ||
      authority.provenance_sha256 !== item.provenance_receipt.sha256 ||
      authority.actor_id !== contract.actors.authority
    )
      throw new Error('VIDEO-OS-CASE-PREFLIGHT-SOURCE-AUTHORITY-MISMATCH');
    if (
      freeze.job_id !== contract.job_id ||
      freeze.plan_sha256 !== contract.plan.sha256 ||
      freeze.source_set_sha256 !== sourceSetSha ||
      freeze.role !== item.role ||
      freeze.source_id !== item.source_id ||
      freeze.source_sha256 !== item.media.sha256 ||
      freeze.provenance_sha256 !== item.provenance_receipt.sha256 ||
      freeze.authority_sha256 !== item.authority_receipt.sha256 ||
      freeze.actor_id !== contract.actors.producer ||
      !equal(freeze.measurements, measurements)
    )
      throw new Error('VIDEO-OS-CASE-PREFLIGHT-FREEZE-MISMATCH');
  }
  const previewMeasurements = probeCaseLongformMedia(
    readCaseLongformMaterial(options.projectRoot, contract.preview.media).bytes,
  );
  const buildRef = readCaseLongformMaterial(
    options.trustPolicy.previewVerifierRoot,
    contract.preview.build_receipt,
  );
  const build = PreviewBuild.parse(JSON.parse(buildRef.bytes.toString('utf8')));
  if (
    build.job_id !== contract.job_id ||
    build.plan_sha256 !== contract.plan.sha256 ||
    build.source_set_sha256 !== sourceSetSha ||
    build.preview_sha256 !== contract.preview.media.sha256 ||
    build.verifier_actor_id !== contract.actors.preview_verifier ||
    !equal(build.measurements, previewMeasurements)
  )
    throw new Error('VIDEO-OS-CASE-PREFLIGHT-PREVIEW-MISMATCH');
  return contract;
};
