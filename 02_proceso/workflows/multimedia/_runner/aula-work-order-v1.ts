import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {FramesWorkOrderV1Schema, hashExperienceValue} from '../../../core/contracts/index.ts';
import {assertContainedInputFileV1} from '../../core/safe-local-path-v1.ts';
import type {AulaContinuationV1} from '../_schema/aula-approval-v1.ts';
import {aulaAuthorityRefV1} from './aula-engine-authority-v1.ts';
import {planAulaBuildV1, aulaEngineRefV1} from './aula-build-dependencies-v1.ts';
import type {selectAulaCapabilityV1} from './aula-capability-v1.ts';

export const aulaFileHashV1 = (path: string) =>
  createHash('sha256').update(readFileSync(path)).digest('hex');
export const aulaWriteAllowedV1 = (ref: string, rules: readonly string[]) =>
  rules.some((rule) => ref === rule || (rule.endsWith('/**') && ref.startsWith(rule.slice(0, -2))));
export function createAulaWorkOrderV1(input: {
  root: string;
  requestHash: string;
  actorId: string;
  continuation: AulaContinuationV1;
  capability: NonNullable<ReturnType<typeof selectAulaCapabilityV1>>;
}) {
  const {root, requestHash, actorId, continuation: c, capability} = input;
  const build = planAulaBuildV1({root, ...c, kind: capability.kind, edition: capability.edition});
  const refs = [
    ...new Set([
      c.inputRef,
      c.briefRef,
      c.briefApprovalRef,
      aulaAuthorityRefV1,
      ...(c.specRef ? [c.specRef] : []),
      ...(c.specApprovalRef ? [c.specApprovalRef] : []),
      ...(c.intakeRef ? [c.intakeRef] : []),
      ...(c.intakeApprovalRef ? [c.intakeApprovalRef] : []),
      ...['runtime.py', 'app.js', 'style.css'].map(
        (name) => `03_artefactos/renderers/frames-aula/${name}`,
      ),
    ]),
  ];
  const inputs = refs.map((ref) => ({
    ref,
    sha256: aulaFileHashV1(assertContainedInputFileV1(root, ref)),
  }));
  const outputNames = c.stage === 'build' ? build.plan.outputs : ['spec.json'];
  const readSet = [
    ...refs,
    `${aulaEngineRefV1}/assets/core/**`,
    ...(build.binding.buildDependencies?.some((dep) => dep.role === 'linked-piece')
      ? [`${dirname(c.inputRef)}/**`]
      : []),
    ...(c.bankRef ? [`${c.bankRef}/**`] : []),
  ];
  const expectedOutputs = outputNames.map((name) => `${c.outputDirectoryRef}/${name}`);
  const additional = [
    'work-order.json',
    'invocation-receipt.json',
    ...(c.stage === 'build' ? ['review-report.json'] : []),
  ].map((name) => `${c.outputDirectoryRef}/${name}`);
  if ([...expectedOutputs, ...additional].some((ref) => !aulaWriteAllowedV1(ref, c.writeSet)))
    throw new Error('AULA_OUTPUT_CONTRACT_MISMATCH');
  const draft = {
    schemaVersion: 'frames-work-order-v1' as const,
    workOrderId: `WO.AULA.${requestHash.slice(0, 16)}.${c.stage}`,
    requestHash,
    routeId: 'R6' as const,
    workflowId: c.stage === 'spec' ? 'P05' : 'P06',
    stepId: 'S01',
    skillId: capability.skillId,
    actorId,
    readSet,
    writeSet: c.writeSet,
    inputs,
    expectedOutputs,
    tools: ['Bash'],
    effectClass: 'LOCAL_REVERSIBLE' as const,
    budget: {
      targetFiles: expectedOutputs.length + additional.length,
      maxFiles: 20,
      targetTokens: 2000,
      maxTokens: 6000,
    },
    acceptanceCriteria: ['Current approvals, route, edition and exact output hashes verified'],
    stopRule:
      c.stage === 'spec'
        ? 'SPEC_DRAFT; await MW_SPEC_APPROVED.'
        : 'RENDERED_DRAFT; human review and publication remain separate.',
  };
  return FramesWorkOrderV1Schema.parse({...draft, canonicalSha256: hashExperienceValue(draft)});
}
