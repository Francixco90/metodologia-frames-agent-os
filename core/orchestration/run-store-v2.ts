import {mkdir, readFile, realpath, writeFile} from 'node:fs/promises';
import {basename, dirname, isAbsolute, relative, resolve} from 'node:path';

import {z} from 'zod';

import {OrchestrationRunV2Schema, type OrchestrationRunV2} from '../contracts/index.ts';
import {
  PortableIdSchema,
  RelativePathSchema,
  Sha256Schema,
  TimestampSchema,
} from '../contracts/primitives.ts';
import {canonicalize} from '../evidence/canonical-json.ts';
import {sha256Text} from '../evidence/hash.ts';
import {failOrchestration} from './errors.ts';
import {parseHashBoundOrchestrationRunV2} from './hash-bound.ts';

export const OrchestrationRunPersistenceReceiptV2Schema = z.strictObject({
  schemaVersion: z.literal('orchestration-run-persistence-receipt-v2'),
  receiptId: PortableIdSchema,
  runId: PortableIdSchema,
  runSha256: Sha256Schema,
  snapshotRef: RelativePathSchema,
  snapshotSha256: Sha256Schema,
  committeeProposalCount: z.literal(5),
  crossEvaluationCount: z.literal(20),
  executionWaves: z.tuple([z.literal(2), z.literal(2), z.literal(1)]),
  verifierBeforeGuardian: z.literal(true),
  publicationPolicy: z.literal('forbidden'),
  reusedExistingSnapshot: z.boolean(),
  persistedAt: TimestampSchema,
});

export type OrchestrationRunPersistenceReceiptV2 = z.infer<
  typeof OrchestrationRunPersistenceReceiptV2Schema
>;

const isErrnoException = (error: unknown): error is NodeJS.ErrnoException =>
  error instanceof Error && 'code' in error;

const assertNotOutsideRoot = (root: string, target: string): void => {
  const relativeTarget = relative(root, target);
  if (relativeTarget.startsWith('..') || isAbsolute(relativeTarget)) {
    failOrchestration(
      'ORCH_V2_STATE_TRANSITION',
      'Run snapshot destination must remain inside the governed persistence root.',
    );
  }
};

export const persistPilotOrchestrationRunV2 = async (
  rootInput: string,
  snapshotRefInput: string,
  runInput: OrchestrationRunV2,
  persistedAtInput: string,
): Promise<OrchestrationRunPersistenceReceiptV2> => {
  const snapshotRef = RelativePathSchema.parse(snapshotRefInput);
  const persistedAt = TimestampSchema.parse(persistedAtInput);
  if (!snapshotRef.endsWith('.json')) {
    failOrchestration(
      'ORCH_V2_STATE_TRANSITION',
      'Run snapshots must use a portable .json destination.',
    );
  }

  const run = parseHashBoundOrchestrationRunV2(runInput);
  if (
    run.committeeTrace === undefined ||
    run.committeeProposalIds.length !== 5 ||
    run.committeeTrace.crossEvaluationCount !== 20 ||
    run.committeeTrace.executionWaves.join(',') !== '2,2,1'
  ) {
    failOrchestration(
      'ORCH_V2_COMMITTEE_CARDINALITY',
      'Persisted pilot runs require five proposals, 20 cross-evaluations and 2+2+1 waves.',
    );
  }
  const verifierEventIndex = run.events.findIndex(
    ({eventType}) => eventType === 'VERIFIER_COMPLETED',
  );
  const guardianEventIndex = run.events.findIndex(
    ({eventType}) => eventType === 'GUARDIAN_REVIEWED',
  );
  if (
    verifierEventIndex < 0 ||
    (guardianEventIndex >= 0 && verifierEventIndex >= guardianEventIndex)
  ) {
    failOrchestration(
      'ORCH_V2_ROLE_ORDER',
      'Persisted pilot runs require RT-09 before every RT-11 review.',
    );
  }

  await mkdir(rootInput, {recursive: true});
  const root = await realpath(rootInput);
  const destination = resolve(root, snapshotRef);
  const destinationParent = dirname(destination);
  await mkdir(destinationParent, {recursive: true});
  const resolvedParent = await realpath(destinationParent);
  assertNotOutsideRoot(root, resolvedParent);
  const resolvedDestination = resolve(resolvedParent, basename(destination));
  assertNotOutsideRoot(root, resolvedDestination);

  const serialized = `${canonicalize(run)}\n`;
  const snapshotSha256 = sha256Text(serialized);
  let reusedExistingSnapshot = false;
  try {
    await writeFile(resolvedDestination, serialized, {
      encoding: 'utf8',
      flag: 'wx',
      mode: 0o600,
    });
  } catch (error: unknown) {
    if (!isErrnoException(error) || error.code !== 'EEXIST') {
      throw error;
    }
    const existingDestination = await realpath(resolvedDestination);
    assertNotOutsideRoot(root, existingDestination);
    const existing = await readFile(existingDestination, 'utf8');
    if (existing !== serialized) {
      failOrchestration(
        'ORCH_V2_HASH_MISMATCH',
        'Append-only run snapshot already exists with different bytes.',
      );
    }
    reusedExistingSnapshot = true;
  }

  const persisted = await readFile(resolvedDestination, 'utf8');
  if (sha256Text(persisted) !== snapshotSha256) {
    failOrchestration(
      'ORCH_V2_HASH_MISMATCH',
      'Persisted run snapshot failed read-after-write verification.',
    );
  }
  const parsedJson: unknown = JSON.parse(persisted);
  parseHashBoundOrchestrationRunV2(OrchestrationRunV2Schema.parse(parsedJson));

  return OrchestrationRunPersistenceReceiptV2Schema.parse({
    schemaVersion: 'orchestration-run-persistence-receipt-v2',
    receiptId: `receipt:${run.runId}:persistence:${basename(snapshotRef, '.json')}`,
    runId: run.runId,
    runSha256: run.runSha256,
    snapshotRef,
    snapshotSha256,
    committeeProposalCount: 5,
    crossEvaluationCount: 20,
    executionWaves: [2, 2, 1],
    verifierBeforeGuardian: true,
    publicationPolicy: 'forbidden',
    reusedExistingSnapshot,
    persistedAt,
  });
};
