import {z} from 'zod';

import {NotebookWorkUnitDeclarationSchema} from '../../core/contracts/index.ts';
import {RoleIdSchema} from './contracts.ts';

const NonEmptyTextSchema = z.string().trim().min(1);

const InputOutputSchema = z
  .object({
    id: z.string().trim().min(1),
    description: NonEmptyTextSchema,
    required: z.boolean(),
  })
  .strict();

const StopRuleSchema = z
  .object({
    id: z.string().trim().min(1),
    condition: NonEmptyTextSchema,
    result: z.enum(['BLOCK', 'ESCALATE', 'RETURN_FOR_REVISION']),
  })
  .strict();

export const AgentContractSchema = z
  .object({
    schema_version: z.literal(1),
    role_id: RoleIdSchema,
    title: NonEmptyTextSchema,
    purpose: NonEmptyTextSchema,
    responsibilities: z.array(NonEmptyTextSchema).min(1),
    inputs: z.array(InputOutputSchema).min(1),
    outputs: z.array(InputOutputSchema).min(1),
    tools: z
      .object({
        allowed: z.array(NonEmptyTextSchema).min(1),
        forbidden: z.array(NonEmptyTextSchema).min(1),
      })
      .strict(),
    stop_rules: z.array(StopRuleSchema).min(1),
    done: z.array(NonEmptyTextSchema).min(1),
    handoff: z
      .object({
        consumers: z.array(RoleIdSchema).min(1),
        required_fields: z.array(NonEmptyTextSchema).min(1),
        acceptance: NonEmptyTextSchema,
      })
      .strict(),
    evidence_policy: z
      .object({
        required_tags: z.array(
          z.enum(['[CÓDIGO]', '[CONFIG]', '[DOC]', '[INFERENCIA]', '[SUPUESTO]']),
        ),
        private_reasoning: z.literal('NEVER_PERSIST'),
        coverage_gap: z.literal('EXPLICIT'),
      })
      .strict(),
    notebooklm: NotebookWorkUnitDeclarationSchema,
  })
  .strict();

export type AgentContract = z.infer<typeof AgentContractSchema>;
