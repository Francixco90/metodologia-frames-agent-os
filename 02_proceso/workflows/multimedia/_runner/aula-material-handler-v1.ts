import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {hashExperienceValue} from '../../../core/contracts/index.ts';
import {normalizeFirstTurnPromptV1} from '../../core/first-turn-signals-v1.ts';
import type {MaterialSkillHandlerV1} from '../../core/material-skill-adapter-v1.ts';
import {
  assertContainedInputFileV1,
  prepareContainedDirectoryV1,
} from '../../core/safe-local-path-v1.ts';
import {
  AulaBriefApprovalV1Schema,
  AulaSpecApprovalV1Schema,
  AulaDeckIntakeApprovalV1Schema,
  AulaDesignV1Schema,
} from '../_schema/aula-approval-v1.ts';
import {assertAulaEngineAuthorityV1} from './aula-engine-authority-v1.ts';
import {selectAulaCapabilityV1, type AulaEdition} from './aula-capability-v1.ts';
import {aulaFileHashV1 as hash, aulaWriteAllowedV1 as allowed} from './aula-work-order-v1.ts';

export function assertAulaApprovalsV1(input: {
  root: string;
  requestHash: string;
  edition: AulaEdition;
  inputRef: string;
  briefRef: string;
  approvalRef: string;
  specRef?: string;
  specApprovalRef?: string;
  intakeRef?: string;
  intakeApprovalRef?: string;
  requireSpec: boolean;
  isDeck: boolean;
}) {
  const read = (ref: string) =>
    JSON.parse(readFileSync(assertContainedInputFileV1(input.root, ref), 'utf8')) as unknown;
  const fileHash = (ref: string) => hash(assertContainedInputFileV1(input.root, ref));
  const lock = (approval: {requestHash: string; edition: AulaEdition}) => {
    if (approval.requestHash !== input.requestHash || approval.edition !== input.edition)
      throw new Error('AULA_APPROVAL_ROUTE_LOCK_MISMATCH');
  };
  const brief = AulaBriefApprovalV1Schema.parse(read(input.approvalRef));
  lock(brief);
  if (brief.briefSha256 !== fileHash(input.briefRef)) throw new Error('AULA_BRIEF_APPROVAL_STALE');
  if (input.isDeck) {
    if (!input.intakeRef || !input.intakeApprovalRef)
      throw new Error('AULA_DECK_INTAKE_APPROVAL_REQUIRED');
    const intake = AulaDeckIntakeApprovalV1Schema.parse(read(input.intakeApprovalRef));
    lock(intake);
    if (intake.intakeSha256 !== fileHash(input.intakeRef))
      throw new Error('AULA_DECK_INTAKE_APPROVAL_STALE');
    const value = read(input.intakeRef);
    if (
      !value ||
      typeof value !== 'object' ||
      !('audience' in value) ||
      !('problem' in value) ||
      !('decision' in value) ||
      typeof value.audience !== 'string' ||
      !value.audience.trim() ||
      typeof value.problem !== 'string' ||
      !value.problem.trim() ||
      typeof value.decision !== 'string' ||
      !value.decision.trim() ||
      ('edition' in value && value.edition !== input.edition)
    )
      throw new Error('AULA_DECK_INTAKE_INVALID');
  }
  if (input.requireSpec) {
    if (!input.specRef || !input.specApprovalRef) throw new Error('AULA_SPEC_APPROVAL_REQUIRED');
    const spec = AulaDesignV1Schema.parse(read(input.specRef));
    const approval = AulaSpecApprovalV1Schema.parse(read(input.specApprovalRef));
    lock(approval);
    if (
      spec.requestHash !== input.requestHash ||
      spec.edition !== input.edition ||
      spec.inputRef !== input.inputRef ||
      spec.inputSha256 !== fileHash(input.inputRef) ||
      spec.briefRef !== input.briefRef ||
      spec.briefSha256 !== fileHash(input.briefRef) ||
      approval.specSha256 !== fileHash(input.specRef) ||
      approval.inputSha256 !== fileHash(input.inputRef) ||
      (input.isDeck &&
        (spec.intakeRef !== input.intakeRef || spec.intakeSha256 !== fileHash(input.intakeRef!)))
    )
      throw new Error('AULA_SPEC_APPROVAL_STALE');
  }
}
export function createAulaMaterialHandlerV1(input: {
  root: string;
  request: string;
  requestHash?: string;
  edition?: AulaEdition;
  inputRef: string;
  briefRef: string;
  approvalRef: string;
  specRef?: string;
  specApprovalRef?: string;
  intakeRef?: string;
  intakeApprovalRef?: string;
  outputDirectoryRef: string;
}): MaterialSkillHandlerV1 {
  return (order) => {
    const capability = selectAulaCapabilityV1(input.request, input.edition);
    if (
      !capability ||
      capability.skillId !== order.skillId ||
      order.routeId !== 'R6' ||
      order.workflowId !== 'P06' ||
      order.requestHash !==
        hashExperienceValue({prompt: normalizeFirstTurnPromptV1(input.request)}) ||
      (input.requestHash !== undefined && input.requestHash !== order.requestHash)
    )
      throw new Error('AULA_ROUTE_LOCK_MISMATCH');
    assertAulaEngineAuthorityV1(input.root);
    const refs = [
      input.inputRef,
      input.briefRef,
      input.approvalRef,
      ...(input.specRef ? [input.specRef] : []),
      ...(input.specApprovalRef ? [input.specApprovalRef] : []),
      ...(input.intakeRef ? [input.intakeRef] : []),
      ...(input.intakeApprovalRef ? [input.intakeApprovalRef] : []),
      ...['runtime.py', 'app.js', 'style.css'].map(
        (name) => `03_artefactos/renderers/frames-aula/${name}`,
      ),
    ];
    for (const ref of refs) {
      if (!allowed(ref, order.readSet)) throw new Error('AULA_UNAUTHORIZED_INPUT');
      const path = assertContainedInputFileV1(input.root, ref);
      if (!order.inputs.some((item) => item.ref === ref && item.sha256 === hash(path)))
        throw new Error('AULA_INPUT_HASH_MISMATCH');
    }
    if (input.specRef) {
      const spec = AulaDesignV1Schema.parse(
        JSON.parse(
          readFileSync(assertContainedInputFileV1(input.root, input.specRef), 'utf8'),
        ) as unknown,
      );
      if (spec.kind !== capability.kind || spec.skillId !== capability.skillId)
        throw new Error('AULA_SPEC_ROUTE_LOCK_MISMATCH');
    }
    assertAulaApprovalsV1({
      ...input,
      requestHash: order.requestHash,
      edition: capability.edition,
      requireSpec: true,
      isDeck: capability.kind === 'dynamic-commercial-decks',
    });
    const runtime = assertContainedInputFileV1(
      input.root,
      '03_artefactos/renderers/frames-aula/runtime.py',
    );
    const args = [
      '--kind',
      capability.kind,
      '--edition',
      capability.edition,
      '--input',
      assertContainedInputFileV1(input.root, input.inputRef),
      '--out',
      resolve(input.root, input.outputDirectoryRef),
    ];
    const options = {
      encoding: 'utf8' as const,
      timeout: 60_000,
      env: {...process.env, PYTHONDONTWRITEBYTECODE: '1'},
    };
    const plan = JSON.parse(execFileSync('python3', [runtime, 'plan', ...args], options)) as {
      outputs: string[];
    };
    const outputRefs = plan.outputs.map((name) => `${input.outputDirectoryRef}/${name}`);
    if (
      JSON.stringify([...outputRefs].sort()) !==
        JSON.stringify([...order.expectedOutputs].sort()) ||
      outputRefs.some((ref) => !allowed(ref, order.writeSet))
    )
      throw new Error('AULA_OUTPUT_CONTRACT_MISMATCH');
    prepareContainedDirectoryV1(input.root, input.outputDirectoryRef);
    execFileSync('python3', [runtime, 'build', ...args], options);
    return {
      status: 'PASS',
      outputs: outputRefs.map((ref) => ({ref, sha256: hash(resolve(input.root, ref))})),
      evidence: refs.map((ref) => ({
        ref,
        sha256: hash(assertContainedInputFileV1(input.root, ref)),
      })),
      publicSummary: 'HTML local generado; RENDERED_DRAFT, revisión humana pendiente.',
      metrics: {kind: capability.kind, edition: capability.edition, externalEffects: false},
    };
  };
}
