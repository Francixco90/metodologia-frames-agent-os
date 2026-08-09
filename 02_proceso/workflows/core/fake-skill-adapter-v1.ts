import {
  FramesWorkOrderV1Schema,
  SkillInvocationReceiptV1Schema,
  hashExperienceValue,
  type FramesWorkOrderV1,
  type SkillInvocationReceiptV1,
} from '../../core/contracts/index.ts';

interface FakeSkillResultV1 {
  status: 'PASS' | 'FAIL' | 'UNKNOWN' | 'BLOCKED';
  outputs: Array<{ref: string; sha256: string}>;
  evidence: Array<{ref: string; sha256: string}>;
  publicSummary: string;
  metrics?: Record<string, boolean | null | number | string>;
}

export type FakeSkillHandlerV1 = (
  workOrder: FramesWorkOrderV1,
) => FakeSkillResultV1 | Promise<FakeSkillResultV1>;

export class FakeSkillAdapterV1 {
  readonly #handlers: ReadonlyMap<string, FakeSkillHandlerV1>;

  public constructor(handlers: Readonly<Record<string, FakeSkillHandlerV1>>) {
    this.#handlers = new Map(Object.entries(handlers));
  }

  public async invoke(input: {
    invocationId: string;
    workOrder: FramesWorkOrderV1;
    startedAt: string;
    completedAt: string;
  }): Promise<SkillInvocationReceiptV1> {
    const workOrder = FramesWorkOrderV1Schema.parse(input.workOrder);
    if (hashExperienceValue(workOrder) !== workOrder.canonicalSha256) {
      return this.#receipt(input, workOrder, {
        status: 'BLOCKED',
        outputs: [],
        evidence: [],
        publicSummary: 'Work order hash mismatch.',
        metrics: {handlerInvoked: false},
      });
    }
    const handler = this.#handlers.get(workOrder.skillId);
    if (handler === undefined) {
      return this.#receipt(input, workOrder, {
        status: 'BLOCKED',
        outputs: [],
        evidence: [],
        publicSummary: 'No registered skill handler.',
        metrics: {handlerInvoked: false},
      });
    }
    try {
      const result = await handler(workOrder);
      const outputRefs = new Set(result.outputs.map(({ref}) => ref));
      const outputsMatch =
        result.outputs.every(({ref}) => workOrder.expectedOutputs.includes(ref)) &&
        workOrder.expectedOutputs.every((ref) => outputRefs.has(ref));
      if (
        result.status === 'PASS' &&
        (result.outputs.length === 0 || result.evidence.length === 0 || !outputsMatch)
      ) {
        return this.#receipt(input, workOrder, {
          status: 'UNKNOWN',
          outputs: result.outputs,
          evidence: result.evidence,
          publicSummary: 'Skill returned PASS without the exact material outputs and evidence.',
          metrics: {...result.metrics, handlerInvoked: true},
        });
      }
      return this.#receipt(input, workOrder, result);
    } catch {
      return this.#receipt(input, workOrder, {
        status: 'UNKNOWN',
        outputs: [],
        evidence: [],
        publicSummary: 'Skill handler failed without verifiable completion.',
        metrics: {handlerInvoked: true},
      });
    }
  }

  #receipt(
    input: {invocationId: string; startedAt: string; completedAt: string},
    workOrder: FramesWorkOrderV1,
    result: FakeSkillResultV1,
  ): SkillInvocationReceiptV1 {
    const draft = {
      schemaVersion: 'skill-invocation-receipt-v1' as const,
      invocationId: input.invocationId,
      workOrderId: workOrder.workOrderId,
      workOrderSha256: workOrder.canonicalSha256,
      skillId: workOrder.skillId,
      actorId: workOrder.actorId,
      status: result.status,
      outputs: result.outputs,
      evidence: result.evidence,
      publicSummary: result.publicSummary,
      metrics: result.metrics ?? {},
      startedAt: input.startedAt,
      completedAt: input.completedAt,
    };
    return SkillInvocationReceiptV1Schema.parse({
      ...draft,
      canonicalSha256: hashExperienceValue(draft),
    });
  }
}
