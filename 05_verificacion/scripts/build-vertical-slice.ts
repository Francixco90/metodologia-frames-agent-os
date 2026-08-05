import {execFileSync, spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';

type Step = {
  readonly id: string;
  readonly entry: string;
};

const root = process.cwd();
const baselineCommit = '4c8c16820aa3abe9f4089a1f88c093e2ea58140f';
const verifyExisting = process.argv.includes('--verify-existing');
const steps: readonly Step[] = [
  {
    id: 'notebooklm-read-only-contract',
    entry: 'adapters/notebooklm/scripts/check-contract.mjs',
  },
  {
    id: 'remotion-skill-contracts',
    entry: 'skills/remotion-video-production/scripts/check-contracts.mjs',
  },
  {
    id: 'remotion-skill-router',
    entry: 'skills/remotion-video-production/scripts/check-skill.mjs',
  },
  {
    id: 'remotion-skill-example',
    entry: 'skills/remotion-video-production/scripts/check-example.mjs',
  },
  {
    id: 'remotion-skill-sources',
    entry: 'skills/remotion-video-production/scripts/check-sources.mjs',
  },
  {
    id: 'legacy-skill-quarantine',
    entry: 'skills/stitch-remotion-walkthrough/scripts/check-quarantine.mjs',
  },
  {
    id: 'creative-committee',
    entry: 'projects/vs-001-source-to-campaign/remotion/committee/validate-committee.ts',
  },
  {id: 'content-build', entry: 'workflows/content/build.ts'},
  {id: 'web-build', entry: 'workflows/web/build.ts'},
  {
    id: 'remotion-preflight',
    entry: 'renderers/remotion/scripts/prepare-project.ts',
  },
  {id: 'sources-gate', entry: 'scripts/check-sources.ts'},
  {id: 'claims-gate', entry: 'scripts/check-claims.ts'},
  {id: 'dag-gate', entry: 'scripts/check-dag.ts'},
  {id: 'ownership-gate', entry: 'scripts/check-ownership.ts'},
  {id: 'projects-gate', entry: 'scripts/check-projects.ts'},
  {id: 'memory-gate', entry: 'scripts/check-memory.ts'},
  {id: 'privacy-gate', entry: 'scripts/check-privacy.ts'},
  {id: 'determinism-static-gate', entry: 'scripts/check-determinism.ts'},
  {id: 'n8n-dry-run-gate', entry: 'scripts/check-n8n.ts'},
] as const;

const sha256 = (value: Uint8Array | string): string =>
  createHash('sha256').update(value).digest('hex');

const mutatingStepIds = new Set(['content-build', 'web-build', 'remotion-preflight']);
const selectedSteps = verifyExisting ? steps.filter(({id}) => !mutatingStepIds.has(id)) : steps;

for (const step of selectedSteps) {
  const result = spawnSync(process.execPath, ['--import', 'tsx', step.entry], {
    cwd: root,
    encoding: 'utf8',
  });
  const output = `${result.stdout}${result.stderr}`.trim();
  if (output.length > 0) {
    console.info(`[${step.id}]\n${output}`);
  }
  if (result.status !== 0) {
    throw new Error(`Vertical slice detenido en ${step.id} (${step.entry}).`);
  }
}

const outputPaths = [
  'projects/vs-001-source-to-campaign/content/campaign-copy.json',
  'projects/vs-001-source-to-campaign/content/build-receipt.json',
  'projects/vs-001-source-to-campaign/web/artifact/index.html',
  'projects/vs-001-source-to-campaign/web/artifact/build-receipt.json',
  'projects/vs-001-source-to-campaign/remotion/00-source-script.md',
  'projects/vs-001-source-to-campaign/remotion/01-video-spec.yml',
  'projects/vs-001-source-to-campaign/remotion/02-beat-map.yml',
  'projects/vs-001-source-to-campaign/remotion/03-visual-philosophy.md',
  'projects/vs-001-source-to-campaign/remotion/04-component-registry.yml',
  'projects/vs-001-source-to-campaign/remotion/05-input-props.json',
  'projects/vs-001-source-to-campaign/remotion/assets-manifest.yml',
  'projects/vs-001-source-to-campaign/remotion/captions.json',
  'projects/vs-001-source-to-campaign/remotion/committee/committee-decision.json',
  'projects/vs-001-source-to-campaign/remotion/receipts/preflight-render-input.json',
] as const;

const outputs = outputPaths.map((path) => ({
  path,
  sha256: sha256(readFileSync(resolve(root, path))),
}));
if (verifyExisting) {
  const drift = outputs.filter(({path, sha256: currentSha256}) => {
    const baseline = execFileSync('git', ['show', `${baselineCommit}:${path}`], {
      cwd: root,
      maxBuffer: 64 * 1024 * 1024,
    });
    return currentSha256 !== sha256(baseline);
  });
  if (drift.length > 0) {
    throw new Error(`VS-001 compatibility drift: ${drift.map(({path}) => path).join(', ')}`);
  }
  console.info(
    `PASS VS-001 COMPATIBILITY: ${String(outputs.length)} historical outputs remain byte-identical.`,
  );
  process.exit(0);
}
const aggregateSha256 = sha256(
  outputs.map(({path, sha256: digest}) => `${path}:${digest}`).join('\n'),
);
const receiptId = `RCP-VS001-PREFLIGHT-${aggregateSha256.slice(0, 12).toUpperCase()}`;
const receipt = {
  schemaVersion: 1,
  receiptId,
  projectId: 'vs-001-source-to-campaign',
  producerActorId: 'RT-01',
  state: 'PREFLIGHT_VALIDATED',
  visibleWorkProductState: 'RENDERED_DRAFT',
  generatedAt: '2026-07-19T12:00:00.000Z',
  stepCount: selectedSteps.length,
  steps: selectedSteps.map(({id, entry}) => ({id, entry, status: 'passed'})),
  outputs,
  aggregateSha256,
  sourceLocked: false,
  guardianPassed: false,
  humanApproved: false,
  publishAuthorized: false,
  coverageGaps: [
    'four_canonical_texts_missing_0_of_4',
    'remotion_commercial_license_eligibility_unresolved',
    'guardian_and_human_approval_absent',
    'external_distribution_not_authorized',
  ],
};
const receiptPath = resolve(root, `receipts/builds/${receiptId}.json`);
mkdirSync(dirname(receiptPath), {recursive: true});
const receiptBytes = `${JSON.stringify(receipt, null, 2)}\n`;
if (existsSync(receiptPath)) {
  const existing = readFileSync(receiptPath, 'utf8');
  if (existing !== receiptBytes) {
    throw new Error(`Append-only receipt collision: ${receiptId}`);
  }
} else {
  writeFileSync(receiptPath, receiptBytes, 'utf8');
}

console.info(
  `PASS VERTICAL SLICE PREFLIGHT: ${selectedSteps.length} pasos, ${outputs.length} outputs, ${aggregateSha256}.`,
);
