import {createHash} from 'node:crypto';

import {z} from 'zod';

const InputSchema = z.strictObject({
  request: z.string().trim().min(1).max(2_000),
  change_summary: z.string().trim().min(1).max(500).optional(),
  target_surface: z.string().trim().min(1).max(240).optional(),
  expected_outcome: z.string().trim().min(1).max(500).optional(),
});

export interface MaintenanceRouteDecisionV1 {
  schema_version: 'maintenance-route-decision-v1';
  route_id: 'R9';
  request_hash: string;
  decision: 'ROUTED' | 'NEEDS_INPUT';
  selected_stage_path: string[];
  skill_system_path: string[];
  blocking_questions: string[];
  next_gate: 'HM_CHANGE_APPROVED';
}

const hash = (value: unknown): string =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');

export function routeMaintenanceIntent(input: unknown): MaintenanceRouteDecisionV1 {
  const parsed = InputSchema.parse(input);
  const blocking = [
    parsed.change_summary ? null : '¿Qué comportamiento quieres corregir o evolucionar?',
    parsed.target_surface ? null : '¿Qué parte de Frames está afectada?',
    parsed.expected_outcome ? null : '¿Qué resultado observable confirmará el cambio?',
  ].filter((question): question is string => question !== null);
  return {
    schema_version: 'maintenance-route-decision-v1',
    route_id: 'R9',
    request_hash: hash(parsed),
    decision: blocking.length === 0 ? 'ROUTED' : 'NEEDS_INPUT',
    selected_stage_path: ['M00', 'M01', 'M02', 'M03', 'M04', 'M05', 'M06'],
    skill_system_path: ['S00', 'S01', 'S02', 'S03', 'S04', 'S05', 'S06', 'S07', 'S08', 'S09'],
    blocking_questions: blocking,
    next_gate: 'HM_CHANGE_APPROVED',
  };
}
