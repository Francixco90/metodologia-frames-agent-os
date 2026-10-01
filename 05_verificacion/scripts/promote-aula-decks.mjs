#!/usr/bin/env node
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {parse} from 'yaml';
import {assertContainedInputFileV1} from '../../02_proceso/workflows/core/safe-local-path-v1.ts';
import * as io from '../../02_proceso/workflows/multimedia/_runner/aula-promotion-io-v1.ts';
import {validateAulaPromotionReviewV1} from '../../02_proceso/workflows/multimedia/_schema/aula-promotion-review-v1.ts';
const digest = (data) => createHash('sha256').update(data).digest('hex');
const manifest = JSON.parse(
  readFileSync('04_estado/registries/skills/aula-decks-package.json', 'utf8'),
);
const registryRef = '04_estado/registries/skills/creation-v3-skill-registry.yml';
const {mode, evaluationRef, reviewRef} = io.parseAulaPromotionArgsV1(process.argv.slice(2));
const root = process.cwd();
let text = readFileSync(registryRef, 'utf8');
let registry = parse(text);
const transition = (id, to, actor, decision, evidence) => {
  const previous = registry.entries.find((entry) => entry.skill_id === id);
  const next = {
    ...previous,
    current_state: to,
    execution_scope: to === 'active' ? 'local-draft-generation' : 'local-evaluation',
    production_runtime_status:
      to === 'active' ? 'local_draft_handler' : 'local_capability_only_promotion_pending',
    publication_authority: false,
  };
  const line = text
    .split('\n')
    .find(
      (item) =>
        item.startsWith('  - {"') &&
        JSON.parse(item.slice(4)).skill_id === id &&
        JSON.parse(item.slice(4)).current_state,
    );
  if (!line) throw new Error('AULA_OWN_ENTRY_MISSING');
  text = text.replace(line, '  - ' + JSON.stringify(next));
  const order =
    Math.max(
      ...registry.events.filter((event) => event.skill_id === id).map((event) => event.event_order),
    ) + 1;
  const event = {
    event_id: `EVT-AULA-${id}-${String(order).padStart(3, '0')}`,
    event_order: order,
    skill_id: id,
    from: previous.current_state,
    to,
    actor_id: actor,
    recorded_at: '2026-10-01T15:00:00Z',
    decision,
    content_sha256: previous.content_sha256,
    package_manifest_sha256: previous.package_manifest_sha256,
    evidence,
  };
  text += '  - ' + JSON.stringify(event) + '\n';
  registry = parse(text);
};
const implementationRefs = [
  '02_proceso/workflows/multimedia/_runner/aula-material-handler-v1.ts',
  '02_proceso/workflows/multimedia/_runner/aula-work-order-v1.ts',
  '02_proceso/workflows/multimedia/_runner/aula-continuation-v1.ts',
  '02_proceso/workflows/multimedia/_schema/aula-approval-v1.ts',
  '05_verificacion/tests/integration/aula-continuation.test.ts',
  '02_proceso/workflows/multimedia/_runner/aula-engine-authority-v1.ts',
  '02_proceso/workflows/multimedia/_schema/aula-promotion-review-v1.ts',
  '02_proceso/workflows/multimedia/_runner/aula-promotion-io-v1.ts',
  '05_verificacion/scripts/promote-aula-decks.mjs',
];
if (mode === '--evaluate') {
  io.assertAulaEvaluationAbsentV1(root, evaluationRef);
  for (const item of manifest.skills)
    execFileSync('python3', [`skills/${item.name}/scripts/check.py`], {
      env: {...process.env, PYTHONDONTWRITEBYTECODE: '1'},
      timeout: 60_000,
    });
  const results = execFileSync(
    'node_modules/.bin/vitest',
    ['run', '05_verificacion/tests/integration/aula-continuation.test.ts', '--reporter=json'],
    {encoding: 'utf8', timeout: 120_000},
  );
  const report = JSON.parse(results);
  if (report.numFailedTests || !report.success) throw new Error('AULA_EVALUATION_FAILED');
  const evaluation = {
    schemaVersion: 'frames-aula-evaluation-v1',
    receiptId: evaluationRef.split('/').at(-1).slice(0, -5),
    appendOnly: true,
    actorId: 'AUTOMATED-PORTABLE-CHECKS',
    status: 'PASS',
    scope: 'local-draft-generation',
    implementation: implementationRefs.map((ref) => ({ref, sha256: digest(readFileSync(ref))})),
    humanPieceApproval: false,
    publicationAuthority: false,
    checks: {
      atomicPackages: 18,
      materialCombinations: 18,
      negativeAndReadOnly: report.numPassedTests - 18,
    },
    testReportSha256: digest(results),
    packages: manifest.skills.map((item) => {
      const entry = registry.entries.find((entry) => entry.skill_id === item.name);
      if (
        entry.content_sha256 !== digest(readFileSync(`skills/${item.name}/SKILL.md`)) ||
        entry.package_manifest_sha256 !== io.aulaPackageDigestV1(root, item.name)
      )
        throw new Error('AULA_PACKAGE_REGISTRY_STALE');
      return {
        skillId: item.name,
        contentSha256: entry.content_sha256,
        packageManifestSha256: entry.package_manifest_sha256,
      };
    }),
    limits: [
      'Browser and pedagogical acceptance require independent review.',
      'Evaluation fixtures simulate explicit human gate decisions.',
    ],
  };
  io.writeAulaEvaluationV1(root, evaluationRef, JSON.stringify(evaluation, null, 2) + '\n');
  for (const item of manifest.skills) {
    let entry = registry.entries.find((entry) => entry.skill_id === item.name);
    if (entry.current_state === 'candidate')
      transition(item.name, 'quarantined', 'RT-07', 'rights_and_scope_quarantine', [evaluationRef]);
    entry = registry.entries.find((entry) => entry.skill_id === item.name);
    if (entry.current_state === 'quarantined')
      transition(item.name, 'evaluated', 'RT-09', 'portable_material_evaluation_pass', [
        evaluationRef,
      ]);
  }
} else {
  const evaluationBytes = io.readAulaEvaluationV1(root, evaluationRef);
  const evaluation = JSON.parse(evaluationBytes.toString('utf8'));
  const review = validateAulaPromotionReviewV1(
    JSON.parse(readFileSync(assertContainedInputFileV1(root, reviewRef), 'utf8')),
    {
      actorId: evaluation.actorId,
      status: evaluation.status,
      sha256: digest(evaluationBytes),
    },
  );
  if (
    JSON.stringify(evaluation.implementation.map((item) => item.ref).sort()) !==
    JSON.stringify([...implementationRefs].sort())
  )
    throw new Error('AULA_IMPLEMENTATION_EVALUATION_INCOMPLETE');
  if (
    JSON.stringify(evaluation.packages.map((item) => item.skillId).sort()) !==
    JSON.stringify(manifest.skills.map((item) => item.name).sort())
  )
    throw new Error('AULA_PACKAGE_EVALUATION_INCOMPLETE');
  for (const record of evaluation.implementation)
    if (record.sha256 !== digest(readFileSync(assertContainedInputFileV1(root, record.ref))))
      throw new Error('AULA_IMPLEMENTATION_EVALUATION_STALE');
  for (const item of manifest.skills) {
    const entry = registry.entries.find((entry) => entry.skill_id === item.name);
    const record = evaluation.packages.find((item) => item.skillId === entry.skill_id);
    if (
      !record ||
      record.contentSha256 !== entry.content_sha256 ||
      record.packageManifestSha256 !== entry.package_manifest_sha256 ||
      record.contentSha256 !== digest(readFileSync(`skills/${item.name}/SKILL.md`)) ||
      record.packageManifestSha256 !== io.aulaPackageDigestV1(root, item.name)
    )
      throw new Error('AULA_EVALUATION_STALE');
    if (!['evaluated', 'active'].includes(entry.current_state))
      throw new Error('AULA_EVALUATED_STATE_REQUIRED');
  }
  for (const item of manifest.skills) {
    transition(
      item.name,
      'active',
      review.actorId,
      registry.entries.find((entry) => entry.skill_id === item.name).current_state === 'active'
        ? 'freeze_verified_local_package_successor'
        : 'approved_plan_and_independent_review_local_draft_only',
      [evaluationRef, reviewRef],
    );
    for (const file of ['SKILL.md', 'LINEAGE.yml']) {
      const ref = `skills/${item.name}/${file}`;
      const value = readFileSync(ref, 'utf8')
        .replace('lifecycle_state: candidate', 'lifecycle_state: active')
        .replace('execution_scope: local-evaluation', 'execution_scope: local-draft-generation');
      if (value !== readFileSync(ref, 'utf8')) writeFileSync(ref, value);
    }
  }
  const capRef = '04_estado/registries/renderers/aula-decks-capability-v1.json';
  const cap = JSON.parse(readFileSync(capRef, 'utf8'));
  Object.assign(cap, {
    lifecycleState: 'active',
    scope: 'local-draft-generation',
    readinessEligible: true,
    readinessScope: 'RENDERED_DRAFT only; human approval remains manual',
  });
  writeFileSync(capRef, JSON.stringify(cap, null, 2) + '\n');
}
writeFileSync(registryRef, text);
console.log(`PASS Aula ${mode}; immutable previous events preserved.`);
