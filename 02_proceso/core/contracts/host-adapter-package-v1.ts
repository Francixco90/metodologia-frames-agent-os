import {z} from 'zod';

import {PortableIdSchema, RelativePathSchema, Sha256Schema} from './primitives.ts';

export const FramesHostV1Schema = z.enum(['CODEX', 'CLAUDE', 'GEMINI', 'CHATGPT']);
export const HostAdapterScopeV1Schema = z.enum(['repository', 'user', 'plugin']);

const HostAdapterEntryV1Schema = z.strictObject({
  host: FramesHostV1Schema,
  invocation: z.string().trim().min(2).max(64),
  discovery: z.enum(['REPOSITORY_MATERIAL', 'PLANNED', 'BLOCKED']),
  projectionRefs: z.array(RelativePathSchema).min(1).max(4),
  capabilityStatus: z.enum(['LOCAL_EVALUATION', 'UNKNOWN', 'BLOCKED']),
  limitations: z.array(z.string().trim().min(1).max(240)).max(8),
});

export const HostAdapterPackageV1Schema = z
  .strictObject({
    schemaVersion: z.literal('host-adapter-package-v1'),
    packageId: PortableIdSchema,
    version: z.string().regex(/^\d+\.\d+\.\d+$/u),
    identity: z.literal('Frames ContentOS · por MetodologIA'),
    runtimeRef: RelativePathSchema,
    runtimeCommand: z.literal('pnpm frames:assist --'),
    allowedScope: z.literal('repository'),
    blockedScopes: z.tuple([z.literal('user'), z.literal('plugin')]),
    adapters: z.array(HostAdapterEntryV1Schema).length(4),
    policy: z.strictObject({
      network: z.literal('FORBIDDEN'),
      hooks: z.literal('FORBIDDEN'),
      mcp: z.literal('FORBIDDEN'),
      foreignOverwrite: z.literal('FORBIDDEN'),
      defaultMode: z.literal('PLAN'),
      applyRequiresHashConfirmation: z.literal(true),
      atomicWrites: z.literal(true),
      backupBeforeReplace: z.literal(true),
    }),
  })
  .superRefine((value, context) => {
    const expected = new Map([
      ['CODEX', '$frames-assist'],
      ['CHATGPT', '@frames-assist'],
      ['CLAUDE', '/frames-assist'],
      ['GEMINI', '/frames:assist'],
    ]);
    const hosts = new Set<string>();
    const refs = new Set<string>();
    for (const adapter of value.adapters) {
      if (hosts.has(adapter.host)) {
        context.addIssue({code: 'custom', message: `Duplicate host ${adapter.host}`});
      }
      hosts.add(adapter.host);
      if (adapter.invocation !== expected.get(adapter.host)) {
        context.addIssue({code: 'custom', message: `Invocation drift for ${adapter.host}`});
      }
      for (const ref of adapter.projectionRefs) {
        if (refs.has(ref)) context.addIssue({code: 'custom', message: `Duplicate ref ${ref}`});
        refs.add(ref);
      }
    }
  });

export type HostAdapterPackageV1 = z.infer<typeof HostAdapterPackageV1Schema>;

export const HostAdapterInstallReceiptV1Schema = z.strictObject({
  schemaVersion: z.literal('host-adapter-install-receipt-v1'),
  operation: z.enum(['PLAN', 'APPLY', 'VERIFY', 'UNINSTALL']),
  status: z.enum(['PASS', 'BLOCKED']),
  packageId: PortableIdSchema,
  packageSha256: Sha256Schema,
  scope: HostAdapterScopeV1Schema,
  targetRootSha256: Sha256Schema,
  changedRefs: z.array(RelativePathSchema),
  verifiedRefs: z.array(RelativePathSchema),
  restoredRefs: z.array(RelativePathSchema),
  externalEffects: z.literal(false),
  networkUsed: z.literal(false),
});
export type HostAdapterInstallReceiptV1 = z.infer<typeof HostAdapterInstallReceiptV1Schema>;
