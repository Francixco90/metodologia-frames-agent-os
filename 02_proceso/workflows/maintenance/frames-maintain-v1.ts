import {z} from 'zod';

import {
  FramesWorkOrderV1Schema,
  Sha256Schema,
  hashExperienceValue,
  type FramesWorkOrderV1,
} from '../../core/contracts/index.ts';
import {canonicalize} from '../../core/evidence/canonical-json.ts';

const GitObject = z.string().regex(/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u);
const safeGitName = (prefix: RegExp) =>
  z
    .string()
    .regex(prefix)
    .refine((value) => !value.includes('..') && !value.includes('//') && !value.endsWith('.lock'));
export const FramesMaintainBindingV1Schema = z.strictObject({
  schemaVersion: z.literal('frames-maintain-binding-v1'),
  repository: z.string().regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u),
  branch: safeGitName(/^codex\/[A-Za-z0-9][A-Za-z0-9._/-]*$/u),
  baseRef: safeGitName(/^[A-Za-z0-9][A-Za-z0-9._-]*\/[A-Za-z0-9][A-Za-z0-9._/-]*$/u),
  baseCommit: GitObject,
  baseTree: GitObject,
});
export type FramesMaintainBindingV1 = z.infer<typeof FramesMaintainBindingV1Schema>;
const InspectInput = z.strictObject({
  schemaVersion: z.literal('frames-maintain-inspect-input-v1'),
  binding: FramesMaintainBindingV1Schema,
});
const PlanInput = z.strictObject({
  schemaVersion: z.literal('frames-maintain-plan-input-v1'),
  binding: FramesMaintainBindingV1Schema,
  expectedInspectionSha256: Sha256Schema,
  workOrder: z.unknown(),
});
const HandoffInput = z.strictObject({
  schemaVersion: z.literal('frames-maintain-handoff-input-v1'),
  binding: FramesMaintainBindingV1Schema,
  expectedInspectionSha256: Sha256Schema,
  workOrderRef: z.string().min(1).max(512),
  workOrderPhysicalSha256: Sha256Schema,
});
export type FramesMaintainObservedGitV1 = FramesMaintainBindingV1 & {
  headCommit: string;
  headTree: string;
  status: {clean: boolean; entryCount: number; sha256: string};
};
export type FramesMaintainVerificationV1 = {
  inputSetSha256: string;
  outputs: Array<{ref: string; sha256: string}>;
};
export interface FramesMaintainReadPortV1 {
  inspect(binding: FramesMaintainBindingV1): FramesMaintainObservedGitV1;
  readWorkOrder(ref: string, sha256: string): unknown;
  verify(
    order: FramesWorkOrderV1,
    binding: FramesMaintainBindingV1,
    phase: 'PLAN' | 'HANDOFF',
  ): FramesMaintainVerificationV1;
}

function fail(code: string): never {
  throw new Error(code);
}
const parse = <T>(schema: z.ZodType<T>, input: unknown): T => {
  const result = schema.safeParse(input);
  if (!result.success) fail('FM-INPUT001');
  return result.data;
};
const reserved = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/iu;
export const assertFramesMaintainFileRefV1 = (ref: string): string => {
  const bad = ref.split('/').some((part) => {
    const control = [...part].some((char) => (char.codePointAt(0) ?? 0) <= 31 || char === '\u007f');
    return (
      !part ||
      part === '.' ||
      part === '..' ||
      part.endsWith('.') ||
      part.endsWith(' ') ||
      part.includes(':') ||
      /[*?[\]{}]/u.test(part) ||
      reserved.test(part) ||
      control
    );
  });
  if (ref !== ref.normalize('NFKC') || ref.includes('\\') || ref.startsWith('/') || bad)
    fail('FM-PATH001');
  return ref;
};
const noAliases = (refs: readonly string[]): void => {
  const keys = refs.map((ref) =>
    assertFramesMaintainFileRefV1(ref).normalize('NFKC').toUpperCase(),
  );
  if (new Set(keys).size !== refs.length) fail('FM-ALIAS001');
};
const parseWorkOrder = (input: unknown): FramesWorkOrderV1 => {
  if (!input || Array.isArray(input) || typeof input !== 'object') fail('FM-WORKORDER001');
  const raw = {...(input as Record<string, unknown>)};
  if (raw.routeId !== 'R9' || raw.effectClass !== 'LOCAL_REVERSIBLE') fail('FM-EFFECT001');
  for (const key of ['readSet', 'writeSet', 'expectedOutputs'] as const) {
    const refs = raw[key];
    if (Array.isArray(refs) && refs.every((ref): ref is string => typeof ref === 'string'))
      noAliases(refs);
  }
  if (Array.isArray(raw.inputs))
    noAliases(
      raw.inputs.flatMap((item) =>
        item && typeof item === 'object' && typeof (item as {ref?: unknown}).ref === 'string'
          ? [(item as {ref: string}).ref]
          : [],
      ),
    );
  const declared = raw.canonicalSha256;
  if (typeof declared !== 'string') fail('FM-HASH001');
  delete raw.canonicalSha256;
  if (declared !== hashExperienceValue(raw)) fail('FM-HASH001');
  const parsed = FramesWorkOrderV1Schema.safeParse({...raw, canonicalSha256: declared});
  if (!parsed.success) fail('FM-WORKORDER001');
  const order = parsed.data;
  if (!order.changeClass || !order.documentationImpact) fail('FM-WORKORDER001');
  if (hashExperienceValue(order.documentationImpact) !== order.documentationImpact.canonicalSha256)
    fail('FM-HASH001');
  if (
    !order.writeSet.length ||
    canonicalize(order.writeSet) !== canonicalize(order.expectedOutputs) ||
    order.budget.targetFiles !== order.writeSet.length ||
    order.budget.maxFiles > 12
  )
    fail('FM-WORKORDER001');
  if (order.tools.some((tool) => !['apply-patch', 'git-read-only', 'pnpm'].includes(tool)))
    fail('FM-EFFECT001');
  return order;
};
// prettier-ignore
const envelope = <T extends Record<string, unknown>>(draft: T) => ({...draft, canonicalSha256: hashExperienceValue(draft)});
const inspect = (binding: FramesMaintainBindingV1, port: FramesMaintainReadPortV1) =>
  // prettier-ignore
  envelope({
    ...port.inspect(binding), schemaVersion: 'frames-maintain-inspection-v1', mode: 'inspect', routeId: 'R9', effectClass: 'READ_ONLY',
    state: 'STOPPED_AT_GATE', writes: [], nextGate: 'HM_CHANGE_APPROVED', gateStatus: 'REQUIRED',
  });
const frozen = (binding: FramesMaintainBindingV1, hash: string, port: FramesMaintainReadPortV1) => {
  const observed = inspect(binding, port);
  if (observed.canonicalSha256 !== hash) fail('FM-HASH001');
  return observed;
};
export const inspectFramesMaintenanceV1 = (input: unknown, port: FramesMaintainReadPortV1) => {
  const parsed = parse(InspectInput, input);
  return inspect(parsed.binding, port);
};
export const planFramesMaintenanceV1 = (input: unknown, port: FramesMaintainReadPortV1) => {
  const parsed = parse(PlanInput, input);
  const observed = frozen(parsed.binding, parsed.expectedInspectionSha256, port);
  const order = parseWorkOrder(parsed.workOrder);
  const checked = port.verify(order, parsed.binding, 'PLAN');
  if (inspect(parsed.binding, port).canonicalSha256 !== observed.canonicalSha256)
    fail('FM-HASH001');
  // prettier-ignore
  return envelope({schemaVersion: 'frames-maintain-plan-v1', mode: 'plan', routeId: 'R9', effectClass: 'READ_ONLY',
    state: 'STOPPED_AT_GATE', inspectionSha256: observed.canonicalSha256, workOrder: order,
    workOrderSha256: order.canonicalSha256, inputSetSha256: checked.inputSetSha256, writes: [],
    nextGate: 'HM_CHANGE_APPROVED', gateStatus: 'REQUIRED'});
};
// prettier-ignore
export const prepareFramesMaintenanceHandoffV1 = (input: unknown, port: FramesMaintainReadPortV1) => {
  const parsed = parse(HandoffInput, input);
  const observed = frozen(parsed.binding, parsed.expectedInspectionSha256, port);
  const ref = assertFramesMaintainFileRefV1(parsed.workOrderRef);
  const order = parseWorkOrder(port.readWorkOrder(ref, parsed.workOrderPhysicalSha256));
  const checked = port.verify(order, parsed.binding, 'HANDOFF');
  if (inspect(parsed.binding, port).canonicalSha256 !== observed.canonicalSha256) fail('FM-HASH001');
  const reread = parseWorkOrder(port.readWorkOrder(ref, parsed.workOrderPhysicalSha256));
  if (reread.canonicalSha256 !== order.canonicalSha256) fail('FM-HASH001');
  // prettier-ignore
  return envelope({schemaVersion: 'frames-maintain-handoff-v1', mode: 'prepare-handoff', routeId: 'R9',
    effectClass: 'READ_ONLY', state: 'STOPPED_AT_GATE', inspectionSha256: observed.canonicalSha256,
    workOrderId: order.workOrderId, workOrderSha256: order.canonicalSha256,
    workOrderPhysicalSha256: parsed.workOrderPhysicalSha256, candidateSha256: hashExperienceValue(checked.outputs),
    outputs: checked.outputs, writes: [], guardianVerdict: 'NOT_RECORDED', promotionAuthority: 'NOT_RECORDED',
    nextGate: 'HM_PROMOTION_APPROVED', gateStatus: 'REQUIRED'});
};
export const runFramesMaintainV1 = (
  argv: readonly string[],
  stdin: string,
  port: FramesMaintainReadPortV1,
) => {
  if (argv.length !== 1 || !['inspect', 'plan', 'prepare-handoff'].includes(argv[0] ?? ''))
    fail('FM-ARG001');
  let input: unknown;
  try {
    if (!stdin.trim()) fail('FM-INPUT001');
    input = JSON.parse(stdin);
  } catch {
    return fail('FM-INPUT001');
  }
  if (argv[0] === 'inspect') return inspectFramesMaintenanceV1(input, port);
  if (argv[0] === 'plan') return planFramesMaintenanceV1(input, port);
  return prepareFramesMaintenanceHandoffV1(input, port);
};
export const canonicalFramesMaintainJsonV1 = (value: unknown): string => `${canonicalize(value)}\n`;
