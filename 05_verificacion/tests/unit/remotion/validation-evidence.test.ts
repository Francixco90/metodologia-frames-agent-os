import {describe, expect, it} from 'vitest';

import {
  appendOnlyEvidenceMigrationSchema,
  assertAppendOnlyRecordReplay,
  buildAppendOnlyEvidenceMigration,
  evidenceRemediationBaselines,
} from '../../../../renderers/remotion/src/append-only-evidence.ts';
import {
  buildValidationCommandEvidence,
  serializeValidationCommandEvidence,
  validationCommandEvidenceSchema,
  validationCommandResultSchema,
  verifyValidationCommandEvidenceBinding,
} from '../../../../renderers/remotion/src/validation-evidence.ts';

const repoA = ['', 'Users', 'operator', 'checkout-a'].join('/');
const repoB = ['', 'home', 'runner', 'work', 'checkout-b'].join('/');
const vitestCommand = 'pnpm exec vitest run tests/unit/remotion';
const remotionVersionsCommand = 'pnpm exec remotion versions --log=verbose';

const vitestOutput = (root: string, start: string, duration: string): string => `
 RUN  v4.1.10 ${root}

 Test Files  8 passed (8)
      Tests  63 passed (63)
   Start at  ${start}
   Duration  ${duration} (transform 301ms, setup 0ms, import 546ms, tests 107ms)
`;

const remotionVersionsOutput = (root: string, optionalPackages: readonly string[]): string => `
Remotion root directory: ${root}
No config file loaded.

On version: 4.0.494
${optionalPackages.map((name) => `- ${name}\n  ${root}/node_modules/${name}/package.json`).join('\n')}

All packages have the correct version.
Cleaning up...
`;

const passingStdoutFor = (command: string, root: string): string => {
  if (command === vitestCommand) return vitestOutput(root, '23:20:17', '256ms');
  if (command === remotionVersionsCommand) {
    return remotionVersionsOutput(root, ['@remotion/cli', '@remotion/renderer', 'remotion']);
  }
  return '';
};

const buildPassingEvidence = (command: string, repositoryRoot = repoA) =>
  buildValidationCommandEvidence({
    id: 'portable-command',
    command,
    status: 'PASS',
    exitCode: 0,
    stdout: passingStdoutFor(command, repositoryRoot),
    stderr: '',
    repositoryRoot,
  });

describe('portable Remotion validation evidence', () => {
  it.each([
    'pnpm typecheck',
    'pnpm check:determinism',
    remotionVersionsCommand,
    'pnpm exec eslint renderers/remotion tests/unit/remotion',
    vitestCommand,
  ])('accepts the portable governed command: %s', (command) => {
    expect(() => buildPassingEvidence(command)).not.toThrow();
  });

  it('produces byte-identical Vitest evidence across roots, clocks and timings', () => {
    const first = buildValidationCommandEvidence({
      id: 'unit-a07-a08',
      command: vitestCommand,
      status: 'PASS',
      exitCode: 0,
      stdout: vitestOutput(repoA, '23:18:14', '250ms'),
      stderr: '',
      repositoryRoot: repoA,
    });
    const second = buildValidationCommandEvidence({
      id: 'unit-a07-a08',
      command: vitestCommand,
      status: 'PASS',
      exitCode: 0,
      stdout: vitestOutput(repoB, '01:02:03', '999ms'),
      stderr: '',
      repositoryRoot: repoB,
    });

    expect(serializeValidationCommandEvidence(first)).toBe(
      serializeValidationCommandEvidence(second),
    );
    expect(first.semanticOutputKind).toBe('vitest-summary');
  });

  it('produces byte-identical Remotion evidence across roots and optional package inventories', () => {
    const first = buildValidationCommandEvidence({
      id: 'remotion-version-alignment',
      command: remotionVersionsCommand,
      status: 'PASS',
      exitCode: 0,
      stdout: remotionVersionsOutput(repoA, [
        '@remotion/cli',
        '@remotion/renderer',
        '@remotion/compositor-linux-x64-gnu',
        'remotion',
      ]),
      stderr: '',
      repositoryRoot: repoA,
    });
    const second = buildValidationCommandEvidence({
      id: 'remotion-version-alignment',
      command: remotionVersionsCommand,
      status: 'PASS',
      exitCode: 0,
      stdout: remotionVersionsOutput(repoB, ['@remotion/cli', '@remotion/renderer', 'remotion']),
      stderr: '',
      repositoryRoot: repoB,
    });

    expect(serializeValidationCommandEvidence(first)).toBe(
      serializeValidationCommandEvidence(second),
    );
    expect(first.semanticOutputKind).toBe('remotion-version-alignment');
  });

  it('persists semantic digests, not raw output or private locators', () => {
    const evidence = buildPassingEvidence(remotionVersionsCommand, repoA);
    const serialized = serializeValidationCommandEvidence(evidence);

    expect(serialized).not.toContain(repoA);
    expect(serialized).not.toContain('stdoutSha256');
    expect(serialized).not.toContain('stdoutBytes');
    expect(evidence.stdoutSemanticSha256).toMatch(/^[a-f0-9]{64}$/u);
    expect(evidence.normalizationProfile).toBe('portable-command-output-v1');
    expect(evidence.semanticSummary).toMatchObject({
      rawOutputPersistedInVersionableEvidence: false,
      absolutePathsPersisted: false,
      privateDiagnosticLogPolicy: 'ignored_not_referenced',
    });
  });

  it.each([
    'On version: 4.0.494\n',
    'All packages have the correct version.\n',
    'On version: 4.0.493\nOn version: 4.0.494\nAll packages have the correct version.\n',
  ])('fails closed when Remotion alignment facts are incomplete or ambiguous', (stdout) => {
    expect(() =>
      buildValidationCommandEvidence({
        id: 'remotion-version-alignment',
        command: remotionVersionsCommand,
        status: 'PASS',
        exitCode: 0,
        stdout,
        stderr: '',
        repositoryRoot: repoA,
      }),
    ).toThrow(/Remotion version evidence/u);
  });

  it('rejects legacy raw-output and logRef fields from versionable evidence', () => {
    const evidence = buildPassingEvidence('pnpm typecheck');

    expect(() =>
      validationCommandEvidenceSchema.parse({
        ...evidence,
        stdoutSha256: '0'.repeat(64),
      }),
    ).toThrow();
    expect(() =>
      validationCommandEvidenceSchema.parse({
        ...evidence,
        logRef: 'ignored.log',
      }),
    ).toThrow();
  });

  it('fails closed when a versionable evidence digest or field drifts', () => {
    const evidence = buildPassingEvidence('pnpm typecheck');
    const evidenceText = serializeValidationCommandEvidence(evidence);
    const result = validationCommandResultSchema.parse({
      command: evidence.command,
      status: evidence.status,
      exitCode: evidence.exitCode,
      normalizationProfile: evidence.normalizationProfile,
      semanticOutputKind: evidence.semanticOutputKind,
      stdoutSemanticSha256: evidence.stdoutSemanticSha256,
      stderrSemanticSha256: evidence.stderrSemanticSha256,
      stdoutSemanticBytes: evidence.semanticSummary.stdoutSemanticBytes,
      stderrSemanticBytes: evidence.semanticSummary.stderrSemanticBytes,
      evidenceId: evidence.evidenceId,
      evidenceRef:
        'projects/vs-001-source-to-campaign/remotion/receipts/validation-evidence/typecheck-v2.json',
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

  it('replays identical append-only bytes and rejects changed bytes under the same ID', () => {
    const evidence = buildPassingEvidence('pnpm typecheck');
    const original = serializeValidationCommandEvidence(evidence);
    const changed = `${JSON.stringify({...evidence, status: 'FAIL'}, null, 2)}\n`;
    const identity = {field: 'evidenceId' as const, id: evidence.evidenceId};

    expect(() => assertAppendOnlyRecordReplay(original, original, identity)).not.toThrow();
    expect(() => assertAppendOnlyRecordReplay(original, changed, identity)).toThrow(
      /already exists with different bytes/u,
    );
  });

  it('requires a complete seven-record supersession map with new paths and IDs', () => {
    const replacementHashes = Object.fromEntries(
      evidenceRemediationBaselines.map(({replacement}, index) => [
        replacement.path,
        String(index + 1).padStart(64, '0'),
      ]),
    );
    const migration = buildAppendOnlyEvidenceMigration(replacementHashes);

    expect(migration.supersessions).toHaveLength(7);
    expect(migration.historyIntegrity).toMatchObject({
      historyWasImmutable: false,
      accidentalSameIdReuseObserved: true,
      originalBytesRestored: true,
      replacementSameIdReuse: false,
    });
    expect(() =>
      appendOnlyEvidenceMigrationSchema.parse({
        ...migration,
        supersessions: migration.supersessions.slice(0, -1),
      }),
    ).toThrow();
    expect(() =>
      appendOnlyEvidenceMigrationSchema.parse({
        ...migration,
        supersessions: migration.supersessions.map((record, index) =>
          index === 0
            ? {
                ...record,
                replacement: {...record.replacement, id: record.original.id},
              }
            : record,
        ),
      }),
    ).toThrow(/new path and a new ID/u);
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
        repositoryRoot: repoA,
      }),
    ).toThrow(/absolute or private locators/u);
  });
});
