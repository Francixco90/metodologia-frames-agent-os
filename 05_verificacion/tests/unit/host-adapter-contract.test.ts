import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {describe, expect, it} from 'vitest';

import {
  HostAdapterPackageV1Schema,
  type HostAdapterPackageV1,
} from '../../../02_proceso/core/contracts/host-adapter-package-v1.ts';
import {HostLaunchProbeV2Schema} from '../../../02_proceso/core/contracts/host-launch-probe-v2.ts';
import {renderHostAdapterProjections} from '../../../03_artefactos/host-adapters/generate-host-adapters.ts';

const manifest = HostAdapterPackageV1Schema.parse(
  JSON.parse(
    readFileSync(resolve('03_artefactos/host-adapters/host-adapter-package.json'), 'utf8'),
  ),
);

describe('HostAdapterPackageV1', () => {
  it('binds the four concise aliases without granting external capabilities', () => {
    expect(
      Object.fromEntries(manifest.adapters.map(({host, invocation}) => [host, invocation])),
    ).toEqual({
      CODEX: '$frames-assist',
      CLAUDE: '/frames-assist',
      GEMINI: '/frames:assist',
      CHATGPT: '@frames-assist',
    });
    expect(manifest.policy).toMatchObject({
      network: 'FORBIDDEN',
      hooks: 'FORBIDDEN',
      mcp: 'FORBIDDEN',
    });
    expect(manifest.allowedScope).toBe('repository');
  });

  it('renders every declared projection deterministically', () => {
    const first = renderHostAdapterProjections(manifest);
    const second = renderHostAdapterProjections(manifest);
    expect(second).toEqual(first);
    expect(Object.keys(first).sort()).toEqual(
      manifest.adapters.flatMap(({projectionRefs}) => projectionRefs).sort(),
    );
    for (const [ref, expected] of Object.entries(first)) {
      expect(readFileSync(resolve(ref), 'utf8'), ref).toBe(expected);
    }
  });

  it('rejects alias drift', () => {
    const candidate: HostAdapterPackageV1 = structuredClone(manifest);
    candidate.adapters[0]!.invocation = '/wrong';
    expect(HostAdapterPackageV1Schema.safeParse(candidate).success).toBe(false);
  });
});

describe('HostLaunchProbeV2', () => {
  const layer = {status: 'UNKNOWN' as const, evidenceRefs: [], limitation: 'Not executed.'};
  const base = {
    schemaVersion: 'host-launch-probe-v2' as const,
    probeId: 'PROBE-CODEX-001',
    packageId: manifest.packageId,
    packageSha256: 'a'.repeat(64),
    host: 'CODEX' as const,
    layers: {
      ENGINE_RUNTIME: layer,
      HOST_DISCOVERY: layer,
      HOST_BEHAVIOR: layer,
      DESKTOP_UI: layer,
    },
    compatible: false,
    localOnly: true as const,
    networkUsed: false as const,
    externalEffects: false as const,
  };

  it('does not accept engine or discovery evidence as host compatibility', () => {
    const candidate = {
      ...base,
      layers: {
        ...base.layers,
        ENGINE_RUNTIME: {
          status: 'PASS',
          evidenceRefs: [{ref: 'evidence/engine.json', sha256: 'b'.repeat(64)}],
        },
      },
      compatible: true,
    };
    expect(HostLaunchProbeV2Schema.safeParse(candidate).success).toBe(false);
  });

  it('requires material evidence for HOST_BEHAVIOR PASS', () => {
    const withoutEvidence = {
      ...base,
      layers: {
        ...base.layers,
        HOST_BEHAVIOR: {status: 'PASS', evidenceRefs: []},
      },
      compatible: true,
    };
    expect(HostLaunchProbeV2Schema.safeParse(withoutEvidence).success).toBe(false);
    const withEvidence = {
      ...withoutEvidence,
      layers: {
        ...withoutEvidence.layers,
        HOST_BEHAVIOR: {
          status: 'PASS',
          evidenceRefs: [{ref: 'evidence/behavior.json', sha256: 'c'.repeat(64)}],
        },
      },
    };
    expect(HostLaunchProbeV2Schema.safeParse(withEvidence).success).toBe(true);
  });
});
