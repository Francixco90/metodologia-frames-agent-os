#!/usr/bin/env node
import {createHash} from 'node:crypto';
// prettier-ignore
import {existsSync, linkSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, readlinkSync, rmSync, symlinkSync, writeFileSync} from 'node:fs';
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
const ZERO = '0'.repeat(64);
const CHECKS = bridgeSchema.$defs.reviewPlan.properties.checks.const;
const ARTIFACT_KEYS = bridgeSchema.$defs.artifacts.required;
const sha = (value) => createHash('sha256').update(value).digest('hex');
const bytes = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const write = (root, ref, value) => {
  const body = bytes(value);
  mkdirSync(resolve(root, ref, '..'), {recursive: true});
  writeFileSync(resolve(root, ref), body);
  return {ref, sha256: sha(body), bytes: body.length};
};
const artifactHash = (key, ledger) => ({
  caption_cleanup: ledger.caption_cleanup_sha256,
  caption_compositor_authority: ledger.compositor_authority_sha256,
  caption_layout_authority: ledger.layout_authority_sha256,
  caption_placement_plan: ledger.placement_plan_sha256,
  caption_track: ledger.caption_track_sha256,
  caption_verifier_authority: '7878787878787878787878787878787878787878787878787878787878787878',
  operation_graph: ledger.graph_sha256,
  temporal_map: ledger.temporal_map_sha256,
})[key] ?? ZERO;
const reviewFor = (base, contract, ledger) => {
  const a = contract.artifacts;
  const review = {...base,
    actor_id: contract.review_actors.planner,
    job_id: contract.job_id,
    source_set_sha256: contract.source_set_sha256,
    reviewers: [
      {role: 'CAPTION_VERIFIER', actor_id: contract.review_actors.caption_verifier},
      {role: 'GUARDIAN', actor_id: contract.review_actors.guardian},
    ],
  };
  const names = {graph: 'operation_graph', placement_plan: 'caption_placement_plan', execution_ledger: 'caption_execution_ledger', layout_authority: 'caption_layout_authority', compositor_authority: 'caption_compositor_authority', caption_verifier_authority: 'caption_verifier_authority'};
  for (const key of Object.keys(review).filter((item) => item.endsWith('_sha256') && item !== 'source_set_sha256')) review[key] = a[names[key.slice(0, -7)] ?? key.slice(0, -7)].sha256;
  review.tasks = ledger.entries.flatMap((entry) => CHECKS.map((check, index) => ({
      task_id: `${entry.sequence}.${check.toLowerCase()}`,
      sequence: entry.sequence * CHECKS.length + index,
      ledger_sequence: entry.sequence,
      check,
      caption_entry_sha256: entry.entry_sha256,
      cue_id: entry.cue_id,
      layout_id: entry.layout_id,
      start_frame: entry.start_frame,
      end_frame: entry.end_frame,
      text_sha256: entry.text_sha256,
      font_sha256: entry.font_sha256,
      geometry: entry.geometry,
    })));
  return review;
};

const materialize = (mutation = 'none') => {
  const root = mkdtempSync(resolve(tmpdir(), 'gv-case-longform-'));
  roots.push(root);
  const fixture = structuredClone(positive);
  const unsigned = fixture.ledger.entries[0];
  fixture.ledger.entries = [{...unsigned, entry_sha256: sha(JSON.stringify(unsigned))}];
  fixture.ledger.chain_sha256 = fixture.ledger.entries[0].entry_sha256;
  fixture.contract.artifacts = Object.fromEntries(
    ARTIFACT_KEYS.map((key) => [key, {ref: `authority/${key}.json`, sha256: artifactHash(key, fixture.ledger), bytes: 1}]),
  );
  if (mutation === 'ledger-chain') fixture.ledger.chain_sha256 = '7'.repeat(64);
  if (mutation === 'ledger-actions') fixture.ledger.actions = [];
  const ledgerRef = write(root, 'execution-ledger.json', fixture.ledger);
  fixture.contract.artifacts.caption_execution_ledger = ledgerRef;
  fixture.reviewPlan = reviewFor(fixture.reviewPlan, fixture.contract, fixture.ledger);
  if (mutation === 'review-outcomes') fixture.reviewPlan.outcomes = [];
  const reviewRef = write(root, 'external-review-plan.json', fixture.reviewPlan);
  let effectiveReviewRef = reviewRef;
  if (mutation === 'authority-alias') {
    linkSync(resolve(root, ledgerRef.ref), resolve(root, 'ledger-review-alias.json'));
    effectiveReviewRef = {...ledgerRef, ref: 'ledger-review-alias.json'};
  }
  fixture.contract.artifacts.caption_external_review_plan = effectiveReviewRef;
  if (mutation === 'contract-ref')
    fixture.contract.artifacts.caption_execution_ledger = {...ledgerRef, ref: 'different-ledger.json'};
  if (mutation === 'contract-unknown') fixture.contract.full_chain_accredited = false;
  if (mutation === 'contract-verdicts') fixture.contract.verdicts = [];
  const contractRef = write(root, 'authority-contract.json', fixture.contract);
  let effectiveContractRef = contractRef;
  if (mutation === 'contract-symlink') {
    symlinkSync(contractRef.ref, resolve(root, 'authority-contract-link.json'));
    effectiveContractRef = {...contractRef, ref: 'authority-contract-link.json'};
  }
  if (mutation === 'review-symlink') {
    symlinkSync(reviewRef.ref, resolve(root, 'external-review-plan-link.json'));
    effectiveReviewRef = {...reviewRef, ref: 'external-review-plan-link.json'};
  }
  fixture.adapter.authority.contract = effectiveContractRef;
  fixture.adapter.authority.executionLedger = ledgerRef;
  fixture.adapter.authority.externalReviewPlan = effectiveReviewRef;
  if (mutation === 'ledger-symlink') {
    symlinkSync(ledgerRef.ref, resolve(root, 'execution-ledger-link.json'));
    fixture.adapter.authority.executionLedger = {...ledgerRef, ref: 'execution-ledger-link.json'};
  }
  if (mutation === 'adapter-status')
    fixture.adapter.authority.status = 'BLOCKED_PENDING_V7C_FULL_CHAIN_FIXTURE_AND_CAPTION_VISUAL_EVIDENCE_CONTRACTS';
  if (mutation === 'do-not-use-hardlink') {
    linkSync(resolve(root, contractRef.ref), resolve(root, 'do-not-use-contract.json'));
    fixture.adapter.doNotUseRefs = ['do-not-use-contract.json'];
  }
  if (mutation === 'effects') fixture.adapter.effects = true;
  if (mutation === 'plan-outside') fixture.state.planRef = 'outside-plan.json';
  if (mutation === 'v1-case-longform') {
    fixture.state.schemaVersion = 'general-video-v1';
    delete fixture.state.contractRevision;
  }
  const adapterTarget = mutation === 'plan-input-alias' ? fixture.state.planRef : 'case-longform-adapter.json';
  const adapterRef = write(root, adapterTarget, fixture.adapter);
  let stateAdapterRef = adapterRef; if (mutation === 'adapter-symlink') {
    symlinkSync(adapterRef.ref, resolve(root, 'case-longform-adapter-link.json'));
    stateAdapterRef = {...adapterRef, ref: 'case-longform-adapter-link.json'};
  }
  fixture.state.caseLongformAdapterRef = stateAdapterRef.ref;
  fixture.state.caseLongformAdapterSha256 = stateAdapterRef.sha256;
  if (mutation === 'plan-overwrite') write(root, fixture.state.planRef, {occupied: true});
  if (mutation === 'plan-symlink') {
    write(root, '.frames-video/existing-plan.json', {occupied: true});
    symlinkSync('existing-plan.json', resolve(root, fixture.state.planRef));
  }
  write(root, 'workflow-state.json', fixture.state);
  if (mutation === 'state-symlink') symlinkSync('workflow-state.json', resolve(root, 'workflow-state-link.json'));
  if (mutation === 'ledger-bytes')
    writeFileSync(resolve(root, ledgerRef.ref), Buffer.concat([bytes(fixture.ledger), Buffer.from(' ')]));
  return {root, stateRef: mutation === 'state-symlink' ? 'workflow-state-link.json' : null};
};
const run = ({root, stateRef}, command) =>
  spawnSync(process.execPath, [cli, command, '--project', root, ...(stateRef ? ['--state', stateRef] : [])], {
    encoding: 'utf8',
    env: {...process.env, METODOLOGIA_TOOLCHAIN_PROFILE: 'ci-code-only'},
  });
const walk = (root, dir = root) => readdirSync(dir).flatMap((name) => {
  const path = join(dir, name);
  const stat = lstatSync(path);
  if (stat.isDirectory()) return walk(root, path);
  const rel = relative(root, path);
  if (stat.isSymbolicLink()) return [`L ${rel} ${readlinkSync(path)}`];
  return [`F ${rel} ${sha(readFileSync(path))}`];
}).sort();
const errors = [];

const skillMd = readFileSync(resolve(skill, 'SKILL.md'), 'utf8');
const frontmatter = parse(/^---\n([\s\S]*?)\n---\n/u.exec(skillMd)?.[1] ?? '{}');
const receipt = existsSync(receiptPath) ? parse(readFileSync(receiptPath, 'utf8')) : null;
if (frontmatter?.version !== '0.16.0' || skillMd.includes('version: 0.15.0'))
  errors.push('frontmatter must declare exact current version 0.16.0 without historical-version aliases');
if (receipt?.schema_version !== 'general-video-skill-verification-v1' || receipt?.skill !== 'content-os-general-video' || receipt?.version !== '0.16.0') errors.push('missing exact verification-v0.16.0 receipt');

try {
  const fixture = materialize();
  const planned = run(fixture, 'plan');
  const state = JSON.parse(readFileSync(resolve(fixture.root, 'workflow-state.json'), 'utf8'));
  const planPath = resolve(fixture.root, '.frames-video/case-longform-plan.json');
  const plan = existsSync(planPath) ? JSON.parse(readFileSync(planPath, 'utf8')) : {};
  const verified = run(fixture, 'verify');
  if (planned.status !== 0 || verified.status !== 0 || state.workProductState !== 'BLOCKED' ||
      !/^[a-f0-9]{64}$/u.test(state.caseLongformPlanSha256) || plan.maximumState !== 'BLOCKED' ||
      plan.effects !== false || plan.coverageGap !== 'V7C_FULL_CHAIN_FIXTURE_NOT_ACCREDITED')
    errors.push(`positive ${(planned.stderr || planned.stdout || '').trim()} ${(verified.stderr || verified.stdout || '').trim()}`);

  const v1 = materialize('v1-case-longform');
  const v1State = {...JSON.parse(readFileSync(resolve(v1.root, 'workflow-state.json'), 'utf8')), archetype: 'general'};
  write(v1.root, 'workflow-state.json', v1State);
  const v1Generic = run(v1, 'ingest');
  if (v1Generic.status !== 0) errors.push(`v1-generic-compatibility ${(v1Generic.stderr || v1Generic.stdout || '').trim()}`);

  for (const test of negatives) {
    const fixtureCase = materialize(test.mutation);
    const before = test.zeroDrift ? JSON.stringify(walk(fixtureCase.root)) : null;
    const result = run(fixtureCase, test.command);
    const after = test.zeroDrift ? JSON.stringify(walk(fixtureCase.root)) : null;
    if (result.status === 0 || !(result.stderr || '').includes(test.error) || (test.zeroDrift && before !== after)) errors.push(`${test.id} ${(result.stderr || result.stdout || '').trim()} zeroDrift=${before === after}`);
  }
} finally {
  roots.forEach((root) => rmSync(root, {recursive: true, force: true}));
}

if (errors.length) {
  console.error(`FAIL case-longform bridge: ${errors.join(' | ')}`);
  process.exitCode = 1;
} else {
  console.info('PASS case-longform bridge: strict V7c0 authority; canonical identity; mutation-free blocked commands; maximum=BLOCKED.');
}
