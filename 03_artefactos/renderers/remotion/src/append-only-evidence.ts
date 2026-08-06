import {createHash} from 'node:crypto';
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';

import {z} from 'zod';

// Hash-bound literal: `createdAt: z.literal('2026-07-19T12:00:00.000Z')` is
// sealed to the append-only-evidence chain hash. ADR 0027 excepciones:
// preserve inline; do NOT extract to `deterministic-epoch.ts`.

const sha256 = (value: string): string => createHash('sha256').update(value).digest('hex');
const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/u);
const commitSchema = z.string().regex(/^[a-f0-9]{40}$/u);
const portableJsonPathSchema = z
  .string()
  .regex(
    /^(?!\/)(?!\.\.?(?:\/|$))(?!.*\/\.\.?(?:\/|$))[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*\.json$/u,
  );
const recordIdSchema = z.string().min(1).max(160);

export const APPEND_ONLY_MIGRATION_REF =
  'receipts/migrations/MIG-REMOTION-VS001-APPEND-ONLY-001.json' as const;
export const APPEND_ONLY_MIGRATION_ID = 'MIG-REMOTION-VS001-APPEND-ONLY-001' as const;
export const ORIGINAL_EVIDENCE_COMMIT = 'd4a90901de20c7e54cdaa6e76394f37654341bea' as const;
export const ACCIDENTAL_MUTATION_COMMIT = 'ce732781ae5602859679de72800ae05397e47ca0' as const;
export const INCIDENT_DETECTED_AT_COMMIT = '3ff73490f632d38648e6cd5edaa0223126381f26' as const;

export interface EvidenceRemediationBaseline {
  readonly recordKind: 'validation-command-evidence' | 'validation-test-report' | 'render-receipt';
  readonly original: {
    readonly path: string;
    readonly id: string;
    readonly sha256: string;
  };
  readonly accidentalMutation: {
    readonly path: string;
    readonly id: string;
    readonly sha256: string;
  };
  readonly replacement: {
    readonly path: string;
    readonly id: string;
  };
}

export const evidenceRemediationBaselines = [
  {
    recordKind: 'validation-test-report',
    original: {
      path: 'projects/vs-001-source-to-campaign/remotion/receipts/test-report.json',
      id: 'TEST-REPORT-REMOTION-VS001-001',
      sha256: 'bf7f62b6abc8af0950eb3d4876f2d58c03a483998baaa158e22a1d5482669510',
    },
    accidentalMutation: {
      path: 'projects/vs-001-source-to-campaign/remotion/receipts/test-report.json',
      id: 'TEST-REPORT-REMOTION-VS001-001',
      sha256: 'ee01cbf1195715a64436be827f57074753e04bf5574e9464877f210a07cd91ea',
    },
    replacement: {
      path: 'projects/vs-001-source-to-campaign/remotion/receipts/test-report-v2.json',
      id: 'TEST-REPORT-REMOTION-VS001-002',
    },
  },
  {
    recordKind: 'validation-command-evidence',
    original: {
      path: 'projects/vs-001-source-to-campaign/remotion/receipts/validation-evidence/typecheck.json',
      id: 'EVD-REMOTION-VS001-TYPECHECK',
      sha256: '9d0a4adf3f5c29ad6df5ab5846ce84628fabd44190efa424f1803b804c5465bc',
    },
    accidentalMutation: {
      path: 'projects/vs-001-source-to-campaign/remotion/receipts/validation-evidence/typecheck.json',
      id: 'EVD-REMOTION-VS001-TYPECHECK',
      sha256: 'bbc8ee81ade1ca0ed00b32e4b494b344f1dcb29f69f960f8ecf3a6ff2cfa6aa8',
    },
    replacement: {
      path: 'projects/vs-001-source-to-campaign/remotion/receipts/validation-evidence/typecheck-v2.json',
      id: 'EVD-REMOTION-VS001-TYPECHECK-V2',
    },
  },
  {
    recordKind: 'validation-command-evidence',
    original: {
      path: 'projects/vs-001-source-to-campaign/remotion/receipts/validation-evidence/lint-a07-a08.json',
      id: 'EVD-REMOTION-VS001-LINT-A07-A08',
      sha256: '6f3b5bbe4cef3d721c67a27070a669e4cca57bb151d386ae3809bbfce6c53a2e',
    },
    accidentalMutation: {
      path: 'projects/vs-001-source-to-campaign/remotion/receipts/validation-evidence/lint-a07-a08.json',
      id: 'EVD-REMOTION-VS001-LINT-A07-A08',
      sha256: 'babbc581c76db94c6ffec9792fe2dd60d5ee098e2f8d33af573588a5b7534d6c',
    },
    replacement: {
      path: 'projects/vs-001-source-to-campaign/remotion/receipts/validation-evidence/lint-a07-a08-v2.json',
      id: 'EVD-REMOTION-VS001-LINT-A07-A08-V2',
    },
  },
  {
    recordKind: 'validation-command-evidence',
    original: {
      path: 'projects/vs-001-source-to-campaign/remotion/receipts/validation-evidence/unit-a07-a08.json',
      id: 'EVD-REMOTION-VS001-UNIT-A07-A08',
      sha256: '1beddc5aa2bf0eb897760b200073e8289bdf219810bb77f8c66b1eae24ef136d',
    },
    accidentalMutation: {
      path: 'projects/vs-001-source-to-campaign/remotion/receipts/validation-evidence/unit-a07-a08.json',
      id: 'EVD-REMOTION-VS001-UNIT-A07-A08',
      sha256: 'bd6750dc958dffab6d2cbad11c3e97f39ec957baf8fc38a2bcce2dc0de17069f',
    },
    replacement: {
      path: 'projects/vs-001-source-to-campaign/remotion/receipts/validation-evidence/unit-a07-a08-v2.json',
      id: 'EVD-REMOTION-VS001-UNIT-A07-A08-V2',
    },
  },
  {
    recordKind: 'validation-command-evidence',
    original: {
      path: 'projects/vs-001-source-to-campaign/remotion/receipts/validation-evidence/determinism-policy.json',
      id: 'EVD-REMOTION-VS001-DETERMINISM-POLICY',
      sha256: 'da5db14f2da6f33ce6d08a74e2dfd3533cc6c1abda6c70e19f369918ac585471',
    },
    accidentalMutation: {
      path: 'projects/vs-001-source-to-campaign/remotion/receipts/validation-evidence/determinism-policy.json',
      id: 'EVD-REMOTION-VS001-DETERMINISM-POLICY',
      sha256: '08ef17f91dcf1e8d695b1c9c95de6006d3eb3381c1676057e36ded71f28faa1c',
    },
    replacement: {
      path: 'projects/vs-001-source-to-campaign/remotion/receipts/validation-evidence/determinism-policy-v2.json',
      id: 'EVD-REMOTION-VS001-DETERMINISM-POLICY-V2',
    },
  },
  {
    recordKind: 'validation-command-evidence',
    original: {
      path: 'projects/vs-001-source-to-campaign/remotion/receipts/validation-evidence/remotion-version-alignment.json',
      id: 'EVD-REMOTION-VS001-REMOTION-VERSION-ALIGNMENT',
      sha256: '29318d24db28b2e60fd5f8964b83a15ef82da4bd2ad66ea1828f430e0709f66e',
    },
    accidentalMutation: {
      path: 'projects/vs-001-source-to-campaign/remotion/receipts/validation-evidence/remotion-version-alignment.json',
      id: 'EVD-REMOTION-VS001-REMOTION-VERSION-ALIGNMENT',
      sha256: 'aa4f543104f516dae087b1694456942866413014d8de26bbf3f3dc3ab72ad5b4',
    },
    replacement: {
      path: 'projects/vs-001-source-to-campaign/remotion/receipts/validation-evidence/remotion-version-alignment-v2.json',
      id: 'EVD-REMOTION-VS001-REMOTION-VERSION-ALIGNMENT-V2',
    },
  },
  {
    recordKind: 'render-receipt',
    original: {
      path: 'receipts/renders/RCP-REMOTION-VS001-001.json',
      id: 'RCP-REMOTION-VS001-001',
      sha256: '6d15cedbaae62f34d331e64ac4278a04220abc3f9d184e5c208fa151c2f9b537',
    },
    accidentalMutation: {
      path: 'receipts/renders/RCP-REMOTION-VS001-001.json',
      id: 'RCP-REMOTION-VS001-001',
      sha256: '00878fa6e562097171c2b4128c1f8d15dac809174ebfbf0644873a72a5b02e98',
    },
    replacement: {
      path: 'receipts/renders/RCP-REMOTION-VS001-002.json',
      id: 'RCP-REMOTION-VS001-002',
    },
  },
] as const satisfies readonly EvidenceRemediationBaseline[];

const recordVersionSchema = z.strictObject({
  path: portableJsonPathSchema,
  id: recordIdSchema,
  sha256: sha256Schema,
});

const supersessionSchema = z
  .strictObject({
    recordKind: z.enum(['validation-command-evidence', 'validation-test-report', 'render-receipt']),
    eventType: z.literal('SUPERSEDED_BY'),
    original: recordVersionSchema,
    accidentalMutation: recordVersionSchema,
    replacement: recordVersionSchema,
  })
  .superRefine((record, context) => {
    if (
      record.original.path !== record.accidentalMutation.path ||
      record.original.id !== record.accidentalMutation.id
    ) {
      context.addIssue({
        code: 'custom',
        message: 'The incident must identify the same path and ID that were mutated in place.',
        path: ['accidentalMutation'],
      });
    }
    if (record.original.sha256 === record.accidentalMutation.sha256) {
      context.addIssue({
        code: 'custom',
        message: 'The accidental mutation hash must differ from the original hash.',
        path: ['accidentalMutation', 'sha256'],
      });
    }
    if (
      record.replacement.path === record.original.path ||
      record.replacement.id === record.original.id
    ) {
      context.addIssue({
        code: 'custom',
        message: 'A superseding record requires both a new path and a new ID.',
        path: ['replacement'],
      });
    }
  });

export const appendOnlyEvidenceMigrationSchema = z
  .strictObject({
    schemaVersion: z.literal('append-only-evidence-migration-v1'),
    migrationId: z.literal(APPEND_ONLY_MIGRATION_ID),
    projectId: z.literal('vs-001-source-to-campaign'),
    restoredFromCommit: z.literal(ORIGINAL_EVIDENCE_COMMIT),
    affectedCommit: z.literal(ACCIDENTAL_MUTATION_COMMIT),
    incidentDetectedAtCommit: z.literal(INCIDENT_DETECTED_AT_COMMIT),
    commitFormat: z.strictObject({
      restoredFromCommit: commitSchema,
      affectedCommit: commitSchema,
      incidentDetectedAtCommit: commitSchema,
    }),
    historyIntegrity: z.strictObject({
      historyWasImmutable: z.literal(false),
      accidentalSameIdReuseObserved: z.literal(true),
      originalBytesRestored: z.literal(true),
      replacementSameIdReuse: z.literal(false),
      incident: z.literal(
        'Seven append-only records were rewritten in place at the affected commit.',
      ),
    }),
    remediationSemantics: z.literal('RESTORE_ORIGINAL_BYTES_AND_APPEND_NEW_VERSIONED_RECORDS'),
    governedWorkflowState: z.literal('BLOCKED_BEFORE_SOURCE_LOCK'),
    stateEffect: z.literal('NONE_ON_GOVERNED_WORKFLOW'),
    supersessions: z.array(supersessionSchema).length(evidenceRemediationBaselines.length),
    completeness: z.strictObject({
      expectedRecords: z.literal(evidenceRemediationBaselines.length),
      mappedRecords: z.literal(evidenceRemediationBaselines.length),
      validationCommandEvidenceRecords: z.literal(5),
      validationTestReportRecords: z.literal(1),
      renderReceiptRecords: z.literal(1),
    }),
    createdAt: z.literal('2026-07-19T12:00:00.000Z'),
  })
  .superRefine((receipt, context) => {
    const originalPaths = new Set<string>();
    const originalIds = new Set<string>();
    const replacementPaths = new Set<string>();
    const replacementIds = new Set<string>();

    for (const [index, baseline] of evidenceRemediationBaselines.entries()) {
      const record = receipt.supersessions.find(
        ({original}) => original.path === baseline.original.path,
      );
      if (
        record === undefined ||
        record.recordKind !== baseline.recordKind ||
        record.original.id !== baseline.original.id ||
        record.original.sha256 !== baseline.original.sha256 ||
        record.accidentalMutation.path !== baseline.accidentalMutation.path ||
        record.accidentalMutation.id !== baseline.accidentalMutation.id ||
        record.accidentalMutation.sha256 !== baseline.accidentalMutation.sha256 ||
        record.replacement.path !== baseline.replacement.path ||
        record.replacement.id !== baseline.replacement.id
      ) {
        context.addIssue({
          code: 'custom',
          message: `Supersession mapping is incomplete or drifted for ${baseline.original.path}.`,
          path: ['supersessions', index],
        });
      }
    }

    for (const [index, record] of receipt.supersessions.entries()) {
      for (const [set, value, label] of [
        [originalPaths, record.original.path, 'original path'],
        [originalIds, record.original.id, 'original ID'],
        [replacementPaths, record.replacement.path, 'replacement path'],
        [replacementIds, record.replacement.id, 'replacement ID'],
      ] as const) {
        if (set.has(value)) {
          context.addIssue({
            code: 'custom',
            message: `Duplicate ${label}: ${value}.`,
            path: ['supersessions', index],
          });
        }
        set.add(value);
      }
    }
  });

export type AppendOnlyEvidenceMigration = z.infer<typeof appendOnlyEvidenceMigrationSchema>;

const recordIdFromText = (text: string, identityField: string): string => {
  const parsed = JSON.parse(text) as Record<string, unknown>;
  const value = parsed[identityField];
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Append-only record is missing identity field ${identityField}.`);
  }
  return value;
};

export interface AppendOnlyIdentity {
  readonly field: 'evidenceId' | 'report_id' | 'receiptId' | 'migrationId';
  readonly id: string;
}

export const assertAppendOnlyRecordReplay = (
  existingText: string,
  proposedText: string,
  identity: AppendOnlyIdentity,
): void => {
  const existingId = recordIdFromText(existingText, identity.field);
  const proposedId = recordIdFromText(proposedText, identity.field);
  if (existingId !== identity.id || proposedId !== identity.id) {
    throw new Error(
      `Append-only identity mismatch at ${identity.field}: expected ${identity.id}, observed ${existingId} -> ${proposedId}.`,
    );
  }
  if (existingText !== proposedText) {
    throw new Error(
      `Append-only conflict: ${identity.id} already exists with different bytes; issue a new path and ID.`,
    );
  }
};

export const writeAppendOnlyText = (
  repositoryRoot: string,
  relativePath: string,
  proposedText: string,
  identity: AppendOnlyIdentity,
): 'created' | 'replayed' => {
  const absolutePath = resolve(repositoryRoot, portableJsonPathSchema.parse(relativePath));
  const portableText = proposedText.endsWith('\n') ? proposedText : `${proposedText}\n`;
  if (existsSync(absolutePath)) {
    assertAppendOnlyRecordReplay(readFileSync(absolutePath, 'utf8'), portableText, identity);
    return 'replayed';
  }
  mkdirSync(dirname(absolutePath), {recursive: true});
  writeFileSync(absolutePath, portableText, 'utf8');
  return 'created';
};

export const buildAppendOnlyEvidenceMigration = (
  replacementHashes: Readonly<Record<string, string>>,
): AppendOnlyEvidenceMigration =>
  appendOnlyEvidenceMigrationSchema.parse({
    schemaVersion: 'append-only-evidence-migration-v1',
    migrationId: APPEND_ONLY_MIGRATION_ID,
    projectId: 'vs-001-source-to-campaign',
    restoredFromCommit: ORIGINAL_EVIDENCE_COMMIT,
    affectedCommit: ACCIDENTAL_MUTATION_COMMIT,
    incidentDetectedAtCommit: INCIDENT_DETECTED_AT_COMMIT,
    commitFormat: {
      restoredFromCommit: ORIGINAL_EVIDENCE_COMMIT,
      affectedCommit: ACCIDENTAL_MUTATION_COMMIT,
      incidentDetectedAtCommit: INCIDENT_DETECTED_AT_COMMIT,
    },
    historyIntegrity: {
      historyWasImmutable: false,
      accidentalSameIdReuseObserved: true,
      originalBytesRestored: true,
      replacementSameIdReuse: false,
      incident: 'Seven append-only records were rewritten in place at the affected commit.',
    },
    remediationSemantics: 'RESTORE_ORIGINAL_BYTES_AND_APPEND_NEW_VERSIONED_RECORDS',
    governedWorkflowState: 'BLOCKED_BEFORE_SOURCE_LOCK',
    stateEffect: 'NONE_ON_GOVERNED_WORKFLOW',
    supersessions: evidenceRemediationBaselines.map((baseline) => ({
      recordKind: baseline.recordKind,
      eventType: 'SUPERSEDED_BY',
      original: baseline.original,
      accidentalMutation: baseline.accidentalMutation,
      replacement: {
        ...baseline.replacement,
        sha256: replacementHashes[baseline.replacement.path],
      },
    })),
    completeness: {
      expectedRecords: 7,
      mappedRecords: 7,
      validationCommandEvidenceRecords: 5,
      validationTestReportRecords: 1,
      renderReceiptRecords: 1,
    },
    createdAt: '2026-07-19T12:00:00.000Z',
  });

export const serializeAppendOnlyEvidenceMigration = (
  receipt: AppendOnlyEvidenceMigration,
): string => `${JSON.stringify(appendOnlyEvidenceMigrationSchema.parse(receipt), null, 2)}\n`;

export const verifyAppendOnlyEvidenceMigrationFiles = (
  repositoryRoot: string,
  receiptInput: unknown,
): AppendOnlyEvidenceMigration => {
  const receipt = appendOnlyEvidenceMigrationSchema.parse(receiptInput);
  for (const record of receipt.supersessions) {
    for (const version of [record.original, record.replacement]) {
      const text = readFileSync(resolve(repositoryRoot, version.path), 'utf8');
      if (sha256(text) !== version.sha256) {
        throw new Error(`Supersession hash mismatch for ${version.path}.`);
      }
      const identityFields = ['evidenceId', 'report_id', 'receiptId'] as const;
      const observedId = identityFields
        .map((field) => {
          try {
            return recordIdFromText(text, field);
          } catch {
            return undefined;
          }
        })
        .find((id) => id !== undefined);
      if (observedId !== version.id) {
        throw new Error(`Supersession ID mismatch for ${version.path}.`);
      }
    }
  }
  return receipt;
};
