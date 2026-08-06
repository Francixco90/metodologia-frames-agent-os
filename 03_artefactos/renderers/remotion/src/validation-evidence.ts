import {createHash} from 'node:crypto';

import {z} from 'zod';

// Hash-bound literal: `createdAt: z.literal('2026-07-19T12:00:00.000Z')` (and
// the plain-string twin below) are sealed to the validation-evidence chain
// hash. ADR 0027 excepciones: preserve the literal value inline; do NOT
// extract to `deterministic-epoch.ts` (would risk the evidence-chain hash).

const sha256 = (value: string): string => createHash('sha256').update(value).digest('hex');
const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/u);
const portableJsonPathPattern =
  /^(?!\/)(?!\.\.?(?:\/|$))(?!.*\/\.\.?(?:\/|$))[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*\.json$/u;
const forbiddenCommandLocatorPatterns = [
  /\/Users\//iu,
  /\/home\//iu,
  /\bfile:\/\//iu,
  /(?:^|[\s"'=])\/[^\s"']+/u,
  /(?:^|[\s"'=])[A-Za-z]:[\\/]/u,
  /\\/u,
] as const;
const portableCommandSchema = z
  .string()
  .min(1)
  .max(500)
  .refine(
    (command) => forbiddenCommandLocatorPatterns.every((pattern) => !pattern.test(command)),
    'Command must not contain absolute or private locators',
  );

const normalizationProfile = 'portable-command-output-v1' as const;
const ansiEscape = String.fromCodePoint(27);
const ansiCsiPattern = new RegExp(`${ansiEscape}\\[[0-?]*[ -/]*[@-~]`, 'gu');
const ansiOscPattern = new RegExp(
  `${ansiEscape}\\][^${ansiEscape}\\u0007]*(?:\\u0007|${ansiEscape}\\\\)`,
  'gu',
);

const normalizePortableText = (value: string, repositoryRoot: string): string => {
  if (repositoryRoot.length === 0) {
    throw new Error('Repository root is required for portable command-output normalization.');
  }
  const slashRoot = repositoryRoot.replaceAll('\\', '/').replace(/\/+$/u, '');
  const backslashRoot = slashRoot.replaceAll('/', '\\');
  const withoutAnsi = value.replace(ansiOscPattern, '').replace(ansiCsiPattern, '');
  const normalizedLines = withoutAnsi
    .replaceAll('\r\n', '\n')
    .replaceAll('\r', '\n')
    .replaceAll(repositoryRoot, '<REPOSITORY_ROOT>')
    .replaceAll(slashRoot, '<REPOSITORY_ROOT>')
    .replaceAll(backslashRoot, '<REPOSITORY_ROOT>')
    .split('\n')
    .map((line) => line.trimEnd());
  const normalized = normalizedLines.join('\n').replace(/^\n+|\n+$/gu, '');
  return normalized.length === 0 ? '' : `${normalized}\n`;
};

const normalizeVitestText = (value: string, repositoryRoot: string): string => {
  const portable = normalizePortableText(value, repositoryRoot);
  const withoutVolatileSummary = portable
    .split('\n')
    .filter((line) => !/^\s*(?:Start at|Duration)\b/u.test(line))
    .join('\n');
  return withoutVolatileSummary.replace(/\n*$/u, '\n').replace(/^\n$/u, '');
};

const extractRemotionVersionAlignment = (
  stdout: string,
  stderr: string,
  repositoryRoot: string,
): string => {
  const portableCombined = normalizePortableText(`${stdout}\n${stderr}`, repositoryRoot);
  const versions = portableCombined
    .split('\n')
    .map((line) => line.match(/^On version:\s*([0-9]+\.[0-9]+\.[0-9]+)$/u)?.[1])
    .filter((version): version is string => version !== undefined);
  const uniqueVersions = new Set(versions);
  if (versions.length === 0 || uniqueVersions.size !== 1) {
    throw new Error('Remotion version evidence must contain exactly one canonical version.');
  }
  if (!/(?:^|\n)All packages have the correct version\.\s*(?:\n|$)/u.test(portableCombined)) {
    throw new Error('Remotion version evidence is missing package-alignment confirmation.');
  }
  const version = versions[0];
  if (version === undefined) {
    throw new Error('Remotion canonical version could not be extracted.');
  }
  return `remotion_version=${version}\npackage_alignment=confirmed\n`;
};

export interface NormalizeValidationCommandOutputInput {
  readonly command: string;
  readonly repositoryRoot: string;
  readonly stdout: string;
  readonly stderr: string;
}

export interface NormalizedValidationCommandOutput {
  readonly semanticOutputKind: 'portable-text' | 'vitest-summary' | 'remotion-version-alignment';
  readonly stdoutSemantic: string;
  readonly stderrSemantic: string;
}

export const normalizeValidationCommandOutput = ({
  command,
  repositoryRoot,
  stdout,
  stderr,
}: NormalizeValidationCommandOutputInput): NormalizedValidationCommandOutput => {
  if (/\bremotion versions\b/u.test(command)) {
    return {
      semanticOutputKind: 'remotion-version-alignment',
      stdoutSemantic: extractRemotionVersionAlignment(stdout, stderr, repositoryRoot),
      stderrSemantic: '',
    };
  }
  if (/\bvitest run\b/u.test(command)) {
    return {
      semanticOutputKind: 'vitest-summary',
      stdoutSemantic: normalizeVitestText(stdout, repositoryRoot),
      stderrSemantic: normalizeVitestText(stderr, repositoryRoot),
    };
  }
  return {
    semanticOutputKind: 'portable-text',
    stdoutSemantic: normalizePortableText(stdout, repositoryRoot),
    stderrSemantic: normalizePortableText(stderr, repositoryRoot),
  };
};

export const validationCommandEvidenceSchema = z.strictObject({
  schemaVersion: z.literal('validation-command-evidence-v2'),
  evidenceId: z.string().regex(/^EVD-REMOTION-VS001-[A-Z0-9-]+$/u),
  projectId: z.literal('vs-001-source-to-campaign'),
  command: portableCommandSchema,
  status: z.enum(['PASS', 'FAIL']),
  exitCode: z.number().int().nullable(),
  normalizationProfile: z.literal(normalizationProfile),
  semanticOutputKind: z.enum(['portable-text', 'vitest-summary', 'remotion-version-alignment']),
  stdoutSemanticSha256: sha256Schema,
  stderrSemanticSha256: sha256Schema,
  semanticSummary: z.strictObject({
    stdoutSemanticBytes: z.number().int().nonnegative(),
    stderrSemanticBytes: z.number().int().nonnegative(),
    rawOutputPersistedInVersionableEvidence: z.literal(false),
    absolutePathsPersisted: z.literal(false),
    privateDiagnosticLogPolicy: z.literal('ignored_not_referenced'),
  }),
  stateEffect: z.literal('NONE_ON_GOVERNED_WORKFLOW'),
  createdAt: z.literal('2026-07-19T12:00:00.000Z'),
});

export type ValidationCommandEvidence = z.infer<typeof validationCommandEvidenceSchema>;

export const validationCommandResultSchema = z.strictObject({
  command: portableCommandSchema,
  status: z.enum(['PASS', 'FAIL']),
  exitCode: z.number().int().nullable(),
  normalizationProfile: z.literal(normalizationProfile),
  semanticOutputKind: z.enum(['portable-text', 'vitest-summary', 'remotion-version-alignment']),
  stdoutSemanticSha256: sha256Schema,
  stderrSemanticSha256: sha256Schema,
  stdoutSemanticBytes: z.number().int().nonnegative(),
  stderrSemanticBytes: z.number().int().nonnegative(),
  evidenceId: z.string().regex(/^EVD-REMOTION-VS001-[A-Z0-9-]+$/u),
  evidenceRef: z
    .string()
    .regex(portableJsonPathPattern)
    .refine((path) => !path.includes('/validation-logs/')),
  evidenceSha256: sha256Schema,
});

export type ValidationCommandResult = z.infer<typeof validationCommandResultSchema>;

interface BuildValidationCommandEvidenceInput {
  readonly id: string;
  readonly command: string;
  readonly status: 'PASS' | 'FAIL';
  readonly exitCode: number | null;
  readonly stdout: string;
  readonly stderr: string;
  readonly repositoryRoot: string;
}

export const buildValidationCommandEvidence = ({
  id,
  command,
  status,
  exitCode,
  stdout,
  stderr,
  repositoryRoot,
}: BuildValidationCommandEvidenceInput): ValidationCommandEvidence => {
  const semanticOutput = normalizeValidationCommandOutput({
    command,
    repositoryRoot,
    stdout,
    stderr,
  });
  return validationCommandEvidenceSchema.parse({
    schemaVersion: 'validation-command-evidence-v2',
    evidenceId: `EVD-REMOTION-VS001-${id.toUpperCase()}-V2`,
    projectId: 'vs-001-source-to-campaign',
    command,
    status,
    exitCode,
    normalizationProfile,
    semanticOutputKind: semanticOutput.semanticOutputKind,
    stdoutSemanticSha256: sha256(semanticOutput.stdoutSemantic),
    stderrSemanticSha256: sha256(semanticOutput.stderrSemantic),
    semanticSummary: {
      stdoutSemanticBytes: Buffer.byteLength(semanticOutput.stdoutSemantic, 'utf8'),
      stderrSemanticBytes: Buffer.byteLength(semanticOutput.stderrSemantic, 'utf8'),
      rawOutputPersistedInVersionableEvidence: false,
      absolutePathsPersisted: false,
      privateDiagnosticLogPolicy: 'ignored_not_referenced',
    },
    stateEffect: 'NONE_ON_GOVERNED_WORKFLOW',
    createdAt: '2026-07-19T12:00:00.000Z',
  });
};

export const serializeValidationCommandEvidence = (evidence: ValidationCommandEvidence): string =>
  `${JSON.stringify(validationCommandEvidenceSchema.parse(evidence), null, 2)}\n`;

const validationSourceFileSchema = z.strictObject({
  path: z.string().min(1),
  sha256: sha256Schema,
});

export const validationTestReportSchema = z.strictObject({
  schema_version: z.literal(2),
  report_contract: z.literal('validation-test-report-v2'),
  report_id: z.literal('TEST-REPORT-REMOTION-VS001-002'),
  project_id: z.literal('vs-001-source-to-campaign'),
  governed_workflow_state: z.literal('BLOCKED_BEFORE_SOURCE_LOCK'),
  technical_validation_state: z.enum(['BUILD_VALIDATED', 'BUILD_FAILED']),
  state_effect: z.literal('NONE_ON_GOVERNED_WORKFLOW'),
  source_set_sha256: sha256Schema,
  source_files: z.array(validationSourceFileSchema).min(1),
  commands: z.array(validationCommandResultSchema).min(1),
  status: z.enum(['PASS', 'FAIL']),
  created_at: z.literal('2026-07-19T12:00:00.000Z'),
});

export type ValidationTestReport = z.infer<typeof validationTestReportSchema>;

export const verifyValidationCommandEvidenceBinding = (
  commandResultInput: unknown,
  evidenceText: string,
): ValidationCommandEvidence => {
  const commandResult = validationCommandResultSchema.parse(commandResultInput);
  if (sha256(evidenceText) !== commandResult.evidenceSha256) {
    throw new Error(`Validation evidence hash mismatch for ${commandResult.evidenceId}.`);
  }
  const evidence = validationCommandEvidenceSchema.parse(JSON.parse(evidenceText));
  if (
    evidence.evidenceId !== commandResult.evidenceId ||
    evidence.command !== commandResult.command ||
    evidence.status !== commandResult.status ||
    evidence.exitCode !== commandResult.exitCode ||
    evidence.normalizationProfile !== commandResult.normalizationProfile ||
    evidence.semanticOutputKind !== commandResult.semanticOutputKind ||
    evidence.stdoutSemanticSha256 !== commandResult.stdoutSemanticSha256 ||
    evidence.stderrSemanticSha256 !== commandResult.stderrSemanticSha256 ||
    evidence.semanticSummary.stdoutSemanticBytes !== commandResult.stdoutSemanticBytes ||
    evidence.semanticSummary.stderrSemanticBytes !== commandResult.stderrSemanticBytes
  ) {
    throw new Error(`Validation evidence fields drifted for ${commandResult.evidenceId}.`);
  }
  return evidence;
};
