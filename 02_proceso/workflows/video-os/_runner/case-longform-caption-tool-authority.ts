import type {z} from 'zod';

import {readCaseLongformMaterial} from './case-longform-media.ts';
import {
  CaseLongformCaptionCompositorAuthority,
  CaseLongformCaptionToolCommand,
  CaseLongformCaptionToolConfig,
  CaseLongformCaptionVerifierAuthority,
  type CaseLongformCaptionContractAuthority,
} from './case-longform-caption-contract-authority.ts';

type Ref = {ref: string; sha256: string; bytes: number};
export type CaseLongformCaptionTrustPolicy = {
  layoutAuthorityRoot: string;
  compositorAuthorityRoot: string;
  captionVerifierRoot: string;
  trustedLayoutActorIds: readonly string[];
  trustedCompositorActorIds: readonly string[];
  trustedCaptionVerifierActorIds: readonly string[];
  trustedCompositorExecutableSha256: string;
  trustedCaptionVerifierExecutableSha256: string;
};
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
const material = <T>(root: string, ref: Ref, schema: z.ZodType<T>): T =>
  schema.parse(JSON.parse(readCaseLongformMaterial(root, ref).bytes.toString('utf8')));
const bound = (
  contract: CaseLongformCaptionContractAuthority,
  value: {
    job_id: string;
    plan_sha256: string;
    source_set_sha256: string;
    graph_sha256: string;
    temporal_map_sha256: string;
    caption_track_sha256: string;
    caption_cleanup_sha256: string;
  },
): boolean => {
  const a = contract.artifacts;
  return (
    value.job_id === contract.job_id &&
    value.plan_sha256 === a.plan.sha256 &&
    value.source_set_sha256 === contract.source_set_sha256 &&
    value.graph_sha256 === a.operation_graph.sha256 &&
    value.temporal_map_sha256 === a.temporal_map.sha256 &&
    value.caption_track_sha256 === a.caption_track.sha256 &&
    value.caption_cleanup_sha256 === a.caption_cleanup.sha256
  );
};

export const assertCaseLongformCaptionToolAuthority = (input: {
  kind: 'compositor' | 'verifier';
  root: string;
  ref: Ref;
  expectedActor: string;
  trustedActors: readonly string[];
  trustedExecutable: string;
  contract: CaseLongformCaptionContractAuthority;
}): void => {
  const {kind, root, ref, expectedActor, trustedActors, trustedExecutable, contract} = input;
  const schema =
    kind === 'compositor'
      ? CaseLongformCaptionCompositorAuthority
      : CaseLongformCaptionVerifierAuthority;
  const authority = material(root, ref, schema);
  const a = contract.artifacts;
  if (
    !bound(contract, authority) ||
    authority.layout_authority_sha256 !== a.caption_layout_authority.sha256 ||
    authority.actor_id !== expectedActor ||
    !trustedActors.includes(authority.actor_id)
  )
    throw new Error('VIDEO-OS-CASE-CAPTION-TOOL-AUTHORITY-DRIFT');
  if (new Set([authority.executable.ref, authority.command.ref, authority.config.ref]).size !== 3)
    throw new Error('VIDEO-OS-CASE-CAPTION-TOOL-REF-ALIAS');
  readCaseLongformMaterial(root, authority.executable);
  if (authority.executable.sha256 !== trustedExecutable)
    throw new Error('VIDEO-OS-CASE-CAPTION-TOOL-UNTRUSTED');
  const config = material(root, authority.config, CaseLongformCaptionToolConfig);
  const command = material(root, authority.command, CaseLongformCaptionToolCommand);
  const expectedKind = kind === 'compositor' ? 'caption_compositor' : 'caption_verifier';
  const argv = [
    `caption-${kind === 'compositor' ? 'composition' : 'verification'}-plan`,
    '--config-sha256',
    authority.config.sha256,
    '--layout-authority-sha256',
    a.caption_layout_authority.sha256,
    '--caption-track-sha256',
    a.caption_track.sha256,
  ];
  if (
    !bound(contract, config) ||
    config.layout_authority_sha256 !== a.caption_layout_authority.sha256 ||
    config.kind !== `${expectedKind}_config` ||
    command.kind !== `${expectedKind}_command` ||
    command.executable_sha256 !== authority.executable.sha256 ||
    command.config_sha256 !== authority.config.sha256 ||
    !same(command.argv, argv)
  )
    throw new Error('VIDEO-OS-CASE-CAPTION-TOOL-CONTRACT-DRIFT');
};
