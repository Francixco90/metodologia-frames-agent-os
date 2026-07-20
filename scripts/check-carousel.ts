import {createHash} from 'node:crypto';
import {existsSync, readFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {parse} from 'yaml';
import {z} from 'zod';

import {
  CommitteeDecisionV2Schema,
  CommitteeSessionV2Schema,
} from '../committees/src/committee-runtime-v2.ts';
import {
  CandidatePackageV2Schema,
  HashBoundReferenceV1Schema,
  OrchestrationRunV2Schema,
} from '../core/contracts/content-v2.ts';
import {
  computeDeclaredContractSha256,
  parseHashBoundCandidatePackageV2,
  parseHashBoundOrchestrationRunV2,
  verifyHashBoundFile,
} from '../core/orchestration/hash-bound.ts';
import {OrchestrationRunPersistenceReceiptV2Schema} from '../core/orchestration/run-store-v2.ts';
import {validateCarouselSpec} from '../workflows/content/types/carousel/plugin.ts';

const root = process.cwd();
const specPath = resolve(root, 'projects/pilot-carousel-001/spec/carousel-spec.yml');
const artifactRoot = resolve(root, 'projects/pilot-carousel-001/artifacts');
const errors: string[] = [];
const sha256 = (value: Uint8Array | string): string =>
  createHash('sha256').update(value).digest('hex');
const stableReviewEventStringify = (value: unknown): string => {
  if (Array.isArray(value)) {
    return `[${value.map(stableReviewEventStringify).join(',')}]`;
  }
  if (value !== null && typeof value === 'object') {
    return `{${Object.entries(value)
      .filter(([key]) => key !== 'eventSha256')
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => `${JSON.stringify(key)}:${stableReviewEventStringify(child)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
};

let spec;
try {
  spec = validateCarouselSpec(parse(readFileSync(specPath, 'utf8')));
} catch (error) {
  errors.push(`CAR-000: spec inválido: ${String(error)}`);
}

const manifestPath = resolve(artifactRoot, 'asset-manifest.json');
const receiptPath = resolve(artifactRoot, 'render-receipt.json');
if (!existsSync(manifestPath)) errors.push('CAR-010: asset manifest ausente');
if (!existsSync(receiptPath)) errors.push('CAR-011: render receipt ausente');

if (existsSync(manifestPath) && existsSync(receiptPath) && spec !== undefined) {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
    state?: string;
    specSha256?: string;
    files?: Array<{path: string; sha256: string; bytes: number; mediaType: string}>;
    renderPolicy?: {
      networkRequests?: number;
      randomness?: boolean;
      wallClock?: boolean;
      deterministicDoubleCapture?: boolean;
    };
    rights?: {publicationAuthorized?: boolean};
  };
  const receipt = JSON.parse(readFileSync(receiptPath, 'utf8')) as {
    manifestSha256?: string;
    deterministic?: boolean;
    networkRequests?: number;
    guardianPassed?: boolean;
    humanApproved?: boolean;
    ready?: boolean;
    publicationAuthorized?: boolean;
  };
  if (manifest.state !== 'RENDERED_DRAFT') errors.push('CAR-012: manifest sobredeclara estado');
  if (manifest.specSha256 !== sha256(readFileSync(specPath))) {
    errors.push('CAR-013: spec hash stale');
  }
  if (receipt.manifestSha256 !== sha256(readFileSync(manifestPath))) {
    errors.push('CAR-014: receipt no vincula manifest');
  }
  if (
    receipt.deterministic !== true ||
    receipt.networkRequests !== 0 ||
    manifest.renderPolicy?.networkRequests !== 0 ||
    manifest.renderPolicy?.randomness !== false ||
    manifest.renderPolicy?.wallClock !== false ||
    manifest.renderPolicy?.deterministicDoubleCapture !== true
  ) {
    errors.push('CAR-015: render policy no es offline y determinista');
  }
  if (
    receipt.guardianPassed !== false ||
    receipt.humanApproved !== false ||
    receipt.ready !== false ||
    receipt.publicationAuthorized !== false ||
    manifest.rights?.publicationAuthorized !== false
  ) {
    errors.push('CAR-016: publicación o aprobación elevadas sin autoridad');
  }

  for (const file of manifest.files ?? []) {
    const absolutePath = resolve(root, file.path);
    if (!existsSync(absolutePath)) {
      errors.push(`CAR-017: artifact ausente ${file.path}`);
      continue;
    }
    const value = readFileSync(absolutePath);
    if (value.byteLength !== file.bytes || sha256(value) !== file.sha256) {
      errors.push(`CAR-018: artifact stale ${file.path}`);
    }
    if (file.mediaType === 'image/png') {
      const width = value.readUInt32BE(16);
      const height = value.readUInt32BE(20);
      if (file.path.match(/slide-\d{2}\.png$/u) && (width !== 1080 || height !== 1350)) {
        errors.push(`CAR-019: dimensión inesperada ${file.path} ${width}x${height}`);
      }
    }
  }

  const pngs = (manifest.files ?? []).filter(({path}) => /slide-\d{2}\.png$/u.test(path));
  if (pngs.length !== spec.cards.length) {
    errors.push(`CAR-020: ${pngs.length} PNG para ${spec.cards.length} tarjetas`);
  }
  if (!existsSync(resolve(artifactRoot, 'contact-sheet.png'))) {
    errors.push('CAR-021: contact sheet ausente');
  }
  if (!existsSync(resolve(artifactRoot, 'review-mobile.png'))) {
    errors.push('CAR-022: revisión móvil ausente');
  }
  if (!existsSync(resolve(artifactRoot, 'review-desktop.png'))) {
    errors.push('CAR-023: revisión desktop ausente');
  }
}

const validateGovernedReviewChain = async (): Promise<void> => {
  const projectRoot = 'projects/pilot-carousel-001';
  const candidateRef = `${projectRoot}/spec/candidate-package.json`;
  const reviewEventRef = `${projectRoot}/spec/workflow-pilot-review.json`;
  const rt09Ref = `${projectRoot}/quality/rt09-review.json`;
  const guardianRef = `${projectRoot}/guardian/GDN-CAR-MAO-001.yml`;
  const committeeSessionRef = `${projectRoot}/orchestration/committee-session.json`;
  const committeeDecisionRef = `${projectRoot}/orchestration/committee-decision.json`;
  const preGuardianPersistenceReceiptRef = `${projectRoot}/orchestration/persistence-receipt-pre-guardian.json`;
  const runRef = `${projectRoot}/orchestration/orchestration-run-v2.json`;
  const persistenceReceiptRef = `${projectRoot}/orchestration/persistence-receipt-v2.json`;
  const required = [
    candidateRef,
    reviewEventRef,
    rt09Ref,
    guardianRef,
    committeeSessionRef,
    committeeDecisionRef,
    preGuardianPersistenceReceiptRef,
    runRef,
    persistenceReceiptRef,
  ];
  for (const ref of required) {
    if (!existsSync(resolve(root, ref))) {
      errors.push(`CAR-030: evidencia gobernada ausente ${ref}`);
    }
  }
  if (required.some((ref) => !existsSync(resolve(root, ref)))) return;

  try {
    const candidate = parseHashBoundCandidatePackageV2(
      CandidatePackageV2Schema.parse(
        JSON.parse(readFileSync(resolve(root, candidateRef), 'utf8')) as unknown,
      ),
    );
    for (const reference of [
      ...candidate.artifacts.map(({binding}) => binding),
      ...candidate.variants,
      ...candidate.evidence,
      candidate.specRef,
      candidate.assetManifestRef,
      candidate.renderManifestRef,
      ...candidate.receiptRefs,
      ...candidate.qaRefs,
    ]) {
      await verifyHashBoundFile(root, reference);
    }

    const reviewEventSchema = z.object({
      schemaVersion: z.literal('workflow-pilot-review-event-v1'),
      eventType: z.literal('WORKFLOW_PILOT_REVIEW'),
      candidatePackageId: z.literal('CP-CAR-MAO-001'),
      candidatePackageSha256: z.string().regex(/^[a-f0-9]{64}$/u),
      state: z.literal('awaiting_human_approval'),
      decision: z.null(),
      acceptedEventPresent: z.literal(false),
      nextWorkflow: z.literal('feed-text'),
      nextWorkflowUnlocked: z.literal(false),
      publicationAuthorized: z.literal(false),
      eventSha256: z.string().regex(/^[a-f0-9]{64}$/u),
    });
    const reviewEvent = reviewEventSchema
      .passthrough()
      .parse(JSON.parse(readFileSync(resolve(root, reviewEventRef), 'utf8')) as unknown);
    if (
      reviewEvent.candidatePackageSha256 !== candidate.packageSha256 ||
      sha256(stableReviewEventStringify(reviewEvent)) !== reviewEvent.eventSha256
    ) {
      errors.push('CAR-031: WORKFLOW_PILOT_REVIEW stale o no canónico');
    }

    const rt09Schema = z
      .object({
        schemaVersion: z.literal('rt09-verifier-report-v2'),
        reportId: z.literal('RT09-CAR-MAO-001'),
        actorInstanceId: z.literal('RT-09-CAR-MAO-001'),
        producerActorInstanceId: z.literal('RT-07-CAR-MAO-001'),
        candidatePackageId: z.literal('CP-CAR-MAO-001'),
        candidatePackageSha256: z.string().regex(/^[a-f0-9]{64}$/u),
        decision: z.literal('pass'),
        evidenceRefs: z.array(HashBoundReferenceV1Schema).min(3),
        reviewedAt: z.iso.datetime({offset: true}),
      })
      .passthrough();
    const rt09 = rt09Schema.parse(
      JSON.parse(readFileSync(resolve(root, rt09Ref), 'utf8')) as unknown,
    );
    if (rt09.candidatePackageSha256 !== candidate.packageSha256) {
      errors.push('CAR-032: RT-09 stale o sin separación de rol');
    }
    for (const reference of rt09.evidenceRefs) {
      await verifyHashBoundFile(root, reference);
    }

    const guardianSchema = z
      .object({
        schemaVersion: z.literal('guardian-review-v2'),
        reviewId: z.literal('GDN-CAR-MAO-001'),
        actorInstanceId: z.literal('RT-11-CAR-MAO-001'),
        producerActorInstanceId: z.literal('RT-07-CAR-MAO-001'),
        verifierActorInstanceId: z.literal('RT-09-CAR-MAO-001'),
        candidatePackageId: z.literal('CP-CAR-MAO-001'),
        candidatePackageSha256: z.string().regex(/^[a-f0-9]{64}$/u),
        rt09ReportRef: HashBoundReferenceV1Schema,
        decision: z.literal('pass'),
        evidenceRefs: z.array(HashBoundReferenceV1Schema).min(3),
        reviewedAt: z.iso.datetime({offset: true}),
        publicationAuthorized: z.literal(false),
        humanApprovalPresent: z.literal(false),
        reviewSha256: z.string().regex(/^[a-f0-9]{64}$/u),
      })
      .passthrough();
    const guardian = guardianSchema.parse(
      parse(readFileSync(resolve(root, guardianRef), 'utf8')) as unknown,
    );
    const actorIds = [
      guardian.producerActorInstanceId,
      guardian.verifierActorInstanceId,
      guardian.actorInstanceId,
    ];
    if (
      new Set(actorIds).size !== 3 ||
      guardian.candidatePackageSha256 !== candidate.packageSha256 ||
      guardian.rt09ReportRef.ref !== rt09Ref ||
      guardian.rt09ReportRef.sha256 !== sha256(readFileSync(resolve(root, rt09Ref))) ||
      computeDeclaredContractSha256(guardian, 'reviewSha256') !== guardian.reviewSha256
    ) {
      errors.push('CAR-033: Guardian stale, no canónico o sin separación de rol');
    }
    await verifyHashBoundFile(root, guardian.rt09ReportRef);
    for (const reference of guardian.evidenceRefs) {
      await verifyHashBoundFile(root, reference);
    }

    const committeeSession = CommitteeSessionV2Schema.parse(
      JSON.parse(readFileSync(resolve(root, committeeSessionRef), 'utf8')) as unknown,
    );
    const committeeDecision = CommitteeDecisionV2Schema.parse(
      JSON.parse(readFileSync(resolve(root, committeeDecisionRef), 'utf8')) as unknown,
    );
    if (
      computeDeclaredContractSha256(committeeSession, 'sessionSha256') !==
        committeeSession.sessionSha256 ||
      committeeSession.proposals.some(
        (proposal) =>
          computeDeclaredContractSha256(proposal, 'proposalSha256') !== proposal.proposalSha256,
      ) ||
      committeeSession.crossEvaluations.some(
        (evaluation) =>
          computeDeclaredContractSha256(evaluation, 'evaluationSha256') !==
          evaluation.evaluationSha256,
      ) ||
      computeDeclaredContractSha256(committeeDecision, 'decisionSha256') !==
        committeeDecision.decisionSha256 ||
      committeeDecision.selectedProposalId !== 'PROP-RT-05-CAR-MAO-001'
    ) {
      errors.push('CAR-034: comité material no es canónico o deriva del seleccionado');
    }

    const run = parseHashBoundOrchestrationRunV2(
      OrchestrationRunV2Schema.parse(
        JSON.parse(readFileSync(resolve(root, runRef), 'utf8')) as unknown,
      ),
    );
    const persistenceReceipt = OrchestrationRunPersistenceReceiptV2Schema.parse(
      JSON.parse(readFileSync(resolve(root, persistenceReceiptRef), 'utf8')) as unknown,
    );
    const preGuardianPersistenceReceipt = OrchestrationRunPersistenceReceiptV2Schema.parse(
      JSON.parse(readFileSync(resolve(root, preGuardianPersistenceReceiptRef), 'utf8')) as unknown,
    );
    const verifierIndex = run.events.findIndex(({eventType}) => eventType === 'VERIFIER_COMPLETED');
    const guardianIndex = run.events.findIndex(({eventType}) => eventType === 'GUARDIAN_REVIEWED');
    const humanIndex = run.events.findIndex(
      ({eventType}) => eventType === 'HUMAN_APPROVAL_RECORDED',
    );
    if (
      run.state !== 'awaiting_human_approval' ||
      run.maxConcurrency !== 2 ||
      run.maxRetries !== 3 ||
      run.maxGuardianReviews !== 2 ||
      run.committeeProposalIds.length !== 5 ||
      run.committeeTrace?.crossEvaluationCount !== 20 ||
      run.committeeTrace.executionWaves.join(',') !== '2,2,1' ||
      run.guardianReviews.length !== 1 ||
      run.guardianReviews[0]?.decision !== 'pass' ||
      verifierIndex < 0 ||
      guardianIndex <= verifierIndex ||
      humanIndex !== -1 ||
      run.workflowPilotApproval !== undefined ||
      run.memoryWriteState !== 'forbidden_pending_human' ||
      run.publicationPolicy !== 'forbidden' ||
      persistenceReceipt.runSha256 !== run.runSha256 ||
      persistenceReceipt.snapshotSha256 !== sha256(readFileSync(resolve(root, runRef))) ||
      persistenceReceipt.receiptId === preGuardianPersistenceReceipt.receiptId
    ) {
      errors.push('CAR-035: run final no preserva 2+2+1, RT-09→RT-11 o gate H01');
    }
  } catch (error) {
    errors.push(`CAR-036: cadena gobernada inválida: ${String(error)}`);
  }
};

await validateGovernedReviewChain();

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.info(
    `PASS CAROUSEL: ${spec?.cards.length ?? 0} tarjetas, hashes, alt, 1080x1350, offline y publicación bloqueada.`,
  );
}
