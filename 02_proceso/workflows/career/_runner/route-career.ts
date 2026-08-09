import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';

import {CareerIntentV1Schema, type CareerIntentV1} from '../_schema/intent-v1.schema.ts';
import {z} from 'zod';

export const CareerRouteRequestSchema = z.strictObject({
  request: z.string(),
  candidateId: z.string().optional(),
  applicationId: z.string().optional(),
  targetRole: z.string().optional(),
  language: z.enum(['es', 'en', 'pt']).optional(),
  jobRef: z.string().optional(),
  sourceRefs: z.array(z.string()).optional(),
  constraints: z.array(z.string()).optional(),
  profileReady: z.boolean().optional(),
  evidenceReady: z.boolean().optional(),
  jobValidated: z.boolean().optional(),
  packageReady: z.boolean().optional(),
});
export type CareerRouteRequest = z.infer<typeof CareerRouteRequestSchema>;

const normalize = (value: unknown): string =>
  typeof value === 'string' ? value.normalize('NFC').trim().replace(/\s+/gu, ' ') : '';
const hash = (value: string): string => createHash('sha256').update(value, 'utf8').digest('hex');

const classify = (request: string): CareerIntentV1['intent_class'] => {
  const value = request.toLocaleLowerCase('es');
  if (/seguimiento|follow.?up|estado de (mi )?postulación/u.test(value)) return 'follow_up';
  if (/buscar|encuentra|vacantes|oportunidades|linkedin/u.test(value)) {
    return /postular|aplicar|application/u.test(value) ? 'full_application' : 'job_search';
  }
  if (/cover letter|carta de (presentación|motivación)|recruiter message/u.test(value)) {
    return 'cover_letter';
  }
  if (/editar|corregir|actualizar|intervenir/u.test(value)) return 'intervention';
  if (/vacante|job description|adaptar|personalizar/u.test(value)) return 'targeted_cv';
  return 'general_cv';
};

export const routeCareerIntent = (requestInput: CareerRouteRequest): CareerIntentV1 => {
  const routeInput = CareerRouteRequestSchema.parse(requestInput);
  const request = normalize(routeInput.request);
  if (!request) throw new Error('CAREER-INTENT-001 request is required');
  const input = routeInput;
  const intentClass = classify(request);
  const questions: string[] = [];
  if (!input.candidateId) questions.push('¿Qué perfil de candidato debemos usar o crear?');
  if (!normalize(input.targetRole)) questions.push('¿Qué rol o familia de roles es el objetivo?');
  if (['targeted_cv', 'cover_letter', 'full_application'].includes(intentClass) && !input.jobRef) {
    questions.push('¿Cuál es la descripción completa y vigente de la vacante?');
  }

  const stages: CareerIntentV1['selected_stage_path'] = [];
  if (!input.profileReady) stages.push('C00');
  if (!input.evidenceReady) stages.push('C01');
  if (['general_cv', 'job_search', 'full_application'].includes(intentClass)) stages.push('C02');
  if (['job_search', 'full_application'].includes(intentClass)) stages.push('C03', 'C04');
  if (['targeted_cv', 'cover_letter', 'full_application'].includes(intentClass)) {
    if (!stages.includes('C04') && !input.jobValidated) stages.push('C04');
    stages.push('C05');
  }
  if (['general_cv', 'targeted_cv', 'full_application', 'intervention'].includes(intentClass)) {
    stages.push('C06');
  }
  if (['cover_letter', 'full_application'].includes(intentClass)) stages.push('C07');
  if (!['job_search', 'follow_up'].includes(intentClass)) stages.push('C08');
  if (['full_application', 'follow_up'].includes(intentClass)) stages.push('C09');
  if (stages.length === 0) stages.push('C00');

  const requiresBrief = stages.some((stage) => ['C00', 'C02', 'C05'].includes(stage));
  return CareerIntentV1Schema.parse({
    schema_version: 'career-intent-v1',
    request,
    request_hash: hash(request),
    intent_class: intentClass,
    candidate_id: input.candidateId ?? null,
    application_id: input.applicationId ?? null,
    target_role: normalize(input.targetRole) || null,
    language: input.language ?? 'unknown',
    job_ref: input.jobRef ?? null,
    sources: [...new Set(input.sourceRefs ?? [])].sort(),
    constraints: [...new Set(input.constraints ?? [])].sort(),
    effect_class: stages.includes('C09') ? 'external_reversible' : 'local_reversible',
    brief_sufficiency:
      questions.length === 0 ? 'complete' : questions.length < 3 ? 'partial' : 'insufficient',
    blocking_questions: questions.slice(0, 3),
    reason_codes: [
      `INTENT_${intentClass.toUpperCase()}`,
      ...(stages.includes('C09') ? ['SUBMISSION_STOP_REQUIRED'] : []),
    ],
    selected_stage_path: [...new Set(stages)],
    brief_ref: 'work/private/career/brief.md',
    next_gate: requiresBrief ? 'CR_BRIEF_APPROVED' : 'CR_PACKAGE_APPROVED',
    decision: questions.length === 0 ? 'ROUTED' : 'NEEDS_INPUT',
  });
};

const invoked = process.argv[1];
if (invoked?.endsWith('route-career.ts')) {
  const inputPath = process.argv[2];
  const outputPath = process.argv[3];
  if (!inputPath) throw new Error('Usage: route-career.ts <request.json> [output.json]');
  const parsed: unknown = JSON.parse(readFileSync(inputPath, 'utf8'));
  const result = `${JSON.stringify(routeCareerIntent(CareerRouteRequestSchema.parse(parsed)), null, 2)}\n`;
  if (outputPath) writeFileSync(outputPath, result, 'utf8');
  else process.stdout.write(result);
}
