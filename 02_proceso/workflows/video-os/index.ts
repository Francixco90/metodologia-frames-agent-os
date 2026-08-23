export * from './_schema/index.ts';
export * from './_runner/video-os.ts';
export * from './_adapters/general-video-method-explainer-v1.ts';

export const VIDEO_OS_CHAIN = ['V00', 'V01', 'V02', 'V03', 'V04'] as const;
export const VIDEO_OS_USER_PROMPT_CHAIN = [
  'VO_INTAKE_COMPLETE',
  'VO_DIRECTION_APPROVED',
  'VO_PRINCIPAL_VERIFIED',
  'VO_HANDOFF_APPROVED',
] as const;
export const VIDEO_OS_DEFAULT_DOCUMENTS = [
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
] as const;
export const VIDEO_OS_CONTEXT_BUDGETS = {
  maxTokensPerStage: 1_800,
  maxBlockingQuestions: 3,
  maxHumanDecisions: 5,
} as const;
