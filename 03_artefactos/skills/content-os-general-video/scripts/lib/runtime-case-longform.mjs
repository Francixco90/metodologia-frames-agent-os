import {
  command,
  fail,
  json,
  load,
  loadState,
  projectPath,
  refWithHash,
  shaFile,
  statePath,
  statSync,
  write,
} from './runtime-core.mjs';
import {validateSchema} from './schema-validation.mjs';

const BLOCKED = new Set(['ingest', 'index', 'script', 'render', 'package']);
const FORBIDDEN_OUTCOMES = new Set([
  'observation',
  'evidence',
  'verdict',
  'receipt',
  'media',
  'render',
  'effects',
]);

function containsOutcome(value) {
  if (Array.isArray(value)) return value.some(containsOutcome);
  if (!value || typeof value !== 'object') return false;
  return Object.entries(value).some(
    ([key, child]) => FORBIDDEN_OUTCOMES.has(key) || containsOutcome(child),
  );
}

function readBound(ref, label) {
  const path = refWithHash(ref.ref, ref.sha256, label);
  if (statSync(path).size !== ref.bytes) fail(`BYTES_DRIFT_${label}`);
  return {path, value: load(path, label)};
}

function authorityFor(state) {
  const adapterPath = refWithHash(
    state.caseLongformAdapterRef,
    state.caseLongformAdapterSha256,
    'CASE_LONGFORM_ADAPTER',
  );
  const adapter = load(adapterPath, 'CASE_LONGFORM_ADAPTER');
  validateSchema('case-longform-adapter-v1.schema.json', adapter, 'CASE_LONGFORM_ADAPTER', fail);
  const refs = [
    state.caseLongformAdapterRef,
    adapter.authority.contract.ref,
    adapter.authority.executionLedger.ref,
    adapter.authority.externalReviewPlan.ref,
  ];
  if (new Set(refs).size !== refs.length) fail('CASE_LONGFORM_REF_ALIAS');
  if (refs.some((ref) => adapter.doNotUseRefs?.includes(ref))) fail('CASE_LONGFORM_DO_NOT_USE');
  const contract = readBound(adapter.authority.contract, 'CASE_LONGFORM_CONTRACT').value;
  const ledger = readBound(adapter.authority.executionLedger, 'CASE_LONGFORM_LEDGER').value;
  const plan = readBound(adapter.authority.externalReviewPlan, 'CASE_LONGFORM_REVIEW_PLAN').value;
  const a = adapter.authority;
  if (
    contract.schema_version !== 'case-longform-caption-review-plan-contract-v7c0' ||
    ledger.schema_version !== 'case-longform-caption-execution-ledger-v1' ||
    ledger.execution_scope !== 'CAPTION_DATA_GRAPH_ONLY' ||
    plan.schema_version !== 'case-longform-caption-external-review-plan-v1' ||
    plan.plan_scope !== 'PLANNING_ONLY_NO_OUTCOME'
  )
    fail('CASE_LONGFORM_SCHEMA_DRIFT');
  if (
    contract.job_id !== a.jobId ||
    ledger.job_id !== a.jobId ||
    plan.job_id !== a.jobId ||
    contract.source_set_sha256 !== a.sourceSetSha256 ||
    ledger.source_set_sha256 !== a.sourceSetSha256 ||
    plan.source_set_sha256 !== a.sourceSetSha256 ||
    contract.status !== a.status ||
    contract.coverage_gap !== adapter.coverageGap
  )
    fail('CASE_LONGFORM_STATUS_OR_BINDING_DRIFT');
  if (
    json(contract.artifacts?.caption_execution_ledger) !== json(a.executionLedger) ||
    json(contract.artifacts?.caption_external_review_plan) !== json(a.externalReviewPlan) ||
    plan.execution_ledger_sha256 !== a.executionLedger.sha256
  )
    fail('CASE_LONGFORM_REF_HASH_DRIFT');
  if (containsOutcome(contract) || containsOutcome(ledger) || containsOutcome(plan))
    fail('CASE_LONGFORM_OUTCOME_OR_EFFECT');
  return {adapter, adapterSha256: shaFile(adapterPath)};
}

function expectedPlan(state, bound) {
  const {adapter, adapterSha256} = bound;
  return {
    schemaVersion: 'general-video-case-longform-plan-v1',
    kind: 'case_longform_plan_verify_bridge',
    archetype: 'case-longform',
    mode: 'PLAN_VERIFY_ONLY',
    authority: {
      adapterSha256,
      contractSha256: adapter.authority.contract.sha256,
      executionLedgerSha256: adapter.authority.executionLedger.sha256,
      externalReviewPlanSha256: adapter.authority.externalReviewPlan.sha256,
      jobId: adapter.authority.jobId,
      sourceSetSha256: adapter.authority.sourceSetSha256,
      status: adapter.authority.status,
    },
    allowedCommands: ['plan', 'verify'],
    blockedCommands: [...BLOCKED],
    maximumState: 'BLOCKED',
    effects: false,
    coverageGap: adapter.coverageGap,
    planRef: state.planRef,
  };
}

export function runCaseLongformBridge() {
  const state = loadState({allowV1: true});
  if (state.archetype !== 'case-longform') return false;
  if (BLOCKED.has(command) || !['plan', 'verify'].includes(command))
    fail(`CASE_LONGFORM_COMMAND_BLOCKED_${command}`);
  const bound = authorityFor(state);
  const expected = expectedPlan(state, bound);
  const planPath = projectPath(state.planRef, 'CASE_LONGFORM_PLAN');
  if (command === 'plan') {
    write(planPath, expected);
    write(statePath, {
      ...state,
      caseLongformPlanSha256: shaFile(planPath),
      workProductState: 'BLOCKED',
    });
    console.log(`PASS case-longform plan: ${bound.adapter.authority.status}; effects=false`);
    return true;
  }
  const planPathBound = refWithHash(
    state.planRef,
    state.caseLongformPlanSha256,
    'CASE_LONGFORM_PLAN',
  );
  if (json(load(planPathBound, 'CASE_LONGFORM_PLAN')) !== json(expected))
    fail('CASE_LONGFORM_PLAN_DRIFT');
  console.log(`PASS case-longform verify: ${bound.adapter.authority.status}; maximum=BLOCKED`);
  return true;
}
