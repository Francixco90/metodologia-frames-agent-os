import {
  VIDEO_OS_CHAIN,
  VIDEO_OS_DEFAULT_DOCUMENTS,
  VIDEO_OS_USER_PROMPT_CHAIN,
  assertVideoOsState,
  validateVideoOsJob,
} from '../../02_proceso/workflows/video-os/index.ts';
import {checkMethodExplainerMaterial} from './lib/method-explainer-material-check.ts';
import {checkVideoOsPlans} from './lib/method-explainer-plan-checks.ts';
import {checkMethodExplainerStatics} from './lib/method-explainer-static-checks.ts';
import {
  HASH_B,
  createVideoOsCheckIo,
  makeVideoOsCheckState,
  makeVideoOsVerificationReceipt,
  mustRejectVideoOsState,
} from './lib/video-os-checks.ts';

const ROOT = process.cwd();
const errors: string[] = [];
const {check, read, readJson} = createVideoOsCheckIo(ROOT, errors);

const plan = checkVideoOsPlans(check);
await checkMethodExplainerMaterial(check, errors);

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

const regressionCount = checkMethodExplainerStatics(check, read, readJson);

if (errors.length > 0) {
  for (const error of errors) process.stderr.write(`[FAIL] ${error}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(
    `[PASS] Video OS: ${VIDEO_OS_CHAIN.length} stages, ${VIDEO_OS_USER_PROMPT_CHAIN.length} prompts, ${VIDEO_OS_DEFAULT_DOCUMENTS.length} standard artifacts, ${regressionCount} fail-closed regressions.\n`,
  );
}
