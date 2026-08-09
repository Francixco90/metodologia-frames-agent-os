import {createHash} from 'node:crypto';

export type SkillSystemIntakeV1 = {
  request: string;
  scope?: 'PROJECT_LOCAL' | 'USER_LOCAL' | 'CANONICAL';
  desiredOutcome?: string;
  evidenceRefs?: string[];
};

const normalized = (value: string): string => value.normalize('NFC').trim().replace(/\s+/gu, ' ');

export const routeSkillSystemIntentV1 = (input: SkillSystemIntakeV1) => {
  const request = normalized(input.request);
  if (!request) throw new Error('SSS_REQUEST_REQUIRED');
  const explicitScope = input.scope;
  const scope = explicitScope ?? 'PROJECT_LOCAL';
  const questions = [
    input.desiredOutcome ? null : '¿Qué resultado observable debe mejorar esta capacidad?',
    (input.evidenceRefs?.length ?? 0) > 0
      ? null
      : '¿Qué ejemplo, proceso o evidencia debe usar como fuente?',
  ].filter((value): value is string => value !== null);
  return {
    schema_version: 'skill-system-intake-route-v1',
    route_via: scope === 'CANONICAL' ? 'R9' : 'R8',
    request_hash: createHash('sha256')
      .update(
        JSON.stringify({
          request,
          scope,
          desiredOutcome: input.desiredOutcome ?? null,
          evidenceRefs: [...(input.evidenceRefs ?? [])].sort(),
        }),
      )
      .digest('hex'),
    scope,
    scope_inferred: explicitScope === undefined,
    recommended_scope: explicitScope === undefined ? 'PROJECT_LOCAL' : scope,
    alternatives: explicitScope === undefined ? ['CANONICAL'] : [],
    stage_path: ['S00', 'S01', 'S02', 'S03', 'S04', 'S05', 'S06', 'S07', 'S08', 'S09'],
    active_step: 'S00',
    blocking_questions: questions.slice(0, 3),
    next_gate: scope === 'CANONICAL' ? 'HM_CHANGE_APPROVED' : 'LX_BRIEF_APPROVED',
    write_policy: 'read_only_until_scope_gate',
    state: questions.length > 0 ? 'NEEDS_INPUT' : 'READY_FOR_CASE',
  } as const;
};

export const analyzeSpokenVideoFixtureV1 = () => ({
  schema_version: 'spoken-video-skill-case-v1',
  decision: 'KEEP',
  media_execution: false,
  components: [
    {
      kind: 'SKILL',
      id: 'spoken-video-editorial-orchestrator',
      responsibility: 'Interpretar intención y preservar significado',
    },
    {
      kind: 'TOOL',
      id: 'silence-detection',
      responsibility: 'Detectar candidatos sin decidir cortes',
    },
    {kind: 'TOOL', id: 'caption-render', responsibility: 'Renderizar subtítulos aprobados'},
    {
      kind: 'EVALUATOR',
      id: 'accessibility-review',
      responsibility: 'Verificar legibilidad y alternativa textual',
    },
    {
      kind: 'HUMAN_GATE',
      id: 'rights-and-editorial-approval',
      responsibility: 'Autorizar derechos y decisiones editoriales',
    },
  ],
  invariants: [
    'DETECTION_NOT_DECISION',
    'TRIGGER_NOT_AUTHORIZATION',
    'RIGHTS_REQUIRED',
    'ACCESSIBILITY_REQUIRED',
  ],
  split: {
    status: 'HOLD',
    reason: 'dialogue y audio no cumplen aún dos razones operativas de split',
  },
});
