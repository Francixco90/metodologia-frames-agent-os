export const FRAMES_OPERATOR_PROMPT_CHAIN = [
  {id: 'P01', purpose: 'Fijar resultado, fuentes, autoridad y límites.'},
  {id: 'P02', purpose: 'Elegir dirección y aprobar la spec exacta.'},
  {id: 'P03', purpose: 'Revisar el candidato y declarar correcciones materiales.'},
  {id: 'P04', purpose: 'Aceptar el handoff exacto sin inferir publicación.'},
] as const;

export const FRAMES_OPERATOR_CONTEXT_BUDGET = {
  max_prompts: 5,
  target_prompts: 4,
  max_capsule_tokens: 1_800,
  max_evidence_refs: 12,
  max_gaps: 8,
} as const;

export const FRAMES_SAFE_LAPTOP_PROFILE = {
  profile_id: 'safe-laptop-v1',
  max_active_semantic_work_units: 1,
  max_heavy: 1,
  max_light: 1,
  max_browser: 1,
  reserve_percent: 30,
  exclusive_pairs: [
    ['local_llm', 'video_encode'],
    ['local_llm', 'browser_render'],
    ['long_encode', 'long_encode'],
    ['browser_render', 'video_encode'],
  ],
} as const;

export const FRAMES_OPERATOR_PROFILES = {
  CAREER: {
    route: 'R7',
    stages: ['C00', 'C01', 'C02', 'C03', 'C04', 'C05', 'C06', 'C07', 'C08', 'C09'],
    documents: [
      'candidate-foundation-brief',
      'evidence-bank',
      'positioning-charter',
      'application-brief',
      'cv-spec',
      'application-package-review',
      'handoff',
    ],
    automatic_terminal_state: 'RENDERED_DRAFT',
  },
  VIDEO: {
    route: 'R6',
    stages: ['V00', 'V01', 'V02', 'V03', 'V04'],
    documents: [
      'source-analysis.json',
      'video-brief.md',
      'video-spec.json',
      'piece-scripts.json',
      'caption-track.json',
      'shot-plan.json',
      'storyboard-multiframe.json',
      'privacy-plan.json',
      'render-plan.json',
      'review-report.md',
      'handoff.md',
    ],
    automatic_terminal_state: 'RENDERED_DRAFT',
  },
} as const;

export type FramesOperatorProfileId = keyof typeof FRAMES_OPERATOR_PROFILES;
