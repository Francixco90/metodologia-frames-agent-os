#!/usr/bin/env node
import {createHash} from 'node:crypto';
import {existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';

import './lib/check-suite.mjs';

const skill = resolve(process.cwd(), 'skills/content-os-general-video');
const cli = resolve(skill, 'scripts/video-cli.mjs');
const cases = JSON.parse(
  readFileSync(resolve(skill, 'fixtures/case-longform/cases.json'), 'utf8'),
);
const {positive, negative: negatives} = cases;
const roots = [];
const canonical = (value) => {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonical(value[key])]),
    );
  return value;
};
const bytes = (value) => Buffer.from(`${JSON.stringify(canonical(value), null, 2)}\n`);
const sha = (value) => createHash('sha256').update(value).digest('hex');
const write = (root, ref, value) => {
  const body = bytes(value);
  writeFileSync(resolve(root, ref), body);
  return {ref, sha256: sha(body), bytes: body.length};
};
const materialize = (mutation = 'none') => {
  const root = mkdtempSync(resolve(tmpdir(), 'gv-case-longform-'));
  roots.push(root);
  const fixture = structuredClone(positive);
  const ledgerRef = write(root, 'execution-ledger.json', fixture.ledger);
  fixture.reviewPlan.execution_ledger_sha256 = ledgerRef.sha256;
  const reviewRef = write(root, 'external-review-plan.json', fixture.reviewPlan);
  const effectiveReviewRef = mutation === 'authority-alias' ? ledgerRef : reviewRef;
  fixture.contract.artifacts.caption_execution_ledger =
    mutation === 'contract-ref' ? {...ledgerRef, ref: 'different-ledger.json'} : ledgerRef;
  fixture.contract.artifacts.caption_external_review_plan = effectiveReviewRef;
  const contractRef = write(root, 'authority-contract.json', fixture.contract);
  fixture.adapter.authority.contract = contractRef;
  fixture.adapter.authority.executionLedger = ledgerRef;
  fixture.adapter.authority.externalReviewPlan = effectiveReviewRef;
  if (mutation === 'adapter-status')
    fixture.adapter.authority.status =
      'BLOCKED_PENDING_V7C_FULL_CHAIN_FIXTURE_AND_CAPTION_VISUAL_EVIDENCE_CONTRACTS';
  if (mutation === 'do-not-use') fixture.adapter.doNotUseRefs = [contractRef.ref];
  if (mutation === 'effects') fixture.adapter.effects = true;
  const adapterRef = write(root, 'case-longform-adapter.json', fixture.adapter);
  fixture.state.caseLongformAdapterSha256 = adapterRef.sha256;
  write(root, 'workflow-state.json', fixture.state);
  if (mutation === 'ledger-bytes')
    writeFileSync(resolve(root, ledgerRef.ref), Buffer.concat([bytes(fixture.ledger), Buffer.from(' ')]));
  return root;
};
const run = (root, command) =>
  spawnSync(process.execPath, [cli, command, '--project', root], {encoding: 'utf8'});
const errors = [];

try {
  const root = materialize();
  const planned = run(root, 'plan');
  const state = JSON.parse(readFileSync(resolve(root, 'workflow-state.json'), 'utf8'));
  const planPath = resolve(root, '.frames-video/case-longform-plan.json');
  const plan = existsSync(planPath) ? JSON.parse(readFileSync(planPath, 'utf8')) : {};
  const verified = run(root, 'verify');
  if (
    planned.status !== 0 ||
    verified.status !== 0 ||
    state.workProductState !== 'BLOCKED' ||
    !/^[a-f0-9]{64}$/u.test(state.caseLongformPlanSha256) ||
    plan.maximumState !== 'BLOCKED' ||
    plan.effects !== false ||
    plan.coverageGap !== 'V7C_FULL_CHAIN_FIXTURE_NOT_ACCREDITED'
  )
    errors.push(
      `positive ${(planned.stderr || planned.stdout || '').trim()} ${(verified.stderr || verified.stdout || '').trim()}`,
    );
  for (const test of negatives) {
    const caseRoot = materialize(test.mutation);
    const result = run(caseRoot, test.command);
    if (result.status === 0 || !(result.stderr || '').includes(test.error))
      errors.push(`${test.id} ${(result.stderr || result.stdout || '').trim()}`);
  }
} finally {
  roots.forEach((root) => rmSync(root, {recursive: true, force: true}));
}

if (errors.length) {
  console.error(`FAIL case-longform bridge: ${errors.join(' | ')}`);
  process.exitCode = 1;
} else {
  console.info(
    'PASS case-longform bridge: V7c0 refs/hash/status bound; plan+verify only; maximum=BLOCKED.',
  );
}
