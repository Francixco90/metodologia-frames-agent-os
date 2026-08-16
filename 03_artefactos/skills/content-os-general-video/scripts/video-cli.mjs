#!/usr/bin/env node
import {createHash} from 'node:crypto';
// prettier-ignore
import {appendFileSync, closeSync, constants, existsSync, fstatSync, fsyncSync, lstatSync, mkdirSync, openSync, readFileSync, realpathSync, renameSync, statSync, unlinkSync, writeFileSync} from 'node:fs';
import {dirname, isAbsolute, normalize, relative, resolve, sep} from 'node:path';

import {validateSchema} from './lib/schema-validation.mjs';

const BLOCKED = ['ingest', 'index', 'script', 'render', 'package'];
const CHECKS = ['TEXT_FIDELITY', 'FRAME_TIMING', 'LAYOUT_GEOMETRY', 'SINGLE_LAYER', 'BOUNDARY_CONTINUITY'];
const BINDINGS = {placement_plan_sha256: 'caption_placement_plan', graph_sha256: 'operation_graph', temporal_map_sha256: 'temporal_map', caption_track_sha256: 'caption_track', caption_cleanup_sha256: 'caption_cleanup', layout_authority_sha256: 'caption_layout_authority', compositor_authority_sha256: 'caption_compositor_authority'};
const TOOL_BINDINGS = {compositor_executable_sha256: 'executable', compositor_command_sha256: 'command', compositor_config_sha256: 'config'};
const LEDGER_KEYS = ['schema_version', 'kind', 'execution_scope', 'job_id', 'source_set_sha256', 'placement_plan_sha256', 'graph_sha256', 'temporal_map_sha256', 'caption_track_sha256', 'caption_cleanup_sha256', 'layout_authority_sha256', 'compositor_authority_sha256', 'compositor_executable_sha256', 'compositor_command_sha256', 'compositor_config_sha256', 'entries', 'chain_sha256'];
const ENTRY_KEYS = ['sequence', 'cue_id', 'layout_id', 'start_frame', 'end_frame', 'text_sha256', 'font_sha256', 'geometry', 'graph_sha256', 'temporal_map_sha256', 'caption_track_sha256', 'caption_cleanup_sha256', 'layout_authority_sha256', 'compositor_authority_sha256', 'compositor_executable_sha256', 'compositor_command_sha256', 'compositor_config_sha256', 'previous_entry_sha256', 'entry_sha256'];
const arg = (name, fallback) => { const at = process.argv.indexOf(`--${name}`); return at < 0 ? fallback : process.argv[at + 1]; };
const fail = (message, code = 1) => { console.error(`COSR-GV_${message}`); process.exit(code); };
const canonical = (value) => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])])) : value;
const json = (value) => `${JSON.stringify(canonical(value), null, 2)}\n`;
const sha = (value) => createHash('sha256').update(value).digest('hex');
const compact = (value) => Buffer.from(JSON.stringify(value));
const ordered = (value, keys) => Object.fromEntries(keys.map((key) => [key, value[key]]));
const canonicalLedger = (ledger) => ordered({...ledger, entries: ledger.entries.map((entry) => ordered({...entry, geometry: ordered(entry.geometry, ['x', 'y', 'width', 'height'])}, ENTRY_KEYS))}, LEDGER_KEYS);
const schema = (value, label) => validateSchema('case-longform-adapter-v1.schema.json', value, label, fail);
const command = process.argv[2];
const project = realpathSync(resolve(arg('project', '.')));

function lexical(ref, label) {
  if (!ref || typeof ref !== 'string' || isAbsolute(ref) || /^[a-z]+:/iu.test(ref) || ref.includes('\\') || ref.includes('\0') || ref.includes('//') || ref.endsWith('/') || normalize(ref) !== ref || ref.split('/').some((part) => !part || part === '.' || part === '..')) fail(`UNSAFE_${label}_REF ${ref}`);
  const path = resolve(project, ref); const rel = relative(project, path);
  if (!rel || rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) fail(`OUTSIDE_PROJECT_${label}_REF`);
  return {path, rel};
}
function guarded(ref, label) {
  const {path, rel} = lexical(ref, label); let cursor = project;
  for (const part of rel.split(sep)) { cursor = resolve(cursor, part); const state = lstatSync(cursor); if (state.isSymbolicLink()) fail(`SYMLINK_${label}_REF`); }
  const real = realpathSync(path); const inside = relative(project, real);
  if (real !== path || inside === '..' || inside.startsWith(`..${sep}`) || isAbsolute(inside)) fail(`NONCANONICAL_${label}_REF`);
  const state = lstatSync(path); if (!state.isFile()) fail(`UNSAFE_${label}_TYPE`);
  return {path, state};
}
const statSame = (a, b) => ['dev', 'ino', 'size', 'mtimeMs', 'ctimeMs'].every((key) => a[key] === b[key]);
function testHook(label, path) {
  if (process.env.METODOLOGIA_TOOLCHAIN_PROFILE !== 'ci-code-only') return;
  const hook = process.env.METODOLOGIA_CASE_LONGFORM_TEST_HOOK;
  if (hook === `swap:${label}`) renameSync(`${path}.swap`, path);
  if (hook === `swapdir:${label}`) { const parent = dirname(path); renameSync(parent, `${parent}.old`); renameSync(`${parent}.swap`, parent); }
  if (hook === `mutate:${label}`) appendFileSync(path, ' ');
}
function openOnce(ref, label, declared = {}, parseJson = true) {
  let fd;
  try {
    const beforePath = guarded(ref, label); fd = openSync(beforePath.path, constants.O_RDONLY | constants.O_NOFOLLOW);
    const before = fstatSync(fd); if (!before.isFile() || before.dev !== beforePath.state.dev || before.ino !== beforePath.state.ino) fail(`TOCTOU_${label}`);
    const buffer = readFileSync(fd); testHook(label, beforePath.path); const after = fstatSync(fd); const afterPath = guarded(ref, label);
    if (!statSame(before, after) || before.dev !== afterPath.state.dev || before.ino !== afterPath.state.ino) fail(`TOCTOU_${label}`);
    if (declared.sha256 !== undefined && declared.sha256 !== sha(buffer)) fail(`HASH_DRIFT_${label}`);
    if (declared.bytes !== undefined && declared.bytes !== buffer.length) fail(`BYTES_DRIFT_${label}`);
    let value = buffer;
    if (parseJson) { try { value = JSON.parse(buffer.toString('utf8')); } catch (error) { fail(`INVALID_JSON_${label} ${error.message}`); } }
    return {ref, path: beforePath.path, identity: `${before.dev}:${before.ino}`, value, buffer};
  } catch (error) { fail(`${error.code ?? `OPEN_${label}`} ${error.message ?? ''}`); }
  finally { if (fd !== undefined) closeSync(fd); }
}
function authorityRoot(value, label) {
  if (!isAbsolute(value) || normalize(value) !== value || !existsSync(value) || lstatSync(value).isSymbolicLink() || realpathSync(value) !== value || !statSync(value).isDirectory()) fail(`CASE_LONGFORM_${label}_ROOT_NOT_CANONICAL`);
  return value;
}
const overlaps = (a, b) => { const rel = relative(a, b); return rel === '' || (!rel.startsWith(`..${sep}`) && !isAbsolute(rel)); };
function validatePure(contract, ledger, adapter, compositor) {
  const planned = authorityRoot(contract.planned_review_authority_root, 'PLANNED');
  const priors = [...contract.prior_authority_roots, ...adapter.reviewTrust.priorRoots].map((root, index) => authorityRoot(root, `PRIOR_${index}`));
  if (priors.some((root) => overlaps(planned, root) || overlaps(root, planned))) fail('CASE_LONGFORM_ROOT_OVERLAP');
  const {planner, caption_verifier: captionVerifier, guardian} = contract.review_actors; const trust = adapter.reviewTrust;
  const reviewers = [planner, captionVerifier, guardian];
  const priorActors = [contract.caption_actors.layout_authority, contract.caption_actors.compositor_authority, contract.caption_actors.caption_verifier, ...trust.priorActorIds];
  if (!trust.trustedPlannerActorIds.includes(planner) || !trust.trustedCaptionVerifierActorIds.includes(captionVerifier) || !trust.trustedGuardianActorIds.includes(guardian) || new Set(reviewers).size !== reviewers.length || reviewers.some((actor) => priorActors.includes(actor))) fail('CASE_LONGFORM_REVIEW_ACTOR_DRIFT');
  const pre = contract.v4_status === 'PRE_RENDER_BLOCKED';
  if (contract.v7a_status !== (pre ? 'PRE_RENDER_BLOCKED' : 'BLOCKED_PENDING_CAPTION_MATERIAL_LEDGER_CONTRACTS') || contract.v7b_status !== (pre ? 'PRE_RENDER_BLOCKED' : 'BLOCKED_PENDING_CAPTION_VISUAL_EVIDENCE_CONTRACTS') || contract.status !== (pre ? 'PRE_RENDER_BLOCKED' : 'BLOCKED_PENDING_V7C_FULL_CHAIN_FIXTURE_AND_CAPTION_VISUAL_EVIDENCE_CONTRACTS')) fail('CASE_LONGFORM_STATUS_PROJECTION_DRIFT');
  const a = contract.artifacts;
  if (ledger.job_id !== contract.job_id || ledger.source_set_sha256 !== contract.source_set_sha256 || Object.entries(BINDINGS).some(([field, artifact]) => ledger[field] !== a[artifact].sha256) || Object.entries(TOOL_BINDINGS).some(([field, material]) => ledger[field] !== compositor[material]?.sha256)) fail('CASE_LONGFORM_LEDGER_BINDING_DRIFT');
  let previous = null;
  for (const [index, entry] of ledger.entries.entries()) {
    const {entry_sha256: declared, ...unsigned} = entry;
    if (entry.sequence !== index || entry.end_frame < entry.start_frame || entry.previous_entry_sha256 !== previous || declared !== sha(JSON.stringify(unsigned))) fail('CASE_LONGFORM_LEDGER_ENTRY_DRIFT');
    previous = declared;
    for (const key of [...Object.keys(BINDINGS).filter((key) => key !== 'placement_plan_sha256'), ...Object.keys(TOOL_BINDINGS)]) if (entry[key] !== ledger[key]) fail('CASE_LONGFORM_LEDGER_ENTRY_BINDING_DRIFT');
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
    tasks: ledger.entries.flatMap((entry) => CHECKS.map((check, index) => ({task_id: `${entry.sequence}.${check.toLowerCase()}`, sequence: entry.sequence * CHECKS.length + index, ledger_sequence: entry.sequence, check, caption_entry_sha256: entry.entry_sha256, cue_id: entry.cue_id, layout_id: entry.layout_id, start_frame: entry.start_frame, end_frame: entry.end_frame, text_sha256: entry.text_sha256, font_sha256: entry.font_sha256, geometry: entry.geometry}))),
  };
}
function planPath(ref, records, mustExist) {
  const {path} = lexical(ref, 'CASE_LONGFORM_PLAN'); if (dirname(ref) !== '.frames-video') fail('CASE_LONGFORM_PLAN_OUTSIDE_RUNTIME');
  if (existsSync(path)) { const current = guarded(ref, 'CASE_LONGFORM_PLAN'); const identity = `${current.state.dev}:${current.state.ino}`; if (records.some((record) => identity === record.identity)) fail('CASE_LONGFORM_PLAN_INPUT_ALIAS'); }
  if (!mustExist && existsSync(path)) fail('CASE_LONGFORM_PLAN_OVERWRITE'); return path;
}
function secureWrite(path, value) {
  let fd; try { fd = openSync(path, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW, 0o600); writeFileSync(fd, json(value)); fsyncSync(fd); }
  catch (error) { fail(`CASE_LONGFORM_OUTPUT_OPEN ${error.code ?? error.message}`); } finally { if (fd !== undefined) closeSync(fd); }
}
function atomicState(path, original, value) {
  const current = lstatSync(path); if (current.isSymbolicLink() || `${current.dev}:${current.ino}` !== original.identity) fail('TOCTOU_STATE_WRITE');
  const temp = `${path}.${process.pid}.tmp`; try { secureWrite(temp, value); renameSync(temp, path); } catch (error) { if (existsSync(temp)) unlinkSync(temp); throw error; }
}

const stateRef = arg('state', 'workflow-state.json'); const stateRecord = openOnce(stateRef, 'STATE'); const state = stateRecord.value;
if (state.archetype !== 'case-longform') await import('./lib/video-runtime.mjs');
else {
  if (BLOCKED.includes(command) || !['plan', 'verify'].includes(command)) fail(`CASE_LONGFORM_COMMAND_BLOCKED_${command}`);
  if (state.schemaVersion !== 'general-video-v2' || state.contractRevision !== 2) fail('CASE_LONGFORM_MIGRATION_REQUIRED');
  validateSchema('general-video-v2.schema.json', state, 'STATE', fail);
  const adapterRecord = openOnce(state.caseLongformAdapterRef, 'CASE_LONGFORM_ADAPTER', {sha256: state.caseLongformAdapterSha256}); const adapter = adapterRecord.value; schema(adapter, 'CASE_LONGFORM_ADAPTER');
  const contractRecord = openOnce(adapter.authority.contract.ref, 'CASE_LONGFORM_CONTRACT', adapter.authority.contract); const contract = contractRecord.value;
  const ledgerRecord = openOnce(adapter.authority.executionLedger.ref, 'CASE_LONGFORM_LEDGER', adapter.authority.executionLedger); const ledger = ledgerRecord.value;
  const reviewRecord = openOnce(adapter.authority.externalReviewPlan.ref, 'CASE_LONGFORM_REVIEW_PLAN', adapter.authority.externalReviewPlan); const review = reviewRecord.value;
  const inputs = [stateRecord, adapterRecord, contractRecord, ledgerRecord, reviewRecord];
  if (new Set(inputs.map(({identity}) => identity)).size !== inputs.length) fail('CASE_LONGFORM_REF_ALIAS');
  const denied = (adapter.doNotUseRefs ?? []).map((ref, index) => openOnce(ref, `DO_NOT_USE_${index}`, {}, false));
  if (new Set(denied.map(({identity}) => identity)).size !== denied.length || denied.some(({identity}) => inputs.some((record) => record.identity === identity))) fail('CASE_LONGFORM_DO_NOT_USE');
  schema({contract, ledger, reviewPlan: review}, 'CASE_LONGFORM_AUTHORITY'); const a = adapter.authority;
  if ([contract, ledger, review].some((value) => value.job_id !== a.jobId || value.source_set_sha256 !== a.sourceSetSha256) || contract.status !== a.status || contract.coverage_gap !== adapter.coverageGap || json(contract.artifacts.caption_execution_ledger) !== json(a.executionLedger) || json(contract.artifacts.caption_external_review_plan) !== json(a.externalReviewPlan)) fail('CASE_LONGFORM_AUTHORITY_BINDING_DRIFT');
  const artifacts = new Map();
  for (const [key, ref] of Object.entries(contract.artifacts)) {
    const record = key === 'caption_execution_ledger' ? ledgerRecord : key === 'caption_external_review_plan' ? reviewRecord : openOnce(ref.ref, `ARTIFACT_${key}`, ref, false);
    if (record.ref !== ref.ref || sha(record.buffer) !== ref.sha256 || record.buffer.length !== ref.bytes) fail(`CASE_LONGFORM_ARTIFACT_BINDING_DRIFT_${key}`); artifacts.set(key, record);
  }
  if (new Set([...artifacts.values()].map(({identity}) => identity)).size !== artifacts.size) fail('CASE_LONGFORM_ARTIFACT_REF_ALIAS');
  if (!ledgerRecord.buffer.equals(compact(canonicalLedger(ledger)))) fail('CASE_LONGFORM_LEDGER_NOT_CANONICAL');
  let compositor; try { compositor = JSON.parse(artifacts.get('caption_compositor_authority').buffer.toString('utf8')); } catch { fail('CASE_LONGFORM_COMPOSITOR_AUTHORITY_INVALID'); }
  const tools = Object.entries(TOOL_BINDINGS).map(([field, name]) => ({field, record: openOnce(compositor[name]?.ref, `COMPOSITOR_${name}`, compositor[name], false)}));
  validatePure(contract, ledger, adapter, compositor);
  if (new Set([...inputs, ...denied, ...artifacts.values(), ...tools.map(({record}) => record)].map(({identity}) => identity)).size !== inputs.length + denied.length + artifacts.size + tools.length - 2) fail('CASE_LONGFORM_MATERIAL_REF_ALIAS');
  const expectedReviewPlan = expectedReview(contract, ledger);
  if (json(review) !== json(expectedReviewPlan) || !reviewRecord.buffer.equals(compact(expectedReviewPlan))) fail('CASE_LONGFORM_REVIEW_PLAN_DRIFT');
  const records = [...inputs, ...denied, ...artifacts.values(), ...tools.map(({record}) => record)]; const output = planPath(state.planRef, records, command === 'verify');
  const expected = {schemaVersion: 'general-video-case-longform-plan-v1', kind: 'case_longform_plan_verify_bridge', archetype: 'case-longform', mode: 'PLAN_VERIFY_ONLY', authority: {adapterSha256: sha(adapterRecord.buffer), contractSha256: a.contract.sha256, executionLedgerSha256: a.executionLedger.sha256, externalReviewPlanSha256: a.externalReviewPlan.sha256, jobId: a.jobId, sourceSetSha256: a.sourceSetSha256, status: a.status}, allowedCommands: ['plan', 'verify'], blockedCommands: BLOCKED, maximumState: 'BLOCKED', effects: false, coverageGap: adapter.coverageGap, planRef: state.planRef};
  if (command === 'plan') { const runtime = resolve(project, '.frames-video'); if (!existsSync(runtime)) mkdirSync(runtime, {mode: 0o700}); if (lstatSync(runtime).isSymbolicLink() || realpathSync(runtime) !== runtime) fail('CASE_LONGFORM_RUNTIME_NOT_CANONICAL'); secureWrite(output, expected); atomicState(stateRecord.path, stateRecord, {...state, caseLongformPlanSha256: sha(Buffer.from(json(expected))), workProductState: 'BLOCKED'}); console.log(`PASS case-longform plan: ${a.status}; effects=false`); }
  else { const plan = openOnce(state.planRef, 'CASE_LONGFORM_PLAN', {sha256: state.caseLongformPlanSha256}); if (json(plan.value) !== json(expected)) fail('CASE_LONGFORM_PLAN_DRIFT'); console.log(`PASS case-longform verify: ${a.status}; maximum=BLOCKED`); }
}
