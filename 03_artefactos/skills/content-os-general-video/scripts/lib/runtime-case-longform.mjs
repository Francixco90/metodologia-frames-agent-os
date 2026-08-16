import {createHash} from 'node:crypto';
import {
  closeSync, constants, existsSync, fsyncSync, lstatSync, openSync, realpathSync,
  statSync, writeFileSync,
} from 'node:fs';
import {basename, dirname, relative, resolve, sep} from 'node:path';

import {
  command, fail, json, load, loadState, project, projectPath, runtimeDir, shaFile, statePath, write,
} from './runtime-core.mjs';
import {validateSchema} from './schema-validation.mjs';

const BLOCKED = ['ingest', 'index', 'script', 'render', 'package'];
const CHECKS = ['TEXT_FIDELITY', 'FRAME_TIMING', 'LAYOUT_GEOMETRY', 'SINGLE_LAYER', 'BOUNDARY_CONTINUITY'];
const schema = (value, label) => validateSchema('case-longform-adapter-v1.schema.json', value, label, fail);
const objectSha = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex');

function canonicalFile(path, label) {
  if (!existsSync(path) || lstatSync(path).isSymbolicLink() || !lstatSync(path).isFile())
    fail(`UNSAFE_${label}_REF`);
  const canonical = realpathSync(path);
  const stat = statSync(canonical);
  return {path: canonical, identity: `${stat.dev}:${stat.ino}`};
}
function canonicalExisting(ref, label) {
  return canonicalFile(projectPath(ref, `${label}_REF`), label);
}
function readBound(value, label) {
  const bound = canonicalExisting(value.ref, label);
  if (shaFile(bound.path) !== value.sha256) fail(`HASH_DRIFT_${label}`);
  if (statSync(bound.path).size !== value.bytes) fail(`BYTES_DRIFT_${label}`);
  return {...bound, value: load(bound.path, label)};
}
function validateStatus(contract) {
  const pre = contract.v4_status === 'PRE_RENDER_BLOCKED';
  const expected = [
    ['v7a_status', pre ? 'PRE_RENDER_BLOCKED' : 'BLOCKED_PENDING_CAPTION_MATERIAL_LEDGER_CONTRACTS'],
    ['v7b_status', pre ? 'PRE_RENDER_BLOCKED' : 'BLOCKED_PENDING_CAPTION_VISUAL_EVIDENCE_CONTRACTS'],
    ['status', pre ? 'PRE_RENDER_BLOCKED' : 'BLOCKED_PENDING_V7C_FULL_CHAIN_FIXTURE_AND_CAPTION_VISUAL_EVIDENCE_CONTRACTS'],
  ];
  if (expected.some(([key, value]) => contract[key] !== value)) fail('CASE_LONGFORM_STATUS_PROJECTION_DRIFT');
  if (new Set(Object.values(contract.review_actors)).size !== 3) fail('CASE_LONGFORM_REVIEW_ACTOR_ALIAS');
  const refs = Object.values(contract.artifacts).map(({ref}) => ref);
  if (new Set(refs).size !== refs.length) fail('CASE_LONGFORM_CONTRACT_REF_ALIAS');
}
function validateLedger(ledger, contract) {
  let previous = null;
  for (const [index, entry] of ledger.entries.entries()) {
    const {entry_sha256: declared, ...unsigned} = entry;
    if (entry.sequence !== index || entry.end_frame < entry.start_frame ||
        entry.previous_entry_sha256 !== previous || declared !== objectSha(unsigned))
      fail('CASE_LONGFORM_LEDGER_ENTRY_DRIFT');
    previous = declared;
    for (const key of [
      'graph_sha256', 'temporal_map_sha256', 'caption_track_sha256', 'caption_cleanup_sha256',
      'layout_authority_sha256', 'compositor_authority_sha256', 'compositor_executable_sha256',
      'compositor_command_sha256', 'compositor_config_sha256',
    ]) if (entry[key] !== ledger[key]) fail('CASE_LONGFORM_LEDGER_ENTRY_BINDING_DRIFT');
  }
  if (ledger.chain_sha256 !== previous) fail('CASE_LONGFORM_LEDGER_CHAIN_HASH_DRIFT');
  const a = contract.artifacts;
  const bindings = [
    ['placement_plan_sha256', 'caption_placement_plan'], ['graph_sha256', 'operation_graph'],
    ['temporal_map_sha256', 'temporal_map'], ['caption_track_sha256', 'caption_track'],
    ['caption_cleanup_sha256', 'caption_cleanup'], ['layout_authority_sha256', 'caption_layout_authority'],
    ['compositor_authority_sha256', 'caption_compositor_authority'],
  ];
  if (ledger.job_id !== contract.job_id || ledger.source_set_sha256 !== contract.source_set_sha256 ||
      bindings.some(([key, artifact]) => ledger[key] !== a[artifact].sha256))
    fail('CASE_LONGFORM_LEDGER_CONTRACT_BINDING_DRIFT');
}
function expectedReview(contract, ledger) {
  const a = contract.artifacts;
  return {
    schema_version: 'case-longform-caption-external-review-plan-v1', kind: 'caption_external_review_plan',
    plan_scope: 'PLANNING_ONLY_NO_OUTCOME', actor_id: contract.review_actors.planner,
    job_id: contract.job_id, source_set_sha256: contract.source_set_sha256,
    graph_sha256: a.operation_graph.sha256, temporal_map_sha256: a.temporal_map.sha256,
    caption_track_sha256: a.caption_track.sha256, caption_cleanup_sha256: a.caption_cleanup.sha256,
    placement_plan_sha256: a.caption_placement_plan.sha256,
    execution_ledger_sha256: a.caption_execution_ledger.sha256,
    layout_authority_sha256: a.caption_layout_authority.sha256,
    compositor_authority_sha256: a.caption_compositor_authority.sha256,
    caption_verifier_authority_sha256: a.caption_verifier_authority.sha256,
    reviewers: [
      {role: 'CAPTION_VERIFIER', actor_id: contract.review_actors.caption_verifier},
      {role: 'GUARDIAN', actor_id: contract.review_actors.guardian},
    ], checks: CHECKS,
    tasks: ledger.entries.flatMap((entry) => CHECKS.map((check, index) => ({
      task_id: `${entry.sequence}.${check.toLowerCase()}`, sequence: entry.sequence * CHECKS.length + index,
      ledger_sequence: entry.sequence, check, caption_entry_sha256: entry.entry_sha256,
      cue_id: entry.cue_id, layout_id: entry.layout_id, start_frame: entry.start_frame,
      end_frame: entry.end_frame, text_sha256: entry.text_sha256, font_sha256: entry.font_sha256,
      geometry: entry.geometry,
    }))),
  };
}
function authorityFor(state) {
  const stateBound = canonicalExisting(relative(project, statePath), 'STATE');
  const adapterBound = canonicalExisting(state.caseLongformAdapterRef, 'CASE_LONGFORM_ADAPTER');
  if (shaFile(adapterBound.path) !== state.caseLongformAdapterSha256) fail('HASH_DRIFT_CASE_LONGFORM_ADAPTER');
  const adapter = load(adapterBound.path, 'CASE_LONGFORM_ADAPTER');
  schema(adapter, 'CASE_LONGFORM_ADAPTER');
  const contract = readBound(adapter.authority.contract, 'CASE_LONGFORM_CONTRACT');
  const ledger = readBound(adapter.authority.executionLedger, 'CASE_LONGFORM_LEDGER');
  const review = readBound(adapter.authority.externalReviewPlan, 'CASE_LONGFORM_REVIEW_PLAN');
  const inputs = [stateBound, adapterBound, contract, ledger, review];
  if (new Set(inputs.map(({identity}) => identity)).size !== inputs.length) fail('CASE_LONGFORM_REF_ALIAS');
  const denied = (adapter.doNotUseRefs ?? []).map((ref, index) => canonicalExisting(ref, `DO_NOT_USE_${index}`));
  if (new Set(denied.map(({identity}) => identity)).size !== denied.length ||
      denied.some(({identity}) => inputs.some((input) => input.identity === identity)))
    fail('CASE_LONGFORM_DO_NOT_USE');
  schema({contract: contract.value, ledger: ledger.value, reviewPlan: review.value}, 'CASE_LONGFORM_AUTHORITY');
  validateStatus(contract.value);
  validateLedger(ledger.value, contract.value);
  if (json(review.value) !== json(expectedReview(contract.value, ledger.value))) fail('CASE_LONGFORM_REVIEW_PLAN_DRIFT');
  const a = adapter.authority;
  if (contract.value.job_id !== a.jobId || ledger.value.job_id !== a.jobId || review.value.job_id !== a.jobId ||
      contract.value.source_set_sha256 !== a.sourceSetSha256 || ledger.value.source_set_sha256 !== a.sourceSetSha256 ||
      review.value.source_set_sha256 !== a.sourceSetSha256 || contract.value.status !== a.status ||
      contract.value.coverage_gap !== adapter.coverageGap) fail('CASE_LONGFORM_STATUS_OR_BINDING_DRIFT');
  if (json(contract.value.artifacts.caption_execution_ledger) !== json(a.executionLedger) ||
      json(contract.value.artifacts.caption_external_review_plan) !== json(a.externalReviewPlan) ||
      review.value.execution_ledger_sha256 !== a.executionLedger.sha256) fail('CASE_LONGFORM_REF_HASH_DRIFT');
  return {adapter, adapterSha256: shaFile(adapterBound.path), inputs, denied};
}
function planPathFor(ref, bound, mustExist) {
  const lexical = projectPath(ref, 'CASE_LONGFORM_PLAN');
  const runtime = realpathSync(runtimeDir);
  if (!existsSync(dirname(lexical)) || realpathSync(dirname(lexical)) !== runtime)
    fail('CASE_LONGFORM_PLAN_OUTSIDE_RUNTIME');
  const candidate = resolve(runtime, basename(lexical));
  const rel = relative(runtime, candidate);
  if (!rel || rel === '..' || rel.startsWith(`..${sep}`)) fail('CASE_LONGFORM_PLAN_OUTSIDE_RUNTIME');
  if (existsSync(candidate)) {
    const existing = canonicalFile(candidate, 'CASE_LONGFORM_PLAN');
    if ([...bound.inputs, ...bound.denied].some(({identity}) => identity === existing.identity))
      fail('CASE_LONGFORM_PLAN_INPUT_ALIAS');
  }
  if (!mustExist && existsSync(candidate)) fail('CASE_LONGFORM_PLAN_OVERWRITE');
  return mustExist ? canonicalFile(candidate, 'CASE_LONGFORM_PLAN').path : candidate;
}
function secureWrite(path, value) {
  let fd;
  try {
    fd = openSync(path, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW, 0o600);
    writeFileSync(fd, json(value)); fsyncSync(fd);
  } catch (error) { fail(`CASE_LONGFORM_PLAN_OPEN ${error.code ?? error.message}`); }
  finally { if (fd !== undefined) closeSync(fd); }
}
function expectedPlan(state, {adapter, adapterSha256}) {
  return {
    schemaVersion: 'general-video-case-longform-plan-v1', kind: 'case_longform_plan_verify_bridge',
    archetype: 'case-longform', mode: 'PLAN_VERIFY_ONLY', authority: {
      adapterSha256, contractSha256: adapter.authority.contract.sha256,
      executionLedgerSha256: adapter.authority.executionLedger.sha256,
      externalReviewPlanSha256: adapter.authority.externalReviewPlan.sha256,
      jobId: adapter.authority.jobId, sourceSetSha256: adapter.authority.sourceSetSha256,
      status: adapter.authority.status,
    }, allowedCommands: ['plan', 'verify'], blockedCommands: BLOCKED, maximumState: 'BLOCKED',
    effects: false, coverageGap: adapter.coverageGap, planRef: state.planRef,
  };
}
export function runCaseLongformBridge() {
  const state = loadState({allowV1: true});
  if (state.archetype !== 'case-longform') return false;
  if (state.schemaVersion !== 'general-video-v2' || state.contractRevision !== 2)
    fail('CASE_LONGFORM_MIGRATION_REQUIRED');
  if (BLOCKED.includes(command) || !['plan', 'verify'].includes(command)) fail(`CASE_LONGFORM_COMMAND_BLOCKED_${command}`);
  const bound = authorityFor(state); const expected = expectedPlan(state, bound);
  if (command === 'plan') {
    const path = planPathFor(state.planRef, bound, false); secureWrite(path, expected);
    write(statePath, {...state, caseLongformPlanSha256: shaFile(path), workProductState: 'BLOCKED'});
    console.log(`PASS case-longform plan: ${bound.adapter.authority.status}; effects=false`); return true;
  }
  const path = planPathFor(state.planRef, bound, true);
  if (shaFile(path) !== state.caseLongformPlanSha256) fail('HASH_DRIFT_CASE_LONGFORM_PLAN');
  if (json(load(path, 'CASE_LONGFORM_PLAN')) !== json(expected)) fail('CASE_LONGFORM_PLAN_DRIFT');
  console.log(`PASS case-longform verify: ${bound.adapter.authority.status}; maximum=BLOCKED`); return true;
}
