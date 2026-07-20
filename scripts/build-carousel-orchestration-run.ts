import {createHash} from 'node:crypto';
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {parse} from 'yaml';
import {z} from 'zod';

import {
  CommitteeSessionV2Schema,
  adjudicateCommitteeV2,
} from '../committees/src/committee-runtime-v2.ts';
import {
  CandidatePackageV2Schema,
  ContentWorkOrderV2Schema,
  HashBoundReferenceV1Schema,
} from '../core/contracts/content-v2.ts';
import {
  computeDeclaredContractSha256,
  parseHashBoundCandidatePackageV2,
  parseHashBoundContentWorkOrderV2,
  verifyHashBoundFile,
} from '../core/orchestration/hash-bound.ts';
import {CreativeOrchestrationRuntimeV2} from '../core/orchestration/runtime-v2.ts';
import {
  OrchestrationRunPersistenceReceiptV2Schema,
  persistPilotOrchestrationRunV2,
  type OrchestrationRunPersistenceReceiptV2,
} from '../core/orchestration/run-store-v2.ts';

const root = process.cwd();
const projectRoot = 'projects/pilot-carousel-001';
const orchestrationRoot = `${projectRoot}/orchestration`;
const rt09Ref = `${projectRoot}/quality/rt09-review.json`;
const sha256 = (value: Buffer | string): string => createHash('sha256').update(value).digest('hex');
const fileSha256 = (path: string): string => sha256(readFileSync(resolve(root, path)));
const readJson = (path: string): unknown =>
  JSON.parse(readFileSync(resolve(root, path), 'utf8')) as unknown;
const writeJson = (path: string, value: unknown): void => {
  writeFileSync(resolve(root, path), `${JSON.stringify(value, null, 2)}\n`, 'utf8');
};
const writeAppendOnlyPersistenceReceipt = (
  path: string,
  value: OrchestrationRunPersistenceReceiptV2,
): void => {
  const absolutePath = resolve(root, path);
  const candidate = OrchestrationRunPersistenceReceiptV2Schema.parse(value);
  if (!existsSync(absolutePath)) {
    writeJson(path, candidate);
    return;
  }
  const existing = OrchestrationRunPersistenceReceiptV2Schema.parse(readJson(path));
  const normalizedExisting = {...existing, reusedExistingSnapshot: false};
  const normalizedCandidate = {...candidate, reusedExistingSnapshot: false};
  if (JSON.stringify(normalizedExisting) !== JSON.stringify(normalizedCandidate)) {
    throw new Error(`CLAIM_MISMATCH: append-only persistence receipt drift at ${path}`);
  }
};
const withDigest = <T extends object, K extends string>(
  value: T,
  field: K,
): T & Record<K, string> =>
  ({
    ...value,
    [field]: computeDeclaredContractSha256(value, field),
  }) as T & Record<K, string>;
const binding = (ref: string) =>
  HashBoundReferenceV1Schema.parse({
    schemaVersion: 'hash-bound-ref-v1',
    ref,
    sha256: fileSha256(ref),
  });

const workOrder = parseHashBoundContentWorkOrderV2(
  ContentWorkOrderV2Schema.parse(readJson(`${projectRoot}/spec/content-work-order.json`)),
);
const candidate = parseHashBoundCandidatePackageV2(
  CandidatePackageV2Schema.parse(readJson(`${projectRoot}/spec/candidate-package.json`)),
);

if (
  workOrder.producerActorInstanceId !== 'RT-07-CAR-MAO-001' ||
  candidate.producerActorInstanceId !== workOrder.producerActorInstanceId ||
  candidate.proposalActorInstanceId !== 'RT-05-CAR-MAO-001'
) {
  throw new Error(
    'OWNERSHIP_CONFLICT: work order, selected proposal and producer are inconsistent',
  );
}

const roles = ['RT-03', 'RT-04', 'RT-05', 'RT-06', 'RT-07'] as const;
const roleConcepts = {
  'RT-03': {
    title: 'Evidencia antes de promesa',
    concept:
      'Abrir con la decisión y distinguir señales a medir de resultados obtenidos para preservar honestidad.',
  },
  'RT-04': {
    title: 'Resultado observable primero',
    concept:
      'Organizar el carrusel desde el resultado deseado hacia una prueba acotada y un criterio de revisión.',
  },
  'RT-05': {
    title: 'Método antes que herramientas',
    concept:
      'Secuenciar conclusión, tensión, tres pilares, evidencia honesta, aplicación y un CTA de un movimiento.',
  },
  'RT-06': {
    title: 'Una idea por tarjeta',
    concept:
      'Reducir fricción verbal con titulares directos, soportes breves y un CTA específico en español latino.',
  },
  'RT-07': {
    title: 'Continuidad visual sobria',
    concept:
      'Usar contraste navy, blanco y dorado con señales repetidas para sostener continuidad sin ornamentación.',
  },
} as const;
const agentContractByRole = new Map(
  (
    parse(readFileSync(resolve(root, 'registries/agents/agent-registry-v2.yml'), 'utf8')) as {
      entries: Array<{
        roleId: string;
        legacyV1Contract: {schemaVersion: 'hash-bound-ref-v1'; ref: string; sha256: string};
      }>;
    }
  ).entries.map(({roleId, legacyV1Contract}) => [roleId, legacyV1Contract]),
);
const sourceEvidence = binding(`${projectRoot}/spec/source-snapshot.json`);
const editorialEvidence = binding(`${projectRoot}/spec/canonical-editorial-unit.json`);
const carouselEvidence = binding(`${projectRoot}/spec/carousel-spec.yml`);
const members = roles.map((roleId, index) => {
  const agentContract = agentContractByRole.get(roleId);
  if (agentContract === undefined) throw new Error(`Agent contract missing for ${roleId}`);
  return {
    actorInstanceId: `${roleId}-CAR-MAO-001`,
    roleId,
    lane:
      index < 2
        ? ('strategy' as const)
        : index < 4
          ? ('creative' as const)
          : ('integration' as const),
    agentContract,
  };
});
const proposals = members.map((member, index) =>
  withDigest(
    {
      schemaVersion: 'committee-proposal-v2' as const,
      proposalId: `PROP-${member.roleId}-CAR-MAO-001`,
      actorInstanceId: member.actorInstanceId,
      roleId: member.roleId,
      title: roleConcepts[member.roleId].title,
      concept: roleConcepts[member.roleId].concept,
      assumptions: [
        {
          statement:
            'El piloto se dirige a profesionales y equipos y usa ocho tarjetas como decisión configurable.',
          evidenceRefs: [editorialEvidence],
        },
      ],
      risks: [
        {
          statement:
            'La voz continúa como candidato first-party y bloquea release público sin confirmación del owner.',
          evidenceRefs: [binding('registries/brand/voice-profile-v2.yml')],
        },
      ],
      criteria: [
        'Cada afirmación material conserva una fuente o se presenta como señal a medir.',
        'La secuencia termina en un único movimiento verificable.',
      ],
      compatibleElements:
        index === 2
          ? ['Resultado observable', 'Una idea por tarjeta', 'Continuidad visual sobria']
          : ['Método antes que herramientas'],
    },
    'proposalSha256',
  ),
);
const dimensions = [
  'strategic_fit',
  'editorial_clarity',
  'evidence_integrity',
  'feasibility',
  'accessibility',
] as const;
const subjectScore = new Map([
  ['RT-03', 3],
  ['RT-04', 4],
  ['RT-05', 5],
  ['RT-06', 4],
  ['RT-07', 4],
]);
const crossEvaluations = members.flatMap((reviewer) =>
  proposals
    .filter(({actorInstanceId}) => actorInstanceId !== reviewer.actorInstanceId)
    .map((proposal) => {
      const score = subjectScore.get(proposal.roleId) ?? 3;
      return withDigest(
        {
          schemaVersion: 'cross-evaluation-v2' as const,
          evaluationId: `EVAL-${reviewer.roleId}-${proposal.roleId}-CAR-MAO-001`,
          reviewerActorInstanceId: reviewer.actorInstanceId,
          subjectActorInstanceId: proposal.actorInstanceId,
          proposalId: proposal.proposalId,
          scores: dimensions.map((dimensionId) => ({
            dimensionId,
            score,
            evidenceRefs: [sourceEvidence, carouselEvidence],
            decisionNote: `Puntuación ${String(score)} sustentada en fuente, spec y criterio observable.`,
          })),
          objections:
            proposal.roleId === 'RT-05'
              ? []
              : ['La dirección necesita integrarse a la secuencia canónica seleccionada.'],
          socraticQuestions: [
            '¿Qué evidencia observable invalidaría esta dirección antes de publicarla?',
          ],
          compatibleElements: ['Puede aportar un criterio a la propuesta narrativa seleccionada.'],
        },
        'evaluationSha256',
      );
    }),
);
const unsignedSession = {
  schemaVersion: 'committee-session-v2' as const,
  committeeId: 'COMMITTEE-CAR-MAO-001',
  workOrderId: workOrder.workOrderId,
  workOrderSha256: workOrder.canonicalSha256,
  compositionPattern: 'two-plus-two-plus-one' as const,
  members,
  rubric: dimensions.map((dimensionId) => ({
    dimensionId,
    weight: 0.2,
    acceptanceSignal: `Criterio ${dimensionId} observable y ligado a evidencia.`,
  })),
  proposals,
  crossEvaluations,
  createdAt: '2026-07-20T17:37:00.000Z',
};
const committeeSession = CommitteeSessionV2Schema.parse(
  withDigest(unsignedSession, 'sessionSha256'),
);
const committeeDecision = adjudicateCommitteeV2(committeeSession);
const selected = committeeSession.proposals.find(
  ({proposalId}) => proposalId === committeeDecision.selectedProposalId,
);
if (selected?.actorInstanceId !== candidate.proposalActorInstanceId) {
  throw new Error('OWNERSHIP_CONFLICT: committee did not select the candidate proposal actor');
}

const Rt09ReportSchema = z
  .object({
    schemaVersion: z.literal('rt09-verifier-report-v2'),
    reportId: z.literal('RT09-CAR-MAO-001'),
    actorInstanceId: z.literal('RT-09-CAR-MAO-001'),
    producerActorInstanceId: z.literal('RT-07-CAR-MAO-001'),
    candidatePackageId: z.literal('CP-CAR-MAO-001'),
    candidatePackageSha256: z.string().regex(/^[a-f0-9]{64}$/u),
    decision: z.literal('pass'),
    evidenceRefs: z.array(HashBoundReferenceV1Schema).min(3),
    coverageGaps: z.array(z.string()),
    reviewedAt: z.iso.datetime({offset: true}),
  })
  .passthrough();
const rt09Report = Rt09ReportSchema.parse(readJson(rt09Ref));
if (rt09Report.candidatePackageSha256 !== candidate.packageSha256) {
  throw new Error('CLAIM_MISMATCH: RT-09 reviewed a stale candidate package');
}
for (const evidenceRef of rt09Report.evidenceRefs) {
  await verifyHashBoundFile(root, evidenceRef);
}
const rt09OutputSha256 = fileSha256(rt09Ref);

const runtime = new CreativeOrchestrationRuntimeV2({
  runId: 'RUN-CAR-MAO-001',
  workOrder,
  orchestratorActorInstanceId: 'RT-01-CAR-MAO-001',
  guardianActorInstanceId: 'RT-11-CAR-MAO-001',
  specialistInstances: [
    ...members.map(({roleId, actorInstanceId}) => ({roleId, actorInstanceId})),
    {roleId: 'RT-09' as const, actorInstanceId: 'RT-09-CAR-MAO-001'},
  ],
  createdAt: '2026-07-20T17:30:00.000Z',
});
const waveTimes = [
  ['2026-07-20T17:31:00.000Z', '2026-07-20T17:32:00.000Z'],
  ['2026-07-20T17:33:00.000Z', '2026-07-20T17:34:00.000Z'],
  ['2026-07-20T17:35:00.000Z', '2026-07-20T17:36:00.000Z'],
] as const;
for (let index = 0; index < members.length; index += 2) {
  const wave = members.slice(index, index + 2);
  const [startedAt, completedAt] = waveTimes[Math.floor(index / 2)]!;
  runtime.startSpecialists(
    wave.map(({roleId}) => roleId),
    startedAt,
  );
  for (const member of wave) {
    const proposal = proposals.find(({roleId}) => roleId === member.roleId);
    if (proposal === undefined) throw new Error(`Proposal missing for ${member.roleId}`);
    runtime.completeSpecialist(member.roleId, proposal.proposalSha256, completedAt);
  }
}
runtime.recordCommitteeDecision({
  proposalBindings: committeeDecision.proposalBindings,
  selectedProposalId: committeeDecision.selectedProposalId,
  decisionSha256: committeeDecision.decisionSha256,
  trace: committeeDecision.trace,
  decidedAt: committeeDecision.decidedAt,
});
runtime.acceptCandidatePackage(candidate, '2026-07-20T17:38:00.000Z');
runtime.startSpecialists(['RT-09'], '2026-07-20T17:39:00.000Z');
runtime.completeSpecialist('RT-09', rt09OutputSha256, rt09Report.reviewedAt);

mkdirSync(resolve(root, orchestrationRoot), {recursive: true});
writeJson(`${orchestrationRoot}/committee-session.json`, committeeSession);
writeJson(`${orchestrationRoot}/committee-decision.json`, committeeDecision);
const preGuardianRun = runtime.snapshot();
const generatedPreGuardianPersistenceReceipt = await persistPilotOrchestrationRunV2(
  resolve(root, orchestrationRoot),
  'orchestration-run-pre-guardian.json',
  preGuardianRun,
  rt09Report.reviewedAt,
);
const preGuardianPersistenceReceipt = OrchestrationRunPersistenceReceiptV2Schema.parse({
  ...generatedPreGuardianPersistenceReceipt,
  // Compatibility pin: this receipt existed before snapshot-qualified IDs.
  // The final receipt uses the corrected unique ID; both durable IDs are distinct.
  receiptId: 'receipt:RUN-CAR-MAO-001:persistence',
});
writeAppendOnlyPersistenceReceipt(
  `${orchestrationRoot}/persistence-receipt-pre-guardian.json`,
  preGuardianPersistenceReceipt,
);

const guardianRef = `${projectRoot}/guardian/GDN-CAR-MAO-001.yml`;
if (existsSync(resolve(root, guardianRef))) {
  const GuardianReportSchema = z
    .object({
      schemaVersion: z.literal('guardian-review-v2'),
      reviewId: z.literal('GDN-CAR-MAO-001'),
      actorInstanceId: z.literal('RT-11-CAR-MAO-001'),
      producerActorInstanceId: z.literal('RT-07-CAR-MAO-001'),
      verifierActorInstanceId: z.literal('RT-09-CAR-MAO-001'),
      candidatePackageId: z.literal('CP-CAR-MAO-001'),
      candidatePackageSha256: z.string().regex(/^[a-f0-9]{64}$/u),
      rt09ReportRef: HashBoundReferenceV1Schema,
      decision: z.enum(['pass', 'fail', 'changes_requested']),
      evidenceRefs: z.array(HashBoundReferenceV1Schema).min(3),
      coverageGaps: z.array(z.string()),
      reviewedAt: z.iso.datetime({offset: true}),
      publicationAuthorized: z.literal(false),
      humanApprovalPresent: z.literal(false),
      reviewSha256: z.string().regex(/^[a-f0-9]{64}$/u),
    })
    .passthrough();
  const guardianReport = GuardianReportSchema.parse(
    parse(readFileSync(resolve(root, guardianRef), 'utf8')) as unknown,
  );
  if (
    guardianReport.candidatePackageSha256 !== candidate.packageSha256 ||
    guardianReport.rt09ReportRef.ref !== rt09Ref ||
    guardianReport.rt09ReportRef.sha256 !== rt09OutputSha256 ||
    computeDeclaredContractSha256(guardianReport, 'reviewSha256') !== guardianReport.reviewSha256
  ) {
    throw new Error('CLAIM_MISMATCH: Guardian review bindings are stale');
  }
  await verifyHashBoundFile(root, guardianReport.rt09ReportRef);
  for (const evidenceRef of guardianReport.evidenceRefs) {
    await verifyHashBoundFile(root, evidenceRef);
  }
  runtime.recordGuardianReview({
    producerActorInstanceId: guardianReport.producerActorInstanceId,
    verifierActorInstanceId: guardianReport.verifierActorInstanceId,
    guardianActorInstanceId: guardianReport.actorInstanceId,
    candidatePackageId: guardianReport.candidatePackageId,
    candidatePackageSha256: guardianReport.candidatePackageSha256,
    decision: guardianReport.decision,
    evidenceHashes: [
      guardianReport.reviewSha256,
      ...new Set(guardianReport.evidenceRefs.map(({sha256}) => sha256)),
    ],
    reviewedAt: guardianReport.reviewedAt,
  });
  const finalRun = runtime.snapshot();
  const finalPersistenceReceipt = await persistPilotOrchestrationRunV2(
    resolve(root, orchestrationRoot),
    'orchestration-run-v2.json',
    finalRun,
    guardianReport.reviewedAt,
  );
  writeAppendOnlyPersistenceReceipt(
    `${orchestrationRoot}/persistence-receipt-v2.json`,
    finalPersistenceReceipt,
  );
  console.info(
    `PASS CAROUSEL ORCHESTRATION: ${String(proposals.length)} proposals, ` +
      `${String(crossEvaluations.length)} cross-evaluations, RT-09 before RT-11, H01 pending.`,
  );
} else {
  console.info(
    `PASS CAROUSEL ORCHESTRATION: ${String(proposals.length)} proposals, ` +
      `${String(crossEvaluations.length)} cross-evaluations, RT-09 complete, Guardian pending.`,
  );
}
