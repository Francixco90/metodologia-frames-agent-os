import {
  VIDEO_OS_CHAIN,
  VIDEO_OS_CONTEXT_BUDGETS,
  VIDEO_OS_DEFAULT_DOCUMENTS,
  VIDEO_OS_USER_PROMPT_CHAIN,
  assertVideoOsState,
  planVideoOs,
  validateVideoOsJob,
} from '../../02_proceso/workflows/video-os/index.ts';
import {
  HASH_A,
  HASH_B,
  createVideoOsCheckIo,
  makeVideoOsCheckState,
  makeVideoOsVerificationReceipt,
  mustRejectVideoOsState,
} from './lib/video-os-checks.ts';

const ROOT = process.cwd();
const errors: string[] = [];
const {check, read, readJson} = createVideoOsCheckIo(ROOT, errors);

const request = {
  request: 'Crear un reel de evidencia con fuentes autorizadas',
  sourceRefs: ['work/private/video-os/synthetic-source.mp4'],
  sourceAuthority: 'verified' as const,
  rights: 'cleared' as const,
};
const plan = planVideoOs(request);
check(JSON.stringify(plan) === JSON.stringify(planVideoOs(request)), 'VIDEO-OS-DET-001 plan drift');
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

const state = makeVideoOsCheckState();
const verificationReceipt = makeVideoOsVerificationReceipt(state);

try {
  validateVideoOsJob({schema_version: 'video-os-job-v1', plan, state});
} catch (error) {
  errors.push(`VIDEO-OS-JOB-001 ${String(error)}`);
}

const mustReject = (candidate: typeof state, code: string, expected: RegExp): void =>
  mustRejectVideoOsState(candidate, code, expected, errors, assertVideoOsState);
mustReject({...state, manifest_spec_sha256: HASH_B}, 'VIDEO-OS-MANIFEST-001', /STALE-MANIFEST/u);
mustReject(
  {...state, secondary_exports_requested: ['16:9']},
  'VIDEO-OS-EXPORT-001',
  /PRIMARY-PASS-REQUIRED/u,
);
mustReject(
  {
    ...state,
    status: 'HUMAN_APPROVED',
    active_stage: 'V04',
    primary_verification: 'PASS',
    primary_verification_receipt: verificationReceipt,
  },
  'VIDEO-OS-HUMAN-001',
  /HUMAN-APPROVAL-RECEIPT-REQUIRED/u,
);
mustReject(
  {...state, verifier_actor_id: state.producer_actor_id},
  'VIDEO-OS-ACTOR-001',
  /ACTORS-MUST-BE-DISTINCT/u,
);
mustReject({...state, visual_evidence: null}, 'VIDEO-OS-VISUAL-001', /VISUAL-EVIDENCE-REQUIRED/u);

const archetypes = readJson<{
  defaults: {
    privacy: {mode: string; mask_strategy: string; persistent_plate: boolean};
    human_intro: {motion_required: boolean; freeze_frame_allowed: boolean};
    brand: string;
    automatic_terminal_state: string;
  };
}>('02_proceso/workflows/video-os/_assets/archetypes.json');
check(archetypes.defaults.brand === 'MetodologIA', 'VIDEO-OS-BRAND-001 identity drift');
check(
  archetypes.defaults.privacy.mode === 'light' &&
    archetypes.defaults.privacy.mask_strategy === 'field-level' &&
    !archetypes.defaults.privacy.persistent_plate,
  'VIDEO-OS-PRIVACY-002 archetype privacy drift',
);
check(
  archetypes.defaults.human_intro.motion_required &&
    !archetypes.defaults.human_intro.freeze_frame_allowed,
  'VIDEO-OS-MOTION-002 archetype motion drift',
);

const regressions = readJson<{
  cases: Array<{id: string; expected: string}>;
}>('02_proceso/workflows/video-os/_assets/regressions.json');
const documentSections = readJson<{
  documents: Record<string, string[]>;
}>('02_proceso/workflows/video-os/_assets/document-sections.json');
check(
  Object.keys(documentSections.documents).length === VIDEO_OS_DEFAULT_DOCUMENTS.length &&
    VIDEO_OS_DEFAULT_DOCUMENTS.every((document) =>
      Object.prototype.hasOwnProperty.call(documentSections.documents, document),
    ),
  'VIDEO-OS-DOCS-002 section registry must cover every standard document',
);
const requiredRegressions = [
  'REG-MOTION-001',
  'REG-PRIVACY-001',
  'REG-PRIVACY-002',
  'REG-SPEAKER-001',
  'REG-SOURCE-001',
  'REG-MANIFEST-001',
  'REG-EXPORT-001',
];
const regressionIds = new Set(regressions.cases.map(({id}) => id));
check(
  requiredRegressions.every((id) => regressionIds.has(id)),
  'VIDEO-OS-REGRESSION-001 missing regression',
);
check(
  regressions.cases.every(({expected}) => expected === 'BLOCKED'),
  'VIDEO-OS-REGRESSION-002 regressions must fail closed',
);

for (const file of ['INSTRUCTIONS.md', 'STATE.md', 'VERIFICATION.md', 'SCOPE.md', 'LIFECYCLE.md']) {
  const body = read(`02_proceso/workflows/video-os/${file}`);
  check(
    body.includes('Este sistema convierte intención en resultados por procesos auto orquestado.'),
    `VIDEO-OS-HARNESS-001 ${file} missing self-orchestration preamble`,
  );
}
const runner = read('02_proceso/workflows/video-os/_runner/video-os.ts');
check(
  !/\b(?:Date\.now|Math\.random|fetch|setTimeout|setInterval)\s*\(/u.test(runner),
  'VIDEO-OS-DET-002 nondeterministic or network primitive in runner',
);
const architecture = read('01_intencion/video-os/ARCHITECTURE.md');
check(
  /Spec[^\n]*Compile[^\n]*Verify[^\n]*Review[^\n]*Promote/iu.test(architecture),
  'VIDEO-OS-SPEC-001 canonical sequence missing',
);
check(
  !/publication_authority\s*[:=]\s*true/iu.test(architecture),
  'VIDEO-OS-PUBLISH-001 publication authority forbidden',
);

if (errors.length > 0) {
  for (const error of errors) process.stderr.write(`[FAIL] ${error}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(
    `[PASS] Video OS: ${VIDEO_OS_CHAIN.length} stages, ${VIDEO_OS_USER_PROMPT_CHAIN.length} prompts, ${VIDEO_OS_DEFAULT_DOCUMENTS.length} standard artifacts, ${regressions.cases.length} fail-closed regressions.\n`,
  );
}
