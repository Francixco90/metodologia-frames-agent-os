import {z} from 'zod';

import {FramesHostV1Schema} from './host-adapter-package-v1.ts';
import {PortableIdSchema, RelativePathSchema, Sha256Schema} from './primitives.ts';

const ProbeLayerStatusV2Schema = z.enum(['PASS', 'FAIL', 'UNKNOWN', 'BLOCKED']);
const ProbeLayerV2Schema = z.strictObject({
  status: ProbeLayerStatusV2Schema,
  evidenceRefs: z.array(z.strictObject({ref: RelativePathSchema, sha256: Sha256Schema})).max(8),
  limitation: z.string().trim().min(1).max(400).optional(),
});

export const HostLaunchProbeV2Schema = z
  .strictObject({
    schemaVersion: z.literal('host-launch-probe-v2'),
    probeId: PortableIdSchema,
    packageId: PortableIdSchema,
    packageSha256: Sha256Schema,
    host: FramesHostV1Schema,
    layers: z.strictObject({
      ENGINE_RUNTIME: ProbeLayerV2Schema,
      HOST_DISCOVERY: ProbeLayerV2Schema,
      HOST_BEHAVIOR: ProbeLayerV2Schema,
      DESKTOP_UI: ProbeLayerV2Schema,
    }),
    compatible: z.boolean(),
    localOnly: z.literal(true),
    networkUsed: z.literal(false),
    externalEffects: z.literal(false),
  })
  .superRefine((value, context) => {
    const behaviorPassed = value.layers.HOST_BEHAVIOR.status === 'PASS';
    if (value.compatible !== behaviorPassed) {
      context.addIssue({
        code: 'custom',
        message: 'Only HOST_BEHAVIOR PASS may declare a host compatible.',
      });
    }
    for (const [layer, result] of Object.entries(value.layers)) {
      if (result.status === 'PASS' && result.evidenceRefs.length === 0) {
        context.addIssue({code: 'custom', message: `${layer} PASS requires material evidence.`});
      }
    }
  });

export type HostLaunchProbeV2 = z.infer<typeof HostLaunchProbeV2Schema>;
