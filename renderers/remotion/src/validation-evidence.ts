import {createHash} from 'node:crypto';

import {z} from 'zod';

const sha256 = (value: string): string => createHash('sha256').update(value).digest('hex');
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

export const validationCommandEvidenceSchema = z.strictObject({
  schemaVersion: z.literal('validation-command-evidence-v1'),
  evidenceId: z.string().regex(/^EVD-REMOTION-VS001-[A-Z0-9-]+$/u),
  projectId: z.literal('vs-001-source-to-campaign'),
  command: portableCommandSchema,
  status: z.enum(['PASS', 'FAIL']),
  exitCode: z.number().int().nullable(),
  stdoutSha256: z.string().regex(/^[a-f0-9]{64}$/u),
  stderrSha256: z.string().regex(/^[a-f0-9]{64}$/u),
  sanitizedSummary: z.strictObject({
    stdoutBytes: z.number().int().nonnegative(),
    stderrBytes: z.number().int().nonnegative(),
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
  stdoutSha256: z.string().regex(/^[a-f0-9]{64}$/u),
  stderrSha256: z.string().regex(/^[a-f0-9]{64}$/u),
  evidenceId: z.string().regex(/^EVD-REMOTION-VS001-[A-Z0-9-]+$/u),
  evidenceRef: z
    .string()
    .regex(portableJsonPathPattern)
    .refine((path) => !path.includes('/validation-logs/')),
  evidenceSha256: z.string().regex(/^[a-f0-9]{64}$/u),
});

export type ValidationCommandResult = z.infer<typeof validationCommandResultSchema>;

interface BuildValidationCommandEvidenceInput {
  readonly id: string;
  readonly command: string;
  readonly status: 'PASS' | 'FAIL';
  readonly exitCode: number | null;
  readonly stdout: string;
  readonly stderr: string;
}

export const buildValidationCommandEvidence = ({
  id,
  command,
  status,
  exitCode,
  stdout,
  stderr,
}: BuildValidationCommandEvidenceInput): ValidationCommandEvidence =>
  validationCommandEvidenceSchema.parse({
    schemaVersion: 'validation-command-evidence-v1',
    evidenceId: `EVD-REMOTION-VS001-${id.toUpperCase()}`,
    projectId: 'vs-001-source-to-campaign',
    command,
    status,
    exitCode,
    stdoutSha256: sha256(stdout),
    stderrSha256: sha256(stderr),
    sanitizedSummary: {
      stdoutBytes: Buffer.byteLength(stdout, 'utf8'),
      stderrBytes: Buffer.byteLength(stderr, 'utf8'),
      rawOutputPersistedInVersionableEvidence: false,
      absolutePathsPersisted: false,
      privateDiagnosticLogPolicy: 'ignored_not_referenced',
    },
    stateEffect: 'NONE_ON_GOVERNED_WORKFLOW',
    createdAt: '2026-07-19T12:00:00.000Z',
  });

export const serializeValidationCommandEvidence = (evidence: ValidationCommandEvidence): string =>
  `${JSON.stringify(validationCommandEvidenceSchema.parse(evidence), null, 2)}\n`;

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
    evidence.stdoutSha256 !== commandResult.stdoutSha256 ||
    evidence.stderrSha256 !== commandResult.stderrSha256
  ) {
    throw new Error(`Validation evidence fields drifted for ${commandResult.evidenceId}.`);
  }
  return evidence;
};
