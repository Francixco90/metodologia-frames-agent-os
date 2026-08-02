import {z} from 'zod';

import {
  ActorIdSchema,
  containsProhibitedReasoningText,
  PortableIdSchema,
  RelativePathSchema,
  Sha256Schema,
} from '../../core/contracts/index.ts';
import {
  HashBoundReferenceV1Schema,
  OrchestrationErrorCodeV2Schema,
} from '../../core/contracts/content-v2.ts';
import {RoleIdSchema} from './contracts.ts';

const NonEmptyTextSchema = z.string().trim().min(1).max(4_000);
const EphemeralRoleIdV2Schema = z.enum([
  'RT-02',
  'RT-03',
  'RT-04',
  'RT-05',
  'RT-06',
  'RT-07',
  'RT-08',
  'RT-09',
  'RT-10',
]);

const AgentInputOutputV2Schema = z.strictObject({
  contractId: PortableIdSchema,
  description: NonEmptyTextSchema,
  required: z.boolean(),
});

const AgentStopRuleV2Schema = z.strictObject({
  ruleId: PortableIdSchema,
  condition: NonEmptyTextSchema,
  errorCode: OrchestrationErrorCodeV2Schema,
  result: z.enum(['block', 'escalate', 'return_for_revision']),
});

const ToolPermissionV2Schema = z.strictObject({
  toolId: PortableIdSchema,
  access: z.enum(['read', 'execute']),
  mutation: z.enum(['none', 'workspace_scoped']),
});

const ForbiddenActionV2Schema = z.enum([
  'external_publish',
  'external_send',
  'external_deploy',
  'pre_h01_memory_write',
  'gate_bypass',
  'unstructured_deliberation_persistence',
]);

const LegacyHandoffAdapterV2Schema = z.strictObject({
  outputsField: z.literal('outputs'),
  testsField: z.literal('tests'),
  coverageGapsField: z.literal('coverageGaps'),
  evidenceHashesSource: z.literal('outputs[].sha256'),
});

export const AgentContractBaseV2Schema = z
  .strictObject({
    schemaVersion: z.literal('agent-contract-base-v2'),
    baseContractId: PortableIdSchema,
    privateReasoningPolicy: z.literal('never_persist'),
    evidencePolicy: z.literal('decisions_and_evidence_only'),
    memoryPolicy: z.literal('after_human_approval_only'),
    publicationPolicy: z.literal('forbidden'),
    maxRetries: z.literal(3),
    maxConcurrencyPerActor: z.literal(1),
    allowedTools: z.array(ToolPermissionV2Schema).min(1).max(32),
    forbiddenActions: z.array(ForbiddenActionV2Schema).min(1).max(6),
    requiredHandoffFields: z
      .array(z.enum(['outputs', 'tests', 'evidence_hashes', 'coverage_gaps']))
      .length(4),
    legacyHandoffAdapter: LegacyHandoffAdapterV2Schema,
  })
  .superRefine((contract, context) => {
    if (containsProhibitedReasoningText(contract)) {
      context.addIssue({
        code: 'custom',
        message: 'Agent base contract cannot persist private reasoning or chain-of-thought.',
      });
    }
  });

export type AgentContractBaseV2 = z.infer<typeof AgentContractBaseV2Schema>;

export const AgentContractV2Schema = z
  .strictObject({
    schemaVersion: z.literal('agent-contract-v2'),
    contractId: PortableIdSchema,
    roleId: RoleIdSchema,
    agentId: ActorIdSchema,
    agentClass: z.enum(['orchestrator', 'specialist', 'guardian']),
    lifecycle: z.enum(['permanent', 'ephemeral']),
    baseContract: HashBoundReferenceV1Schema,
    legacyV1Contract: HashBoundReferenceV1Schema,
    purpose: NonEmptyTextSchema,
    responsibilities: z.array(NonEmptyTextSchema).min(1).max(24),
    capabilities: z.array(PortableIdSchema).min(1).max(32),
    inputs: z.array(AgentInputOutputV2Schema).min(1).max(24),
    outputs: z.array(AgentInputOutputV2Schema).min(1).max(24),
    allowedTools: z.array(ToolPermissionV2Schema).min(1).max(32),
    forbiddenActions: z.array(ForbiddenActionV2Schema).min(1).max(6),
    stopRules: z.array(AgentStopRuleV2Schema).min(1).max(24),
    maxRetries: z.literal(3),
    maxConcurrencyPerActor: z.literal(1),
    privateReasoningPolicy: z.literal('never_persist'),
    evidencePolicy: z.literal('decisions_and_evidence_only'),
    memoryPolicy: z.literal('after_human_approval_only'),
    publicationPolicy: z.literal('forbidden'),
    requiredHandoffFields: z
      .array(z.enum(['outputs', 'tests', 'evidence_hashes', 'coverage_gaps']))
      .length(4),
    legacyHandoffAdapter: LegacyHandoffAdapterV2Schema,
  })
  .superRefine((contract, context) => {
    const expectedPermanent = contract.roleId === 'RT-01' || contract.roleId === 'RT-11';
    if ((contract.lifecycle === 'permanent') !== expectedPermanent) {
      context.addIssue({
        code: 'custom',
        message: 'Only RT-01 and RT-11 are permanent agents.',
        path: ['lifecycle'],
      });
    }

    if (
      contract.roleId === 'RT-01' &&
      (contract.agentId !== 'CreativeOrchestratorV2' || contract.agentClass !== 'orchestrator')
    ) {
      context.addIssue({
        code: 'custom',
        message: 'RT-01 must be the permanent CreativeOrchestratorV2.',
        path: ['agentId'],
      });
    }
    if (
      contract.roleId === 'RT-11' &&
      (contract.agentId !== 'GuardianV2' || contract.agentClass !== 'guardian')
    ) {
      context.addIssue({
        code: 'custom',
        message: 'RT-11 must be the permanent GuardianV2.',
        path: ['agentId'],
      });
    }
    if (
      EphemeralRoleIdV2Schema.safeParse(contract.roleId).success &&
      contract.agentClass !== 'specialist'
    ) {
      context.addIssue({
        code: 'custom',
        message: 'RT-02 through RT-10 must be ephemeral specialists.',
        path: ['agentClass'],
      });
    }
    if (new Set(contract.capabilities).size !== contract.capabilities.length) {
      context.addIssue({
        code: 'custom',
        message: 'Agent capabilities must be unique.',
        path: ['capabilities'],
      });
    }
    if (new Set(contract.requiredHandoffFields).size !== 4) {
      context.addIssue({
        code: 'custom',
        message: 'All four governed handoff fields must be declared exactly once.',
        path: ['requiredHandoffFields'],
      });
    }
    if (containsProhibitedReasoningText(contract)) {
      context.addIssue({
        code: 'custom',
        message: 'Agent contract cannot persist private reasoning or chain-of-thought.',
      });
    }
  });

export type AgentContractV2 = z.infer<typeof AgentContractV2Schema>;

export const AgentRegistryEntryV2Schema = z.strictObject({
  roleId: RoleIdSchema,
  agentId: ActorIdSchema,
  agentClass: z.enum(['orchestrator', 'specialist', 'guardian']),
  lifecycle: z.enum(['permanent', 'ephemeral']),
  purpose: NonEmptyTextSchema,
  responsibilities: z.array(NonEmptyTextSchema).min(1).max(24),
  capabilities: z.array(PortableIdSchema).min(1).max(32),
  inputs: z.array(AgentInputOutputV2Schema).min(1).max(24),
  outputs: z.array(AgentInputOutputV2Schema).min(1).max(24),
  stopRules: z.array(AgentStopRuleV2Schema).min(1).max(24),
  legacyV1Contract: HashBoundReferenceV1Schema,
});

export type AgentRegistryEntryV2 = z.infer<typeof AgentRegistryEntryV2Schema>;

export const AgentRegistryV2Schema = z
  .strictObject({
    schemaVersion: z.literal('agent-registry-v2'),
    registryId: PortableIdSchema,
    baseContract: HashBoundReferenceV1Schema,
    entries: z.array(AgentRegistryEntryV2Schema).length(11),
    migration: z.strictObject({
      strategy: z.literal('v1-adapter-before-producer-cutover'),
      vs001Compatible: z.literal(true),
      producerCutoverAllowed: z.literal(false),
    }),
    publicationPolicy: z.literal('forbidden'),
  })
  .superRefine((registry, context) => {
    const roleIds = registry.entries.map(({roleId}) => roleId);
    if (new Set(roleIds).size !== 11) {
      context.addIssue({
        code: 'custom',
        message: 'Agent registry must contain RT-01 through RT-11 exactly once.',
        path: ['entries'],
      });
    }
    for (const roleId of RoleIdSchema.options) {
      if (!roleIds.includes(roleId)) {
        context.addIssue({
          code: 'custom',
          message: `Agent registry is missing ${roleId}.`,
          path: ['entries'],
        });
      }
    }
    if (containsProhibitedReasoningText(registry)) {
      context.addIssue({
        code: 'custom',
        message: 'Agent registry cannot persist private reasoning or chain-of-thought.',
      });
    }
  });

export type AgentRegistryV2 = z.infer<typeof AgentRegistryV2Schema>;

export const materializeAgentContractV2 = (
  base: AgentContractBaseV2,
  baseRef: z.infer<typeof HashBoundReferenceV1Schema>,
  entry: AgentRegistryEntryV2,
): AgentContractV2 =>
  AgentContractV2Schema.parse({
    schemaVersion: 'agent-contract-v2',
    contractId: `agent-contract-v2:${entry.roleId}`,
    roleId: entry.roleId,
    agentId: entry.agentId,
    agentClass: entry.agentClass,
    lifecycle: entry.lifecycle,
    baseContract: baseRef,
    legacyV1Contract: entry.legacyV1Contract,
    purpose: entry.purpose,
    responsibilities: entry.responsibilities,
    capabilities: entry.capabilities,
    inputs: entry.inputs,
    outputs: entry.outputs,
    allowedTools: base.allowedTools,
    forbiddenActions: base.forbiddenActions,
    stopRules: entry.stopRules,
    maxRetries: base.maxRetries,
    maxConcurrencyPerActor: base.maxConcurrencyPerActor,
    privateReasoningPolicy: base.privateReasoningPolicy,
    evidencePolicy: base.evidencePolicy,
    memoryPolicy: base.memoryPolicy,
    publicationPolicy: base.publicationPolicy,
    requiredHandoffFields: base.requiredHandoffFields,
    legacyHandoffAdapter: base.legacyHandoffAdapter,
  });

export const LEGACY_AGENT_CONTRACT_PATHS = RoleIdSchema.options.map((roleId) =>
  RelativePathSchema.parse(`agents/${roleId}/contract.yml`),
);

export const LEGACY_AGENT_CONTRACT_DIGEST_SCHEMA = z.strictObject({
  ref: RelativePathSchema,
  sha256: Sha256Schema,
});
