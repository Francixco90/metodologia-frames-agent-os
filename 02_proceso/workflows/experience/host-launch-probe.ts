import {z} from 'zod';

import {
  PortableIdSchema,
  RelativePathSchema,
  Sha256Schema,
} from '../../core/contracts/primitives.ts';
import {readSafeReleaseFile, relativeReleaseFile} from './safe-release-file.ts';

const HostSchema = z.enum(['CLAUDE', 'CODEX', 'CHATGPT', 'TEXT_FALLBACK']);
const PROBE_ROOTS = [
  '04_estado/receipts/experience/launch-probes/',
  '05_verificacion/quality/experience/launch-probes/',
];

export const ExperienceHostLaunchProbeV1Schema = z.strictObject({
  schemaVersion: z.literal('experience-host-launch-probe-v1'),
  probeId: PortableIdSchema,
  host: HostSchema,
  status: z.enum(['PASS', 'FAIL', 'UNKNOWN']),
  releaseId: PortableIdSchema,
  candidateCommit: z.string().regex(/^[a-f0-9]{40}$/u),
  candidateSha256: Sha256Schema,
  adapterRef: RelativePathSchema,
  localOnly: z.literal(true),
  externalEffects: z.literal(false),
});

export type HostLaunchProbeEvidence = {ref: string; sha256: string};
export type HostName = z.infer<typeof HostSchema>;

export const verifyHostLaunchProbes = (
  root: string,
  evidence: readonly HostLaunchProbeEvidence[],
  binding: {
    releaseId: string;
    candidateCommit: string;
    candidateSha256: string;
    releasedRefs: readonly string[];
  },
) => {
  const hosts = new Map<HostName, 'PASS' | 'FAIL' | 'UNKNOWN'>();
  const refs: HostLaunchProbeEvidence[] = [];
  for (const item of evidence) {
    const ref = relativeReleaseFile(root, item.ref);
    if (!PROBE_ROOTS.some((prefix) => ref.startsWith(prefix))) {
      throw new Error(`EXP-HOST-PROBE: disallowed evidence path ${ref}`);
    }
    const observed = readSafeReleaseFile(root, ref);
    if (observed.sha256 !== item.sha256) throw new Error(`EXP-HOST-PROBE: stale hash ${ref}`);
    const probe = ExperienceHostLaunchProbeV1Schema.parse(JSON.parse(observed.content));
    if (
      probe.releaseId !== binding.releaseId ||
      probe.candidateCommit !== binding.candidateCommit ||
      probe.candidateSha256 !== binding.candidateSha256
    ) {
      throw new Error(`EXP-HOST-PROBE: binding mismatch ${ref}`);
    }
    if (!binding.releasedRefs.includes(probe.adapterRef)) {
      throw new Error(`EXP-HOST-PROBE: adapter outside release ${probe.adapterRef}`);
    }
    if (hosts.has(probe.host)) throw new Error(`EXP-HOST-PROBE: duplicate host ${probe.host}`);
    hosts.set(probe.host, probe.status);
    refs.push({ref, sha256: observed.sha256});
  }
  const compatibleHosts = [...hosts]
    .filter(([, status]) => status === 'PASS')
    .map(([host]) => host)
    .sort();
  if (compatibleHosts.length === 0) throw new Error('EXP-HOST-PROBE: one PASS is required');
  const unknownHosts = HostSchema.options.filter((host) => hosts.get(host) !== 'PASS');
  return {compatibleHosts, unknownHosts, refs};
};
