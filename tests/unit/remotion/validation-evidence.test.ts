import {describe, expect, it} from 'vitest';

import {
  buildValidationCommandEvidence,
  serializeValidationCommandEvidence,
  validationCommandEvidenceSchema,
  validationCommandResultSchema,
  verifyValidationCommandEvidenceBinding,
} from '../../../renderers/remotion/src/validation-evidence.ts';

describe('portable Remotion validation evidence', () => {
  it.each([
    'pnpm typecheck',
    'pnpm check:determinism',
    'pnpm exec remotion versions --log=verbose',
    'pnpm exec eslint renderers/remotion tests/unit/remotion',
    'pnpm exec vitest run tests/unit/remotion',
  ])('accepts the portable governed command: %s', (command) => {
    expect(() =>
      buildValidationCommandEvidence({
        id: 'portable-command',
        command,
        status: 'PASS',
        exitCode: 0,
        stdout: '',
        stderr: '',
      }),
    ).not.toThrow();
  });

  it('persists only command identity, outcome, byte counts and output digests', () => {
    const privateOutput = ['/', 'Users', 'private-operator', 'workspace'].join('/');
    const evidence = buildValidationCommandEvidence({
      id: 'remotion-version-alignment',
      command: 'pnpm exec remotion versions --log=verbose',
      status: 'PASS',
      exitCode: 0,
      stdout: `Remotion root directory: ${privateOutput}`,
      stderr: '',
    });
    const serialized = serializeValidationCommandEvidence(evidence);

    expect(serialized).not.toContain(privateOutput);
    expect(serialized).not.toContain('.log');
    expect(evidence.stdoutSha256).toMatch(/^[a-f0-9]{64}$/u);
    expect(evidence.sanitizedSummary).toMatchObject({
      rawOutputPersistedInVersionableEvidence: false,
      absolutePathsPersisted: false,
      privateDiagnosticLogPolicy: 'ignored_not_referenced',
    });
  });

  it('rejects legacy logRef fields from versionable command evidence', () => {
    const evidence = buildValidationCommandEvidence({
      id: 'typecheck',
      command: 'pnpm typecheck',
      status: 'PASS',
      exitCode: 0,
      stdout: '',
      stderr: '',
    });

    expect(() =>
      validationCommandEvidenceSchema.parse({
        ...evidence,
        logRef: 'ignored.log',
      }),
    ).toThrow();
  });

  it('fails closed when a versionable evidence digest or field drifts', () => {
    const evidence = buildValidationCommandEvidence({
      id: 'typecheck',
      command: 'pnpm typecheck',
      status: 'PASS',
      exitCode: 0,
      stdout: '',
      stderr: '',
    });
    const evidenceText = serializeValidationCommandEvidence(evidence);
    const result = validationCommandResultSchema.parse({
      command: evidence.command,
      status: evidence.status,
      exitCode: evidence.exitCode,
      stdoutSha256: evidence.stdoutSha256,
      stderrSha256: evidence.stderrSha256,
      evidenceId: evidence.evidenceId,
      evidenceRef:
        'projects/vs-001-source-to-campaign/remotion/receipts/validation-evidence/typecheck.json',
      evidenceSha256: '0'.repeat(64),
    });

    expect(() => verifyValidationCommandEvidenceBinding(result, evidenceText)).toThrow(
      /hash mismatch/u,
    );
    expect(() =>
      validationCommandResultSchema.parse({
        ...result,
        evidenceRef:
          'projects/vs-001-source-to-campaign/remotion/receipts/validation-logs/typecheck.log',
      }),
    ).toThrow();
  });

  it.each([
    {
      case: 'macOS private home',
      command: ['pnpm exec tool ', '/', 'Users', '/', 'private', '/', 'project'].join(''),
    },
    {
      case: 'Linux private home',
      command: ['pnpm exec tool ', '/', 'home', '/', 'private', '/', 'project'].join(''),
    },
    {
      case: 'file URI',
      command: ['pnpm exec tool file:', '/', '/', '/', 'tmp', '/', 'project'].join(''),
    },
    {
      case: 'generic POSIX absolute path',
      command: ['pnpm exec tool --config=', '/', 'etc', '/', 'tool.json'].join(''),
    },
    {
      case: 'Windows drive locator',
      command: ['pnpm exec tool C:', '\\', 'Users', '\\', 'private', '\\', 'project'].join(''),
    },
    {
      case: 'Windows relative backslash locator',
      command: ['pnpm exec tool .', '\\', 'private', '\\', 'project'].join(''),
    },
  ])('rejects $case embedded in command', ({command}) => {
    expect(() =>
      buildValidationCommandEvidence({
        id: 'hostile-command',
        command,
        status: 'PASS',
        exitCode: 0,
        stdout: '',
        stderr: '',
      }),
    ).toThrow(/absolute or private locators/u);
  });
});
