import {z} from 'zod';

import {
  ActorIdSchema,
  JsonObjectSchema,
  PortableIdSchema,
  RelativePathSchema,
  Sha256Schema,
  TimestampSchema,
} from './primitives.ts';
import {ExperienceRouteIdV1Schema} from './experience-assistance-v1.ts';
import {
  DocumentationImpactPlanV1Schema,
  MutationClassV1Schema,
} from './documentation-governance-v1.ts';

export const MaterialReferenceV1Schema = z.strictObject({
  ref: RelativePathSchema,
  sha256: Sha256Schema,
});
export type MaterialReferenceV1 = z.infer<typeof MaterialReferenceV1Schema>;
const BudgetEnvelopeV1Schema = z.strictObject({
  targetFiles: z.number().int().positive(),
  maxFiles: z.number().int().positive(),
  targetTokens: z.number().int().positive(),
  maxTokens: z.number().int().positive(),
});

export const FramesWorkOrderV1Schema = z
  .strictObject({
    schemaVersion: z.literal('frames-work-order-v1'),
    workOrderId: PortableIdSchema,
    requestHash: Sha256Schema,
    routeId: ExperienceRouteIdV1Schema,
    workflowId: PortableIdSchema,
    stepId: PortableIdSchema,
    skillId: PortableIdSchema,
    actorId: ActorIdSchema,
    readSet: z.array(RelativePathSchema).max(20),
    writeSet: z.array(RelativePathSchema).max(12),
    inputs: z.array(MaterialReferenceV1Schema).max(20),
    expectedOutputs: z.array(RelativePathSchema).max(12),
    tools: z.array(PortableIdSchema).max(12),
    effectClass: z.enum(['READ_ONLY', 'LOCAL_REVERSIBLE']),
    budget: BudgetEnvelopeV1Schema,
    acceptanceCriteria: z.array(z.string().trim().min(1).max(280)).min(1).max(12),
    stopRule: z.string().trim().min(1).max(500),
    changeClass: MutationClassV1Schema.optional(),
    documentationImpact: DocumentationImpactPlanV1Schema.optional(),
    canonicalSha256: Sha256Schema,
  })
  .superRefine((value, context) => {
    if (value.effectClass === 'READ_ONLY' && value.writeSet.length > 0) {
      context.addIssue({
        code: 'custom',
        message: 'READ_ONLY work orders require an empty write set.',
      });
    }
    if (
      value.budget.targetFiles > value.budget.maxFiles ||
      value.budget.targetTokens > value.budget.maxTokens
    ) {
      context.addIssue({code: 'custom', message: 'Budget targets cannot exceed hard maxima.'});
    }
    if ((value.changeClass === undefined) !== (value.documentationImpact === undefined)) {
      context.addIssue({
        code: 'custom',
        message: 'Mutating work orders require a documentation impact plan.',
      });
    }
    if (
      value.changeClass !== undefined &&
      value.documentationImpact?.changeClass !== value.changeClass
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Work order and documentation change class differ.',
      });
    }
  });
export type FramesWorkOrderV1 = z.infer<typeof FramesWorkOrderV1Schema>;

export const SkillInvocationReceiptV1Schema = z
  .strictObject({
    schemaVersion: z.literal('skill-invocation-receipt-v1'),
    invocationId: PortableIdSchema,
    workOrderId: PortableIdSchema,
    workOrderSha256: Sha256Schema,
    skillId: PortableIdSchema,
    actorId: ActorIdSchema,
    status: z.enum(['PASS', 'FAIL', 'UNKNOWN', 'BLOCKED']),
    outputs: z.array(MaterialReferenceV1Schema).max(12),
    evidence: z.array(MaterialReferenceV1Schema).max(20),
    publicSummary: z.string().trim().min(1).max(500),
    metrics: JsonObjectSchema,
    startedAt: TimestampSchema,
    completedAt: TimestampSchema,
    canonicalSha256: Sha256Schema,
  })
  .superRefine((value, context) => {
    if (value.status === 'PASS' && (value.outputs.length === 0 || value.evidence.length === 0)) {
      context.addIssue({code: 'custom', message: 'PASS requires material outputs and evidence.'});
    }
    if (Date.parse(value.completedAt) < Date.parse(value.startedAt)) {
      context.addIssue({code: 'custom', message: 'Invocation cannot complete before it starts.'});
    }
  });
export type SkillInvocationReceiptV1 = z.infer<typeof SkillInvocationReceiptV1Schema>;
