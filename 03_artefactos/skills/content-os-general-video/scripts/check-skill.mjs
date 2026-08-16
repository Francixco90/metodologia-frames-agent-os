#!/usr/bin/env node
import {createHash} from 'node:crypto';
// prettier-ignore
import {existsSync, linkSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, readlinkSync, realpathSync, rmSync, symlinkSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, relative, resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {parse} from 'yaml';
import './lib/check-suite.mjs';

const skill = resolve(process.cwd(), 'skills/content-os-general-video');
const cli = resolve(skill, 'scripts/video-cli.mjs');
const receiptPath = resolve(skill, 'receipts/verification-v0.16.0.yml');
const cases = JSON.parse(readFileSync(resolve(skill, 'fixtures/case-longform/cases.json'), 'utf8'));
const bridgeSchema = JSON.parse(readFileSync(resolve(skill, 'schemas/case-longform-adapter-v1.schema.json'), 'utf8'));
const {positive, negative: negatives} = cases;
const roots = [];
const CHECKS = bridgeSchema.$defs.reviewPlan.properties.checks.const;
const ARTIFACT_KEYS = bridgeSchema.$defs.artifacts.required;
const BINDINGS = {placement_plan_sha256: 'caption_placement_plan', graph_sha256: 'operation_graph', temporal_map_sha256: 'temporal_map', caption_track_sha256: 'caption_track', caption_cleanup_sha256: 'caption_cleanup', layout_authority_sha256: 'caption_layout_authority', compositor_authority_sha256: 'caption_compositor_authority'};
const TOOL_BINDINGS = {compositor_executable_sha256: 'executable', compositor_command_sha256: 'command', compositor_config_sha256: 'config'};
const sha = (value) => createHash('sha256').update(value).digest('hex');
const bytes = (value) => Buffer.isBuffer(value) ? value : Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const write = (root, ref, value) => { const body = bytes(value); mkdirSync(resolve(root, ref, '..'), {recursive: true}); writeFileSync(resolve(root, ref), body); return {ref, sha256: sha(body), bytes: body.length}; };
const serialized = (value, mutation, kind) => {
  if (mutation === `${kind}-pretty`) return bytes(value);
  if (mutation === `${kind}-whitespace`) return Buffer.from(`${JSON.stringify(value)} `);
  if (mutation === `${kind}-reordered`) return Buffer.from(JSON.stringify(Object.fromEntries(Object.entries(value).reverse())));
  return Buffer.from(JSON.stringify(value));
};
const reviewFor = (contract, ledger) => {
  const a = contract.artifacts;
  return {schema_version: 'case-longform-caption-external-review-plan-v1', kind: 'caption_external_review_plan', plan_scope: 'PLANNING_ONLY_NO_OUTCOME', actor_id: contract.review_actors.planner,
    job_id: contract.job_id, source_set_sha256: contract.source_set_sha256, graph_sha256: a.operation_graph.sha256, temporal_map_sha256: a.temporal_map.sha256,
    caption_track_sha256: a.caption_track.sha256, caption_cleanup_sha256: a.caption_cleanup.sha256, placement_plan_sha256: a.caption_placement_plan.sha256,
    execution_ledger_sha256: a.caption_execution_ledger.sha256, layout_authority_sha256: a.caption_layout_authority.sha256,
    compositor_authority_sha256: a.caption_compositor_authority.sha256, caption_verifier_authority_sha256: a.caption_verifier_authority.sha256,
    reviewers: [{role: 'CAPTION_VERIFIER', actor_id: contract.review_actors.caption_verifier}, {role: 'GUARDIAN', actor_id: contract.review_actors.guardian}], checks: CHECKS,
    tasks: ledger.entries.flatMap((entry) => CHECKS.map((check, index) => ({task_id: `${entry.sequence}.${check.toLowerCase()}`, sequence: entry.sequence * CHECKS.length + index, ledger_sequence: entry.sequence, check, caption_entry_sha256: entry.entry_sha256, cue_id: entry.cue_id, layout_id: entry.layout_id, start_frame: entry.start_frame, end_frame: entry.end_frame, text_sha256: entry.text_sha256, font_sha256: entry.font_sha256, geometry: entry.geometry}))),
  };
};
const materialize = (mutation = 'none') => {
  const root = mkdtempSync(resolve(tmpdir(), 'gv-case-longform-')); roots.push(root); const fixture = structuredClone(positive);
  for (const name of ['review-root', 'prior-root', 'external-prior-root']) mkdirSync(resolve(root, name));
  fixture.contract.planned_review_authority_root = realpathSync(resolve(root, 'review-root'));
  fixture.contract.prior_authority_roots = [realpathSync(resolve(root, 'prior-root'))];
  fixture.adapter.reviewTrust.priorRoots = [realpathSync(resolve(root, 'external-prior-root'))];
  if (mutation === 'actor-reuse') fixture.contract.review_actors.planner = fixture.contract.caption_actors.layout_authority;
  if (mutation === 'actor-untrusted') fixture.contract.review_actors.planner = 'synthetic-untrusted-planner';
  if (mutation === 'role-key-order-allowlist-cross') {
    const {planner, caption_verifier: captionVerifier, guardian} = fixture.contract.review_actors;
    fixture.contract.review_actors = {guardian, planner, caption_verifier: captionVerifier};
    fixture.adapter.reviewTrust.trustedPlannerActorIds = [guardian]; fixture.adapter.reviewTrust.trustedCaptionVerifierActorIds = [planner]; fixture.adapter.reviewTrust.trustedGuardianActorIds = [captionVerifier];
  }
  if (mutation === 'external-prior-actor-reuse') fixture.adapter.reviewTrust.priorActorIds = [fixture.contract.review_actors.planner];
  if (mutation === 'external-prior-root-reuse') fixture.adapter.reviewTrust.priorRoots = [fixture.contract.planned_review_authority_root];
  if (mutation === 'trust-prior-actors-omitted') delete fixture.adapter.reviewTrust.priorActorIds;
  if (mutation === 'trust-prior-roots-omitted') delete fixture.adapter.reviewTrust.priorRoots;
  const artifacts = Object.fromEntries(ARTIFACT_KEYS.map((key) => [key, write(root, `authority/${key}.json`, {synthetic: key})]));
  const tools = {executable: write(root, 'tool/compositor.bin', Buffer.from('synthetic compositor')), command: write(root, 'tool/command.json', {synthetic: 'command'}), config: write(root, 'tool/config.json', {synthetic: 'config'})};
  const compositor = {schema_version: 'case-longform-caption-compositor-authority-v1', kind: 'caption_compositor_authority', actor_id: fixture.contract.caption_actors.compositor_authority, ...tools};
  artifacts.caption_compositor_authority = write(root, artifacts.caption_compositor_authority.ref, compositor); fixture.contract.artifacts = artifacts;
  const ledger = fixture.ledger; ledger.job_id = fixture.contract.job_id; ledger.source_set_sha256 = fixture.contract.source_set_sha256;
  for (const [field, key] of Object.entries(BINDINGS)) ledger[field] = artifacts[key].sha256;
  for (const [field, key] of Object.entries(TOOL_BINDINGS)) ledger[field] = tools[key].sha256;
  let previous = null; ledger.entries = ledger.entries.map((raw, sequence) => {
    const {entry_sha256: omitted, ...entry} = raw; void omitted; Object.assign(entry, {sequence, previous_entry_sha256: previous});
    for (const field of [...Object.keys(BINDINGS).filter((key) => key !== 'placement_plan_sha256'), ...Object.keys(TOOL_BINDINGS)]) entry[field] = ledger[field];
    const signed = {...entry, entry_sha256: sha(JSON.stringify(entry))}; previous = signed.entry_sha256; return signed;
  }); ledger.chain_sha256 = previous;
  if (mutation === 'ledger-chain') ledger.chain_sha256 = '7'.repeat(64);
  if (mutation === 'ledger-actions') ledger.actions = [];
  if (mutation === 'ledger-graph-binding') ledger.graph_sha256 = '7'.repeat(64);
  if (mutation === 'ledger-tool-binding') ledger.compositor_executable_sha256 = '7'.repeat(64);
  if (mutation === 'entry-hash-alias') ledger.entries[0].render_sha256 = '7'.repeat(64);
  const ledgerRef = write(root, artifacts.caption_execution_ledger.ref, serialized(ledger, mutation, 'ledger')); artifacts.caption_execution_ledger = ledgerRef;
  let review = reviewFor(fixture.contract, ledger);
  if (mutation === 'review-outcomes') review.outcomes = [];
  if (mutation === 'review-binding') review.graph_sha256 = '7'.repeat(64);
  if (mutation === 'task-binding') review.tasks[0].caption_entry_sha256 = '7'.repeat(64);
  const reviewRef = write(root, artifacts.caption_external_review_plan.ref, serialized(review, mutation, 'review')); artifacts.caption_external_review_plan = reviewRef; fixture.reviewPlan = review;
  if (mutation === 'contract-ref') artifacts.caption_execution_ledger = {...ledgerRef, ref: 'different-ledger.json'};
  if (mutation === 'contract-unknown') fixture.contract.full_chain_accredited = false;
  if (mutation === 'contract-verdicts') fixture.contract.verdicts = [];
  if (mutation === 'contract-render-hash') fixture.contract.render_sha256 = '7'.repeat(64);
  if (mutation === 'root-relative') fixture.contract.planned_review_authority_root = 'review-root';
  if (mutation === 'root-dot') fixture.contract.planned_review_authority_root += '/.';
  if (mutation === 'root-dotdot') fixture.contract.planned_review_authority_root += '/../review-root';
  if (mutation === 'root-overlap') { mkdirSync(resolve(root, 'review-root/prior')); fixture.contract.prior_authority_roots = [realpathSync(resolve(root, 'review-root/prior'))]; }
  if (mutation === 'root-symlink') { symlinkSync(fixture.contract.planned_review_authority_root, resolve(root, 'review-root-link')); fixture.contract.planned_review_authority_root = resolve(root, 'review-root-link'); }
  if (mutation === 'artifact-lexical-alias') artifacts.source_set.ref = `./${artifacts.source_set.ref}`;
  if (mutation === 'artifact-identity-alias') { linkSync(resolve(root, artifacts.source_set.ref), resolve(root, 'authority/identity-alias.json')); artifacts.transform_order = {...artifacts.source_set, ref: 'authority/identity-alias.json'}; }
  if (mutation === 'artifact-hash') artifacts.source_set.sha256 = '7'.repeat(64);
  if (mutation === 'artifact-bytes') artifacts.source_set.bytes += 1;
  const contractRef = write(root, 'authority-contract.json', fixture.contract);
  if (mutation === 'path-swap') write(root, 'authority-contract.json.swap', fixture.contract);
  if (mutation === 'artifact-leaf-swap') write(root, `${artifacts.source_set.ref}.swap`, {synthetic: 'replacement'});
  if (mutation === 'artifact-dir-swap') write(root, `authority.swap/${relative('authority', artifacts.source_set.ref)}`, {synthetic: 'replacement'});
  let effectiveContractRef = contractRef; let effectiveReviewRef = reviewRef;
  if (mutation === 'authority-alias') { linkSync(resolve(root, ledgerRef.ref), resolve(root, 'ledger-review-alias.json')); effectiveReviewRef = {...ledgerRef, ref: 'ledger-review-alias.json'}; }
  if (mutation === 'contract-symlink') { symlinkSync(contractRef.ref, resolve(root, 'authority-contract-link.json')); effectiveContractRef = {...contractRef, ref: 'authority-contract-link.json'}; }
  if (mutation === 'review-symlink') { symlinkSync(reviewRef.ref, resolve(root, 'external-review-plan-link.json')); effectiveReviewRef = {...reviewRef, ref: 'external-review-plan-link.json'}; }
  fixture.adapter.authority.contract = effectiveContractRef; fixture.adapter.authority.executionLedger = ledgerRef; fixture.adapter.authority.externalReviewPlan = effectiveReviewRef;
  if (mutation === 'ledger-symlink') { symlinkSync(ledgerRef.ref, resolve(root, 'execution-ledger-link.json')); fixture.adapter.authority.executionLedger = {...ledgerRef, ref: 'execution-ledger-link.json'}; }
  if (mutation === 'adapter-status') fixture.adapter.authority.status = 'BLOCKED_PENDING_V7C_FULL_CHAIN_FIXTURE_AND_CAPTION_VISUAL_EVIDENCE_CONTRACTS';
  if (mutation === 'do-not-use-hardlink') { linkSync(resolve(root, contractRef.ref), resolve(root, 'do-not-use-contract.json')); fixture.adapter.doNotUseRefs = ['do-not-use-contract.json']; }
  if (mutation === 'effects') fixture.adapter.effects = true;
  if (mutation === 'plan-outside') fixture.state.planRef = 'outside-plan.json';
  if (mutation === 'v1-case-longform') { fixture.state.schemaVersion = 'general-video-v1'; delete fixture.state.contractRevision; }
  const adapterTarget = mutation === 'plan-input-alias' ? fixture.state.planRef : 'case-longform-adapter.json'; const adapterRef = write(root, adapterTarget, fixture.adapter);
  let stateAdapterRef = adapterRef; if (mutation === 'adapter-symlink') { symlinkSync(adapterRef.ref, resolve(root, 'case-longform-adapter-link.json')); stateAdapterRef = {...adapterRef, ref: 'case-longform-adapter-link.json'}; }
  fixture.state.caseLongformAdapterRef = stateAdapterRef.ref; fixture.state.caseLongformAdapterSha256 = stateAdapterRef.sha256;
  if (mutation === 'plan-overwrite') write(root, fixture.state.planRef, {occupied: true});
  if (mutation === 'plan-symlink') { write(root, '.frames-video/existing-plan.json', {occupied: true}); symlinkSync('existing-plan.json', resolve(root, fixture.state.planRef)); }
  write(root, 'workflow-state.json', fixture.state); if (mutation === 'state-symlink') symlinkSync('workflow-state.json', resolve(root, 'workflow-state-link.json'));
  if (mutation === 'ledger-bytes') writeFileSync(resolve(root, ledgerRef.ref), Buffer.concat([bytes(ledger), Buffer.from(' ')]));
  const hooks = { 'path-swap': 'swap:CASE_LONGFORM_CONTRACT', 'path-mutation': 'mutate:CASE_LONGFORM_CONTRACT', 'artifact-leaf-swap': 'swap:ARTIFACT_source_set', 'artifact-dir-swap': 'swapdir:ARTIFACT_source_set' };
  return {root, stateRef: mutation === 'state-symlink' ? 'workflow-state-link.json' : null, hook: hooks[mutation]};
};
const run = ({root, stateRef, hook}, command) => spawnSync(process.execPath, [cli, command, '--project', root, ...(stateRef ? ['--state', stateRef] : [])], {encoding: 'utf8', env: {...process.env, METODOLOGIA_TOOLCHAIN_PROFILE: 'ci-code-only', ...(hook ? {METODOLOGIA_CASE_LONGFORM_TEST_HOOK: hook} : {})}});
const walk = (root, dir = root) => readdirSync(dir).flatMap((name) => { const path = join(dir, name); const stat = lstatSync(path); if (stat.isDirectory()) return walk(root, path); const rel = relative(root, path); return stat.isSymbolicLink() ? [`L ${rel} ${readlinkSync(path)}`] : [`F ${rel} ${sha(readFileSync(path))}`]; }).sort();
const errors = [];
const skillMd = readFileSync(resolve(skill, 'SKILL.md'), 'utf8'); const frontmatter = parse(/^---\n([\s\S]*?)\n---\n/u.exec(skillMd)?.[1] ?? '{}'); const receipt = existsSync(receiptPath) ? parse(readFileSync(receiptPath, 'utf8')) : null;
if (frontmatter?.version !== '0.16.0' || skillMd.includes('version: 0.15.0')) errors.push('frontmatter must declare exact current version 0.16.0 without historical-version aliases');
if (receipt?.schema_version !== 'general-video-skill-verification-v1' || receipt?.skill !== 'content-os-general-video' || receipt?.version !== '0.16.0') errors.push('missing exact verification-v0.16.0 receipt');
try {
  const fixture = materialize(); const planned = run(fixture, 'plan'); const state = JSON.parse(readFileSync(resolve(fixture.root, 'workflow-state.json'), 'utf8'));
  const planPath = resolve(fixture.root, '.frames-video/case-longform-plan.json'); const plan = existsSync(planPath) ? JSON.parse(readFileSync(planPath, 'utf8')) : {}; const verified = run(fixture, 'verify');
  if (planned.status !== 0 || verified.status !== 0 || state.workProductState !== 'BLOCKED' || !/^[a-f0-9]{64}$/u.test(state.caseLongformPlanSha256) || plan.maximumState !== 'BLOCKED' || plan.effects !== false || plan.coverageGap !== 'V7C_FULL_CHAIN_FIXTURE_NOT_ACCREDITED') errors.push(`positive ${(planned.stderr || planned.stdout || '').trim()} ${(verified.stderr || verified.stdout || '').trim()}`);
  const v1 = materialize('v1-case-longform'); const v1State = {...JSON.parse(readFileSync(resolve(v1.root, 'workflow-state.json'), 'utf8')), archetype: 'general'}; write(v1.root, 'workflow-state.json', v1State); const v1Generic = run(v1, 'ingest');
  if (v1Generic.status !== 0) errors.push(`v1-generic-compatibility ${(v1Generic.stderr || v1Generic.stdout || '').trim()}`);
  for (const test of negatives) { const fixtureCase = materialize(test.mutation); const before = test.zeroDrift ? JSON.stringify(walk(fixtureCase.root)) : null; const result = run(fixtureCase, test.command); const after = test.zeroDrift ? JSON.stringify(walk(fixtureCase.root)) : null; if (result.status === 0 || !(result.stderr || '').includes(test.error) || (test.zeroDrift && before !== after)) errors.push(`${test.id} ${(result.stderr || result.stdout || '').trim()} zeroDrift=${before === after}`); }
} finally { roots.forEach((root) => rmSync(root, {recursive: true, force: true})); }
if (errors.length) { console.error(`FAIL case-longform bridge: ${errors.join(' | ')}`); process.exitCode = 1; }
else console.info('PASS case-longform bridge: strict V7c0 authority; canonical bytes; hash-bound adapter trust; mutation-free blocked commands; maximum=BLOCKED.');
