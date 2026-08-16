#!/usr/bin/env node
import {createHash} from 'node:crypto';
// prettier-ignore
import {appendFileSync, closeSync, constants, existsSync, fstatSync, fsyncSync, lstatSync, mkdirSync, openSync, readFileSync, realpathSync, renameSync, statSync, unlinkSync, writeFileSync} from 'node:fs';
import {basename, dirname, isAbsolute, normalize, relative, resolve, sep} from 'node:path';

import {validateSchema} from './lib/schema-validation.mjs';

const BLOCKED = ['ingest', 'index', 'script', 'render', 'package'];
const CHECKS = ['TEXT_FIDELITY', 'FRAME_TIMING', 'LAYOUT_GEOMETRY', 'SINGLE_LAYER', 'BOUNDARY_CONTINUITY'];
const arg = (name, fallback) => { const at = process.argv.indexOf(`--${name}`); return at < 0 ? fallback : process.argv[at + 1]; };
const fail = (message, code = 1) => { console.error(`COSR-GV_${message}`); process.exit(code); };
const canonical = (value) => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])])) : value;
const json = (value) => `${JSON.stringify(canonical(value), null, 2)}\n`;
const sha = (value) => createHash('sha256').update(value).digest('hex');
const schema = (value, label) => validateSchema('case-longform-adapter-v1.schema.json', value, label, fail);
const command = process.argv[2];
const project = realpathSync(resolve(arg('project', '.')));

function safePath(ref, label) {
  if (!ref || typeof ref !== 'string' || isAbsolute(ref) || ref.includes('\\') || ref.includes('\0') ||
      normalize(ref) !== ref || ref.split('/').some((part) => part === '.' || part === '..')) fail(`UNSAFE_${label}_REF ${ref}`);
  const path = resolve(project, ref); const rel = relative(project, path);
  if (!rel || rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) fail(`OUTSIDE_PROJECT_${label}_REF`);
  let cursor = project;
  for (const part of rel.split(sep)) { cursor = resolve(cursor, part); if (existsSync(cursor) && lstatSync(cursor).isSymbolicLink()) fail(`SYMLINK_${label}_REF`); }
  return path;
}
const statSame = (a, b) => ['dev', 'ino', 'size', 'mtimeMs', 'ctimeMs'].every((key) => a[key] === b[key]);
function testHook(label, path) {
  if (process.env.METODOLOGIA_TOOLCHAIN_PROFILE !== 'ci-code-only') return;
  const hook = process.env.METODOLOGIA_CASE_LONGFORM_TEST_HOOK;
  if (hook === `swap:${label}`) renameSync(`${path}.swap`, path);
  if (hook === `mutate:${label}`) appendFileSync(path, ' ');
}
function openOnce(path, label, declared = {}, parseJson = true) {
  let fd;
  try {
    fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
    const before = fstatSync(fd); if (!before.isFile()) fail(`UNSAFE_${label}_TYPE`);
    const buffer = readFileSync(fd); testHook(label, path); const after = fstatSync(fd);
    const physical = lstatSync(path); const canonicalPath = realpathSync(path); const current = statSync(canonicalPath);
    if (physical.isSymbolicLink() || !statSame(before, after) || before.dev !== current.dev || before.ino !== current.ino)
      fail(`TOCTOU_${label}`);
    if (declared.sha256 !== undefined && declared.sha256 !== sha(buffer)) fail(`HASH_DRIFT_${label}`);
    if (declared.bytes !== undefined && declared.bytes !== buffer.length) fail(`BYTES_DRIFT_${label}`);
    let value = buffer;
    if (parseJson) { try { value = JSON.parse(buffer.toString('utf8')); } catch (error) { fail(`INVALID_JSON_${label} ${error.message}`); } }
    return {path: canonicalPath, identity: `${before.dev}:${before.ino}`, value, buffer};
  } catch (error) { fail(`${error.code ?? `OPEN_${label}`} ${error.message ?? ''}`); }
  finally { if (fd !== undefined) closeSync(fd); }
}
function input(ref, label, declared = {}, parseJson = true) { return openOnce(safePath(ref, label), label, declared, parseJson); }
function identity(ref, label) {
  const path = safePath(ref, label);
  if (!existsSync(path) || lstatSync(path).isSymbolicLink() || !lstatSync(path).isFile()) fail(`UNSAFE_${label}_TYPE`);
  const canonicalPath = realpathSync(path); const current = statSync(canonicalPath);
  return {path: canonicalPath, identity: `${current.dev}:${current.ino}`};
}
function authorityRoot(value, label) {
  if (!isAbsolute(value) || normalize(value) !== value || !existsSync(value) || lstatSync(value).isSymbolicLink() || realpathSync(value) !== value || !statSync(value).isDirectory())
    fail(`CASE_LONGFORM_${label}_ROOT_NOT_CANONICAL`);
  return value;
}
const overlaps = (a, b) => { const rel = relative(a, b); return rel === '' || (!rel.startsWith(`..${sep}`) && !isAbsolute(rel)); };
function validatePure(contract, ledger, review, adapter) {
  const planned = authorityRoot(contract.planned_review_authority_root, 'PLANNED');
  const priors = contract.prior_authority_roots.map((root, index) => authorityRoot(root, `PRIOR_${index}`));
  if (priors.some((root) => overlaps(planned, root) || overlaps(root, planned))) fail('CASE_LONGFORM_ROOT_OVERLAP');
  const reviewers = Object.values(contract.review_actors);
  const priorActors = [...Object.values(contract.caption_actors), ...adapter.reviewTrust.priorActorIds];
  const trust = adapter.reviewTrust;
  if (new Set(reviewers).size !== reviewers.length || reviewers.some((actor) => priorActors.includes(actor)) ||
      !trust.trustedPlannerActorIds.includes(contract.review_actors.planner) ||
      !trust.trustedCaptionVerifierActorIds.includes(contract.review_actors.caption_verifier) ||
      !trust.trustedGuardianActorIds.includes(contract.review_actors.guardian)) fail('CASE_LONGFORM_REVIEW_ACTOR_DRIFT');
  const pre = contract.v4_status === 'PRE_RENDER_BLOCKED';
  if (contract.v7a_status !== (pre ? 'PRE_RENDER_BLOCKED' : 'BLOCKED_PENDING_CAPTION_MATERIAL_LEDGER_CONTRACTS') ||
      contract.v7b_status !== (pre ? 'PRE_RENDER_BLOCKED' : 'BLOCKED_PENDING_CAPTION_VISUAL_EVIDENCE_CONTRACTS') ||
      contract.status !== (pre ? 'PRE_RENDER_BLOCKED' : 'BLOCKED_PENDING_V7C_FULL_CHAIN_FIXTURE_AND_CAPTION_VISUAL_EVIDENCE_CONTRACTS')) fail('CASE_LONGFORM_STATUS_PROJECTION_DRIFT');
  let previous = null;
  for (const [index, entry] of ledger.entries.entries()) {
    const {entry_sha256: declared, ...unsigned} = entry;
    if (entry.sequence !== index || entry.end_frame < entry.start_frame || entry.previous_entry_sha256 !== previous || declared !== sha(JSON.stringify(unsigned))) fail('CASE_LONGFORM_LEDGER_ENTRY_DRIFT');
    previous = declared;
    for (const key of ['graph_sha256', 'temporal_map_sha256', 'caption_track_sha256', 'caption_cleanup_sha256', 'layout_authority_sha256', 'compositor_authority_sha256', 'compositor_executable_sha256', 'compositor_command_sha256', 'compositor_config_sha256'])
      if (entry[key] !== ledger[key]) fail('CASE_LONGFORM_LEDGER_ENTRY_BINDING_DRIFT');
  }
  if (ledger.chain_sha256 !== previous) fail('CASE_LONGFORM_LEDGER_CHAIN_HASH_DRIFT');
}
function expectedReview(contract, ledger) {
  const a = contract.artifacts;
  return {schema_version: 'case-longform-caption-external-review-plan-v1', kind: 'caption_external_review_plan', plan_scope: 'PLANNING_ONLY_NO_OUTCOME', actor_id: contract.review_actors.planner,
    job_id: contract.job_id, source_set_sha256: contract.source_set_sha256, graph_sha256: a.operation_graph.sha256, temporal_map_sha256: a.temporal_map.sha256,
    caption_track_sha256: a.caption_track.sha256, caption_cleanup_sha256: a.caption_cleanup.sha256, placement_plan_sha256: a.caption_placement_plan.sha256,
    execution_ledger_sha256: a.caption_execution_ledger.sha256, layout_authority_sha256: a.caption_layout_authority.sha256,
    compositor_authority_sha256: a.caption_compositor_authority.sha256, caption_verifier_authority_sha256: a.caption_verifier_authority.sha256,
    reviewers: [{role: 'CAPTION_VERIFIER', actor_id: contract.review_actors.caption_verifier}, {role: 'GUARDIAN', actor_id: contract.review_actors.guardian}], checks: CHECKS,
    tasks: ledger.entries.flatMap((entry) => CHECKS.map((check, index) => ({task_id: `${entry.sequence}.${check.toLowerCase()}`, sequence: entry.sequence * CHECKS.length + index,
      ledger_sequence: entry.sequence, check, caption_entry_sha256: entry.entry_sha256, cue_id: entry.cue_id, layout_id: entry.layout_id,
      start_frame: entry.start_frame, end_frame: entry.end_frame, text_sha256: entry.text_sha256, font_sha256: entry.font_sha256, geometry: entry.geometry}))),
  };
}
function planPath(ref, records, mustExist) {
  const path = safePath(ref, 'CASE_LONGFORM_PLAN');
  if (dirname(ref) !== '.frames-video') fail('CASE_LONGFORM_PLAN_OUTSIDE_RUNTIME');
  if (existsSync(path)) {
    const record = identity(ref, 'CASE_LONGFORM_PLAN');
    if (records.some(({identity}) => identity === record.identity)) fail('CASE_LONGFORM_PLAN_INPUT_ALIAS');
  }
  if (!mustExist && existsSync(path)) fail('CASE_LONGFORM_PLAN_OVERWRITE');
  return path;
}
function secureWrite(path, value) {
  let fd; try { fd = openSync(path, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW, 0o600); writeFileSync(fd, json(value)); fsyncSync(fd); }
  catch (error) { fail(`CASE_LONGFORM_OUTPUT_OPEN ${error.code ?? error.message}`); } finally { if (fd !== undefined) closeSync(fd); }
}
function atomicState(path, original, value) {
  const current = lstatSync(path); if (current.isSymbolicLink() || `${current.dev}:${current.ino}` !== original.identity) fail('TOCTOU_STATE_WRITE');
  const temp = `${path}.${process.pid}.tmp`; try { secureWrite(temp, value); renameSync(temp, path); } catch (error) { if (existsSync(temp)) unlinkSync(temp); throw error; }
}

const stateRef = arg('state', 'workflow-state.json');
const stateRecord = input(stateRef, 'STATE'); const state = stateRecord.value;
if (state.archetype !== 'case-longform') await import('./lib/video-runtime.mjs');
else {
  if (BLOCKED.includes(command) || !['plan', 'verify'].includes(command)) fail(`CASE_LONGFORM_COMMAND_BLOCKED_${command}`);
  if (state.schemaVersion !== 'general-video-v2' || state.contractRevision !== 2) fail('CASE_LONGFORM_MIGRATION_REQUIRED');
  validateSchema('general-video-v2.schema.json', state, 'STATE', fail);
  const adapterRecord = input(state.caseLongformAdapterRef, 'CASE_LONGFORM_ADAPTER', {sha256: state.caseLongformAdapterSha256}); const adapter = adapterRecord.value; schema(adapter, 'CASE_LONGFORM_ADAPTER');
  const contractRecord = input(adapter.authority.contract.ref, 'CASE_LONGFORM_CONTRACT', adapter.authority.contract); const contract = contractRecord.value;
  const ledgerRecord = input(adapter.authority.executionLedger.ref, 'CASE_LONGFORM_LEDGER', adapter.authority.executionLedger); const ledger = ledgerRecord.value;
  const reviewRecord = input(adapter.authority.externalReviewPlan.ref, 'CASE_LONGFORM_REVIEW_PLAN', adapter.authority.externalReviewPlan); const review = reviewRecord.value;
  const inputs = [stateRecord, adapterRecord, contractRecord, ledgerRecord, reviewRecord];
  if (new Set(inputs.map(({identity}) => identity)).size !== inputs.length) fail('CASE_LONGFORM_REF_ALIAS');
  const denied = (adapter.doNotUseRefs ?? []).map((ref, index) => input(ref, `DO_NOT_USE_${index}`, {}, false));
  if (new Set(denied.map(({identity}) => identity)).size !== denied.length || denied.some(({identity}) => inputs.some((record) => record.identity === identity))) fail('CASE_LONGFORM_DO_NOT_USE');
  schema({contract, ledger, reviewPlan: review}, 'CASE_LONGFORM_AUTHORITY'); validatePure(contract, ledger, review, adapter);
  const a = adapter.authority;
  if ([contract, ledger, review].some((value) => value.job_id !== a.jobId || value.source_set_sha256 !== a.sourceSetSha256) || contract.status !== a.status || contract.coverage_gap !== adapter.coverageGap ||
      json(contract.artifacts.caption_execution_ledger) !== json(a.executionLedger) || json(contract.artifacts.caption_external_review_plan) !== json(a.externalReviewPlan)) fail('CASE_LONGFORM_AUTHORITY_BINDING_DRIFT');
  const artifacts = Object.entries(contract.artifacts).map(([key, value]) => ({key, ...identity(value.ref, `ARTIFACT_${key}`)}));
  if (new Set(artifacts.map(({identity}) => identity)).size !== artifacts.length) fail('CASE_LONGFORM_ARTIFACT_REF_ALIAS');
  if (artifacts.find(({key}) => key === 'caption_execution_ledger').identity !== ledgerRecord.identity || artifacts.find(({key}) => key === 'caption_external_review_plan').identity !== reviewRecord.identity) fail('CASE_LONGFORM_ARTIFACT_INPUT_DRIFT');
  if (json(review) !== json(expectedReview(contract, ledger))) fail('CASE_LONGFORM_REVIEW_PLAN_DRIFT');
  const records = [...inputs, ...denied, ...artifacts]; const output = planPath(state.planRef, records, command === 'verify');
  const expected = {schemaVersion: 'general-video-case-longform-plan-v1', kind: 'case_longform_plan_verify_bridge', archetype: 'case-longform', mode: 'PLAN_VERIFY_ONLY',
    authority: {adapterSha256: sha(adapterRecord.buffer), contractSha256: a.contract.sha256, executionLedgerSha256: a.executionLedger.sha256, externalReviewPlanSha256: a.externalReviewPlan.sha256, jobId: a.jobId, sourceSetSha256: a.sourceSetSha256, status: a.status},
    allowedCommands: ['plan', 'verify'], blockedCommands: BLOCKED, maximumState: 'BLOCKED', effects: false, coverageGap: adapter.coverageGap, planRef: state.planRef};
  if (command === 'plan') { const runtime = resolve(project, '.frames-video'); if (!existsSync(runtime)) mkdirSync(runtime, {mode: 0o700}); if (lstatSync(runtime).isSymbolicLink() || realpathSync(runtime) !== runtime) fail('CASE_LONGFORM_RUNTIME_NOT_CANONICAL'); secureWrite(output, expected); atomicState(stateRecord.path, stateRecord, {...state, caseLongformPlanSha256: sha(Buffer.from(json(expected))), workProductState: 'BLOCKED'}); console.log(`PASS case-longform plan: ${a.status}; effects=false`); }
  else { const plan = openOnce(output, 'CASE_LONGFORM_PLAN', {sha256: state.caseLongformPlanSha256}); if (json(plan.value) !== json(expected)) fail('CASE_LONGFORM_PLAN_DRIFT'); console.log(`PASS case-longform verify: ${a.status}; maximum=BLOCKED`); }
}
