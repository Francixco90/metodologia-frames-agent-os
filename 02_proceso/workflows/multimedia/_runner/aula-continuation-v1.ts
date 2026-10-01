import {execFileSync} from 'node:child_process';
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {parse as parseYaml} from 'yaml';
import {z} from 'zod';
import {TimestampSchema, type FramesWorkOrderV1} from '../../../core/contracts/index.ts';
import {
  MaterialSkillAdapterV1,
  type MaterialSkillHandlerV1,
} from '../../core/material-skill-adapter-v1.ts';
import {
  assertContainedInputFileV1,
  prepareContainedDirectoryV1,
} from '../../core/safe-local-path-v1.ts';
import {AulaContinuationV1Schema, AulaDesignV1Schema} from '../_schema/aula-approval-v1.ts';
import {selectAulaCapabilityV1} from './aula-capability-v1.ts';
import {assertAulaApprovalsV1, createAulaMaterialHandlerV1} from './aula-material-handler-v1.ts';
import {createAulaWorkOrderV1, aulaFileHashV1 as hash} from './aula-work-order-v1.ts';

const Registry = z.object({
  entries: z.array(
    z.object({
      skill_id: z.string(),
      current_state: z.string(),
      content_sha256: z.string(),
      publication_authority: z.boolean(),
    }),
  ),
});
export async function continueAulaExperienceV1(input: {
  root: string;
  request: string;
  requestHash: string;
  routeId: string;
  continuation: unknown;
  actorId: string;
  startedAt: string;
  completedAt: string;
}) {
  const save = (ref: string, value: unknown) =>
    writeFileSync(resolve(input.root, ref), JSON.stringify(value, null, 2) + '\n', {flag: 'wx'});
  const read = (ref: string) => readFileSync(assertContainedInputFileV1(input.root, ref), 'utf8');
  const c = AulaContinuationV1Schema.parse(input.continuation);
  TimestampSchema.parse(input.startedAt);
  TimestampSchema.parse(input.completedAt);
  if (Date.parse(input.completedAt) < Date.parse(input.startedAt))
    throw new Error('AULA_INVOCATION_TIME_INVALID');
  const capability = selectAulaCapabilityV1(input.request, c.edition);
  if (input.routeId !== 'R6' || !capability) throw new Error('AULA_ROUTE_LOCK_MISMATCH');
  const registryRef = '04_estado/registries/skills/creation-v3-skill-registry.yml';
  const registry = Registry.parse(parseYaml(read(registryRef)) as unknown);
  const entry = registry.entries.find((item) => item.skill_id === capability.skillId);
  if (
    !entry ||
    entry.current_state !== 'active' ||
    entry.publication_authority ||
    entry.content_sha256 !==
      hash(
        assertContainedInputFileV1(
          input.root,
          `03_artefactos/skills/${capability.skillId}/SKILL.md`,
        ),
      )
  )
    throw new Error('AULA_SKILL_NOT_ACTIVE_OR_STALE');
  const approvalInput = {
    root: input.root,
    requestHash: input.requestHash,
    edition: capability.edition,
    inputRef: c.inputRef,
    briefRef: c.briefRef,
    approvalRef: c.briefApprovalRef,
    ...(c.specRef ? {specRef: c.specRef} : {}),
    ...(c.specApprovalRef ? {specApprovalRef: c.specApprovalRef} : {}),
    ...(c.intakeRef ? {intakeRef: c.intakeRef} : {}),
    ...(c.intakeApprovalRef ? {intakeApprovalRef: c.intakeApprovalRef} : {}),
    requireSpec: c.stage === 'build',
    isDeck: capability.kind === 'dynamic-commercial-decks',
  };
  assertAulaApprovalsV1(approvalInput);
  const order = createAulaWorkOrderV1({...input, continuation: c, capability});
  if (existsSync(resolve(input.root, c.outputDirectoryRef)))
    throw new Error('AULA_OUTPUT_EXISTS_USE_SUCCESSOR');
  let handler: MaterialSkillHandlerV1;
  if (c.stage === 'spec') {
    const runtime = assertContainedInputFileV1(
      input.root,
      '03_artefactos/renderers/frames-aula/runtime.py',
    );
    execFileSync(
      'python3',
      [
        runtime,
        'check',
        '--kind',
        capability.kind,
        '--edition',
        capability.edition,
        '--input',
        assertContainedInputFileV1(input.root, c.inputRef),
        '--out',
        resolve(input.root, c.outputDirectoryRef),
      ],
      {encoding: 'utf8', timeout: 60_000, env: {...process.env, PYTHONDONTWRITEBYTECODE: '1'}},
    );
    const spec = AulaDesignV1Schema.parse({
      schemaVersion: 'frames-aula-design-v1',
      requestHash: input.requestHash,
      routeId: 'R6',
      edition: capability.edition,
      kind: capability.kind,
      skillId: capability.skillId,
      inputRef: c.inputRef,
      inputSha256: hash(assertContainedInputFileV1(input.root, c.inputRef)),
      briefRef: c.briefRef,
      briefSha256: hash(assertContainedInputFileV1(input.root, c.briefRef)),
      state: 'SPEC_DRAFT',
      ...(c.intakeRef
        ? {
            intakeRef: c.intakeRef,
            intakeSha256: hash(assertContainedInputFileV1(input.root, c.intakeRef)),
          }
        : {}),
    });
    handler = (workOrder: FramesWorkOrderV1) => {
      prepareContainedDirectoryV1(input.root, c.outputDirectoryRef);
      save(`${c.outputDirectoryRef}/spec.json`, spec);
      return {
        status: 'PASS',
        outputs: workOrder.expectedOutputs.map((ref) => ({
          ref,
          sha256: hash(resolve(input.root, ref)),
        })),
        evidence: workOrder.inputs,
        publicSummary: 'Especificación validada: SPEC_DRAFT; aprobación humana pendiente.',
      };
    };
  } else
    handler = createAulaMaterialHandlerV1({
      ...approvalInput,
      request: input.request,
      outputDirectoryRef: c.outputDirectoryRef,
    });
  const receipt = await new MaterialSkillAdapterV1(input.root, {
    [capability.skillId]: handler,
  }).invoke({
    invocationId: `INV.AULA.${input.requestHash.slice(0, 16)}.${c.stage}`,
    workOrder: order,
    startedAt: input.startedAt,
    completedAt: input.completedAt,
  });
  if (receipt.status !== 'PASS')
    return {status: 'BLOCKED', materialized: false, coverageGap: receipt.publicSummary, receipt};
  prepareContainedDirectoryV1(input.root, c.outputDirectoryRef);
  save(`${c.outputDirectoryRef}/work-order.json`, order);
  const receiptRef = `${c.outputDirectoryRef}/invocation-receipt.json`;
  save(receiptRef, receipt);
  let reviewRef: string | undefined;
  if (c.stage === 'build') {
    reviewRef = `${c.outputDirectoryRef}/review-report.json`;
    save(reviewRef, {
      schemaVersion: 'frames-aula-review-v1',
      workflowId: 'P07',
      requestHash: input.requestHash,
      skillId: capability.skillId,
      edition: capability.edition,
      outputs: receipt.outputs,
      mechanicalStatus: 'PASS',
      humanReviewStatus: 'PENDING',
      state: 'RENDERED_DRAFT',
      publicationAuthorized: false,
      coverageGaps: ['Human content, visual quality and acceptance review pending.'],
      checks: [
        'Renderer input validated',
        'Output plan exact',
        'Artifact hashes reread',
        'Audience output generated when requested',
      ],
    });
  }
  return {
    status: c.stage === 'spec' ? 'AWAITING_APPROVAL' : 'RENDERED_DRAFT',
    materialized: true,
    routeId: 'R6',
    workflowId: c.stage === 'spec' ? 'P05' : 'P07',
    nextGate: c.stage === 'spec' ? 'MW_SPEC_APPROVED' : 'MW_ASSET_REVIEW',
    capability,
    workOrderSha256: order.canonicalSha256,
    receiptRef,
    receiptSha256: hash(resolve(input.root, receiptRef)),
    ...(reviewRef ? {reviewRef} : {specRef: `${c.outputDirectoryRef}/spec.json`}),
    humanApproved: false,
    publicationAuthorized: false,
  };
}
