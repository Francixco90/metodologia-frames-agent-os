import {
  METHOD_EXPLAINER_OUTPUT_REFS,
  VIDEO_OS_CHAIN,
  VIDEO_OS_CONTEXT_BUDGETS,
  VIDEO_OS_DEFAULT_DOCUMENTS,
  VIDEO_OS_USER_PROMPT_CHAIN,
  planVideoOs,
} from '../../../02_proceso/workflows/video-os/index.ts';

type Check = (condition: boolean, message: string) => void;

export const checkVideoOsPlans = (check: Check) => {
  const request = {
    request: 'Crear un reel de evidencia con fuentes autorizadas',
    sourceRefs: ['fixtures/video-os/synthetic-source.mp4'],
    sourceAuthority: 'verified' as const,
    rights: 'cleared' as const,
  };
  const plan = planVideoOs(request);
  check(
    JSON.stringify(plan) === JSON.stringify(planVideoOs(request)),
    'VIDEO-OS-DET-001 plan drift',
  );
  check(VIDEO_OS_CHAIN.length === 5, 'VIDEO-OS-CHAIN-001 expected V00-V04');
  check(
    VIDEO_OS_USER_PROMPT_CHAIN.length >= 3 && VIDEO_OS_USER_PROMPT_CHAIN.length <= 5,
    'VIDEO-OS-PROMPT-001 human chain must use 3-5 prompts',
  );
  check(
    VIDEO_OS_USER_PROMPT_CHAIN.length === plan.prompt_budget.target,
    'VIDEO-OS-PROMPT-002 prompt chain must equal target',
  );
  check(
    VIDEO_OS_CONTEXT_BUDGETS.maxTokensPerStage <= 1_800,
    'VIDEO-OS-CONTEXT-001 context capsule exceeds budget',
  );
  check(plan.blocking_questions.length <= 3, 'VIDEO-OS-INTAKE-001 too many blocking questions');
  check(
    JSON.stringify(plan.standard_artifacts) === JSON.stringify(VIDEO_OS_DEFAULT_DOCUMENTS),
    'VIDEO-OS-DOCS-001 plan/default document drift',
  );
  check(
    plan.defaults.privacy_mode === 'light' &&
      plan.defaults.privacy_strategy === 'field-level' &&
      plan.defaults.persistent_privacy_plate === false,
    'VIDEO-OS-PRIVACY-001 expected light field-level privacy',
  );
  check(
    plan.defaults.human_intro_motion_required && !plan.defaults.freeze_frame_allowed,
    'VIDEO-OS-MOTION-001 speaker intro must preserve motion',
  );
  check(
    plan.defaults.automatic_terminal_state === 'RENDERED_DRAFT',
    'VIDEO-OS-STATE-001 automatic promotion forbidden',
  );

  const input = {
    request: 'Explicar PASA en un reel vertical',
    sourceRefs: ['sources/pasa-authority.md'],
    sourceAuthority: 'verified' as const,
    rights: 'cleared' as const,
  };
  const methodPlan = planVideoOs(input);
  const expectedArtifacts = [
    'source-pack.yml',
    'intent-envelope.json',
    'assumptions-ledger.json',
    'method-content-model.json',
    'video-spec.json',
    'socratic-debate.md',
    'beat-budget.json',
    'diagram-contract.json',
    'piece-scripts.json',
    'caption-track.json',
    'storyboard.yml',
    'asset-manifest.yml',
    'render-plan.json',
    'unattended-run-state.json',
    'verification.json',
    'receipts/index.json',
    'contact-sheet.png',
    'review-report.md',
    'handoff.md',
    'audio/narration.wav',
    'renders/render-a.mp4',
    'renders/render-b.mp4',
    'renders/metodologia-method-explainer.mp4',
  ];
  check(
    JSON.stringify(methodPlan) === JSON.stringify(planVideoOs(input)),
    'VIDEO-OS-METHOD-DET-001 method plan drift',
  );
  check(
    methodPlan.archetype === 'method-explainer' &&
      methodPlan.primary_format === '9:16' &&
      methodPlan.next_gate === 'VO_DIRECTION_APPROVED',
    'VIDEO-OS-METHOD-ROUTE-001 PASA must route to the vertical method explainer',
  );
  check(
    methodPlan.defaults.source_audio === 'none' &&
      methodPlan.defaults.automatic_terminal_state === 'RENDERED_DRAFT',
    'VIDEO-OS-METHOD-DEFAULTS-001 method defaults drift',
  );
  check(
    JSON.stringify(methodPlan.standard_artifacts) === JSON.stringify(expectedArtifacts),
    'VIDEO-OS-METHOD-ARTIFACTS-001 method artifact set drift',
  );
  check(
    JSON.stringify(methodPlan.standard_artifacts) ===
      JSON.stringify(Object.values(METHOD_EXPLAINER_OUTPUT_REFS)),
    'VIDEO-OS-METHOD-ARTIFACTS-002 method plan/output registry drift',
  );
  check(
    planVideoOs({request: 'Explicar PASA', archetype: 'reel-evidence'}).archetype ===
      'reel-evidence',
    'VIDEO-OS-METHOD-OVERRIDE-001 explicit override must win',
  );
  check(
    planVideoOs({request: 'Crear un video de Marco Antonio'}).archetype === 'case-longform',
    'VIDEO-OS-METHOD-CLASSIFIER-001 person name must not trigger method explainer',
  );
  check(
    planVideoOs({request: 'PASA'}).archetype === 'case-longform' &&
      planVideoOs({request: 'Crear PASA para explicar el modelo'}).archetype === 'method-explainer',
    'VIDEO-OS-METHOD-CLASSIFIER-002 PASA requires explanatory or creation intent',
  );
  check(
    planVideoOs({request: 'Explica cómo pasa la información'}).archetype === 'case-longform',
    'VIDEO-OS-METHOD-CLASSIFIER-003 ordinary use of pasa must not route as a method',
  );
  const incompatible = planVideoOs({...input, primaryFormat: '16:9' as const});
  check(
    incompatible.decision === 'BLOCKED' &&
      incompatible.primary_format === '9:16' &&
      incompatible.next_gate === 'VO_INTAKE_COMPLETE',
    'VIDEO-OS-METHOD-FORMAT-001 incompatible format must block at intake',
  );
  return plan;
};
