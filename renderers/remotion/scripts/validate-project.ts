import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdirSync, readFileSync, readdirSync, statSync, writeFileSync} from 'node:fs';
import {dirname, join, relative, resolve} from 'node:path';
import {format, resolveConfig} from 'prettier';

import {
  buildValidationCommandEvidence,
  serializeValidationCommandEvidence,
  validationCommandResultSchema,
  validationTestReportSchema,
} from '../src/validation-evidence.ts';

interface CommandResult {
  readonly command: string;
  readonly status: 'PASS' | 'FAIL';
  readonly exitCode: number | null;
  readonly normalizationProfile: 'portable-command-output-v1';
  readonly semanticOutputKind: 'portable-text' | 'vitest-summary' | 'remotion-version-alignment';
  readonly stdoutSemanticSha256: string;
  readonly stderrSemanticSha256: string;
  readonly stdoutSemanticBytes: number;
  readonly stderrSemanticBytes: number;
  readonly evidenceId: string;
  readonly evidenceRef: string;
  readonly evidenceSha256: string;
}

const root = process.cwd();
const prettierConfig = (await resolveConfig(resolve(root, '.prettierrc.json'))) ?? {};
const projectRelative = 'projects/vs-001-source-to-campaign/remotion';
const receiptRelative = `${projectRelative}/receipts/test-report.json`;
const privateLogRootRelative = `${projectRelative}/receipts/validation-logs`;
const evidenceRootRelative = `${projectRelative}/receipts/validation-evidence`;

const sha256 = (value: Uint8Array | string): string =>
  createHash('sha256').update(value).digest('hex');
const writeText = (relativePath: string, content: string): void => {
  const path = resolve(root, relativePath);
  mkdirSync(dirname(path), {recursive: true});
  writeFileSync(path, content.endsWith('\n') ? content : `${content}\n`, 'utf8');
};
const walk = (path: string): string[] =>
  readdirSync(path)
    .sort()
    .flatMap((name) => {
      const child = join(path, name);
      return statSync(child).isDirectory() ? walk(child) : [child];
    });

const validationRoots = [
  'networks/content/src',
  'renderers/remotion/scripts',
  'renderers/remotion/src',
  'tests/unit/remotion',
  'workflows/content',
  `${projectRelative}/src`,
] as const;
const validationFiles = [
  ...validationRoots.flatMap((path) => walk(resolve(root, path))),
  ...[
    `${projectRelative}/00-source-script.md`,
    `${projectRelative}/01-video-spec.yml`,
    `${projectRelative}/02-beat-map.yml`,
    `${projectRelative}/03-visual-philosophy.md`,
    `${projectRelative}/04-component-registry.yml`,
    `${projectRelative}/05-input-props.json`,
    `${projectRelative}/approvals/README.md`,
    `${projectRelative}/approvals/TEMPLATE.md`,
    `${projectRelative}/assets-manifest.yml`,
    `${projectRelative}/captions.json`,
    `${projectRelative}/committee/committee-decision.json`,
    'projects/vs-001-source-to-campaign/claims-ledger.yml',
    'projects/vs-001-source-to-campaign/content/build-receipt.json',
    'projects/vs-001-source-to-campaign/content/campaign-copy.json',
    'projects/vs-001-source-to-campaign/source-bundle.yml',
    'pnpm-lock.yaml',
  ].map((path) => resolve(root, path)),
]
  .map((path) => relative(root, path))
  .sort();
const sourceFiles = validationFiles.map((path) => ({
  path,
  sha256: sha256(readFileSync(resolve(root, path))),
}));
const sourceSetSha256 = sha256(
  sourceFiles.map(({path, sha256: digest}) => `${path}\t${digest}`).join('\n'),
);

const commands = [
  {
    id: 'typecheck',
    executable: 'pnpm',
    args: ['typecheck'],
  },
  {
    id: 'lint-a07-a08',
    executable: 'pnpm',
    args: [
      'exec',
      'eslint',
      'networks/content',
      'workflows/content',
      'renderers/remotion',
      `${projectRelative}/src`,
      'tests/unit/remotion',
    ],
  },
  {
    id: 'unit-a07-a08',
    executable: 'pnpm',
    args: ['exec', 'vitest', 'run', 'tests/unit/remotion'],
  },
  {
    id: 'determinism-policy',
    executable: 'pnpm',
    args: ['check:determinism'],
  },
  {
    id: 'remotion-version-alignment',
    executable: 'pnpm',
    args: ['exec', 'remotion', 'versions', '--log=verbose'],
  },
] as const;

const commandResults: CommandResult[] = commands.map(({id, executable, args}) => {
  const result = spawnSync(executable, args, {
    cwd: root,
    encoding: 'utf8',
    env: {...process.env, TZ: 'UTC'},
    maxBuffer: 32 * 1024 * 1024,
  });
  const stdout = result.stdout ?? '';
  const stderr = result.stderr ?? '';
  const privateLogRef = `${privateLogRootRelative}/${id}.log`;
  writeText(
    privateLogRef,
    [
      `$ ${executable} ${args.join(' ')}`,
      `exit_code=${result.status ?? 'null'}`,
      '',
      '[stdout]',
      stdout,
      '[stderr]',
      stderr,
    ].join('\n'),
  );
  const command = `${executable} ${args.join(' ')}`;
  const status = result.status === 0 ? 'PASS' : 'FAIL';
  const evidence = buildValidationCommandEvidence({
    id,
    command,
    status,
    exitCode: result.status,
    stdout,
    stderr,
    repositoryRoot: root,
  });
  const evidenceId = evidence.evidenceId;
  const evidenceRef = `${evidenceRootRelative}/${id}.json`;
  const evidenceText = serializeValidationCommandEvidence(evidence);
  writeText(evidenceRef, evidenceText);
  return validationCommandResultSchema.parse({
    command,
    status,
    exitCode: result.status,
    normalizationProfile: evidence.normalizationProfile,
    semanticOutputKind: evidence.semanticOutputKind,
    stdoutSemanticSha256: evidence.stdoutSemanticSha256,
    stderrSemanticSha256: evidence.stderrSemanticSha256,
    stdoutSemanticBytes: evidence.semanticSummary.stdoutSemanticBytes,
    stderrSemanticBytes: evidence.semanticSummary.stderrSemanticBytes,
    evidenceId,
    evidenceRef,
    evidenceSha256: sha256(evidenceText),
  });
});

const passed = commandResults.every(({status}) => status === 'PASS');
const report = validationTestReportSchema.parse({
  schema_version: 2,
  report_contract: 'validation-test-report-v2',
  report_id: 'TEST-REPORT-REMOTION-VS001-001',
  project_id: 'vs-001-source-to-campaign',
  governed_workflow_state: 'BLOCKED_BEFORE_SOURCE_LOCK',
  technical_validation_state: passed ? 'BUILD_VALIDATED' : 'BUILD_FAILED',
  state_effect: 'NONE_ON_GOVERNED_WORKFLOW',
  source_set_sha256: sourceSetSha256,
  source_files: sourceFiles,
  commands: commandResults,
  status: passed ? 'PASS' : 'FAIL',
  created_at: '2026-07-19T12:00:00.000Z',
});
writeText(
  receiptRelative,
  await format(JSON.stringify(report), {...prettierConfig, parser: 'json'}),
);

if (!passed) {
  throw new Error(`A07/A08 validation failed; inspect ${receiptRelative}.`);
}
console.info(`PASS BUILD VALIDATION: ${sourceFiles.length} inputs ${sourceSetSha256}.`);
