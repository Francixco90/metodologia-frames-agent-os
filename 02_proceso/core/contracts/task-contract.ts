import {z} from 'zod';

import {
  ActorIdSchema,
  PortableIdSchema,
  RelativePathSchema,
  Sha256Schema,
  TimestampSchema,
} from './primitives.ts';
import {HandoffSchema} from './schemas.ts';

export const TaskWorkStateSchema = z.enum([
  'INTAKE',
  'ESPECIFICADO',
  'COMPILADO',
  'EVALUADO',
  'ENTREGADO',
  'BLOQUEADO',
]);

export type TaskWorkState = z.infer<typeof TaskWorkStateSchema>;

export const TaskTransitionEvidenceKindSchema = z.enum([
  'contract-complete',
  'work-built',
  'checks-green',
  'handoff-accepted',
  'gate-fail',
  'replan',
]);

export const TaskTransitionRequestSchema = z.strictObject({
  taskId: PortableIdSchema,
  currentState: TaskWorkStateSchema,
  nextState: TaskWorkStateSchema,
  producerActorId: ActorIdSchema,
  actorId: ActorIdSchema,
  actorRole: z.enum(['producer', 'verifier', 'guardian', 'human', 'system']),
  evidence: z
    .array(
      z.strictObject({
        kind: TaskTransitionEvidenceKindSchema,
        hash: Sha256Schema,
        ref: RelativePathSchema,
      }),
    )
    .min(1),
  handoff: HandoffSchema.optional(),
});

export type TaskTransitionRequest = z.infer<typeof TaskTransitionRequestSchema>;

export const TaskContractSchema = z
  .strictObject({
    schema_version: z.literal('task-contract-v1'),
    task_id: z
      .string()
      .regex(/^TASK-(?:[a-z0-9-]+-)?[0-9]{3,}$/u, 'Expected TASK-{slug}-{NNN} or TASK-LOOSE-{NNN}'),
    project_id: z
      .string()
      .regex(/^[a-z0-9-]+$/u)
      .nullable(),
    objetivo: z.string().min(1).max(500),
    repo: z.literal('metodologia-frames-agent-os'),
    responsable: z.enum(['lead', 'support', 'guardian', 'qa', 'governance', 'core', 'repo']),
    inputs: z.array(RelativePathSchema).min(1),
    write_set: z.array(RelativePathSchema).min(1),
    no_objetivos: z.array(z.string().min(1)).default([]),
    done: z.string().min(1).max(500),
    validacion: z.string().min(1).max(1000),
    gaps: z.array(z.string().min(1)).default([]),
    state: TaskWorkStateSchema,
    created_from_route: z.enum([
      'R0',
      'R1',
      'R2',
      'R3',
      'R3-LOOSE',
      'R4',
      'R5',
      'R6',
      'R7',
      'R8',
      'R9',
    ]),
    gate_target: z
      .string()
      .regex(
        /^(G[0-9]{2}([A-Z_]+)?|MW_[A-Z_]+|CR_[A-Z_]+|VO_[A-Z_]+|EXP_(BRIEF|RELEASE)_APPROVED|LX_[A-Z_]+|HM_[A-Z_]+|DOCS_TRANSVERSAL_COMPLETE)$/u,
      )
      .nullable(),
    spawned_subtasks: z.array(PortableIdSchema).default([]),
    parent_task_id: PortableIdSchema.nullable(),
    evidence_tags: z
      .record(
        z.string(),
        z.enum(['CÓDIGO', 'CONFIG', 'DOC', 'INFERENCIA', 'SUPUESTO', 'coverage_gap']),
      )
      .default({}),
    created_at: TimestampSchema,
    updated_at: TimestampSchema,
  })
  .superRefine((c, ctx) => {
    if (c.responsable === 'guardian' && c.write_set.some((p) => !p.startsWith('guardian/'))) {
      ctx.addIssue({
        code: 'custom',
        message: 'Guardian may_remediate:false — write_set must be guardian/ only',
        path: ['write_set'],
      });
    }

    if (
      c.state === 'ENTREGADO' &&
      c.gate_target !== null &&
      (/^G1[3-7]/u.test(c.gate_target) || /^(MW_|CR_|VO_|EXP_|LX_|HM_|DOCS_)/u.test(c.gate_target))
    ) {
      ctx.addIssue({
        code: 'custom',
        message: 'Manual approval gate is fail-closed — cannot auto-ENTREGADO',
        path: ['state'],
      });
    }
  });

export type TaskContract = z.infer<typeof TaskContractSchema>;
