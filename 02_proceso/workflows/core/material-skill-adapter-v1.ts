import {createHash} from 'node:crypto';
import {lstat, readFile, realpath} from 'node:fs/promises';
import {relative, resolve, sep} from 'node:path';

import {
  FramesWorkOrderV1Schema,
  SkillInvocationReceiptV1Schema,
  hashExperienceValue,
  type FramesWorkOrderV1,
  type MaterialReferenceV1,
  type SkillInvocationReceiptV1,
} from '../../core/contracts/index.ts';

interface MaterialSkillResultV1 {
  status: 'PASS' | 'FAIL' | 'UNKNOWN' | 'BLOCKED';
  outputs: MaterialReferenceV1[];
  evidence: MaterialReferenceV1[];
  publicSummary: string;
  metrics?: Record<string, boolean | null | number | string>;
}

export type MaterialSkillHandlerV1 = (
  workOrder: FramesWorkOrderV1,
) => MaterialSkillResultV1 | Promise<MaterialSkillResultV1>;

const inside = (parent: string, child: string): boolean =>
  child === parent || child.startsWith(`${parent}${sep}`);

const authorized = (ref: string, allowedRefs: readonly string[]): boolean =>
  allowedRefs.some((rule) => {
    const normalized = rule.replaceAll('\\', '/');
    if (!normalized.endsWith('/**')) return ref === normalized;
    const base = normalized.slice(0, -3);
    return ref === base || ref.startsWith(`${base}/`);
  });

async function readAuthorizedMaterial(
  rootRealPath: string,
  material: MaterialReferenceV1,
  allowedRefs: readonly string[],
  kind: 'Evidence' | 'Output',
): Promise<MaterialReferenceV1> {
  const normalizedRef = material.ref.replaceAll('\\', '/');
  const lexicalPath = resolve(rootRealPath, normalizedRef);
  if (!inside(rootRealPath, lexicalPath) || !authorized(normalizedRef, allowedRefs)) {
    throw new Error(
      kind === 'Output'
        ? 'Output is outside the authorized write set.'
        : 'Evidence is outside the authorized read/write set.',
    );
  }
  const stat = await lstat(lexicalPath);
  if (stat.isSymbolicLink() || !stat.isFile()) {
    throw new Error(`${kind} must be a regular non-symlink file.`);
  }
  const materialPath = await realpath(lexicalPath);
  const materialRef = relative(rootRealPath, materialPath).split(sep).join('/');
  if (!inside(rootRealPath, materialPath) || !authorized(materialRef, allowedRefs)) {
    throw new Error(
      kind === 'Output'
        ? 'Output realpath escapes the authorized write set.'
        : 'Evidence realpath escapes the authorized read/write set.',
    );
  }
  const digest = createHash('sha256')
    .update(await readFile(materialPath))
    .digest('hex');
  if (digest !== material.sha256) throw new Error(`${kind} read-back hash mismatch.`);
  return {ref: materialRef, sha256: digest};
}

export class MaterialSkillAdapterV1 {
  public readonly simulationOnly = false;
  readonly #handlers: ReadonlyMap<string, MaterialSkillHandlerV1>;
  readonly #root: string;

  public constructor(root: string, handlers: Readonly<Record<string, MaterialSkillHandlerV1>>) {
    this.#root = resolve(root);
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
      return this.#receipt(input, workOrder, 'BLOCKED', [], [], 'Work order hash mismatch.');
    }
    if (workOrder.effectClass !== 'LOCAL_REVERSIBLE' || workOrder.writeSet.length === 0) {
      return this.#receipt(
        input,
        workOrder,
        'BLOCKED',
        [],
        [],
        'Material execution requires a local write set.',
      );
    }
    const handler = this.#handlers.get(workOrder.skillId);
    if (handler === undefined) {
      return this.#receipt(input, workOrder, 'BLOCKED', [], [], 'No registered material handler.');
    }
    try {
      const result = await handler(workOrder);
      const rootRealPath = await realpath(this.#root);
      const evidenceScope = [...workOrder.readSet, ...workOrder.writeSet];
      if (result.status !== 'PASS') {
        const evidence = await Promise.all(
          result.evidence.map((item) =>
            readAuthorizedMaterial(rootRealPath, item, evidenceScope, 'Evidence'),
          ),
        );
        return this.#receipt(input, workOrder, result.status, [], evidence, result.publicSummary);
      }
      const declaredRefs = result.outputs.map(({ref}) => ref).sort();
      const expectedRefs = [...workOrder.expectedOutputs].sort();
      if (JSON.stringify(declaredRefs) !== JSON.stringify(expectedRefs)) {
        throw new Error('Declared outputs do not match the work order.');
      }
      const outputs = await Promise.all(
        result.outputs.map((output) =>
          readAuthorizedMaterial(rootRealPath, output, workOrder.writeSet, 'Output'),
        ),
      );
      const evidence = await Promise.all(
        result.evidence.map((item) =>
          readAuthorizedMaterial(rootRealPath, item, evidenceScope, 'Evidence'),
        ),
      );
      if (evidence.length === 0) throw new Error('PASS requires verified material evidence.');
      return this.#receipt(input, workOrder, 'PASS', outputs, evidence, result.publicSummary, {
        ...result.metrics,
        materialExecutionAccredited: true,
        simulationOnly: false,
      });
    } catch (error) {
      const summary =
        error instanceof Error ? error.message : 'Material output could not be verified.';
      return this.#receipt(input, workOrder, 'BLOCKED', [], [], summary);
    }
  }

  #receipt(
    input: {invocationId: string; startedAt: string; completedAt: string},
    workOrder: FramesWorkOrderV1,
    status: 'PASS' | 'FAIL' | 'UNKNOWN' | 'BLOCKED',
    outputs: MaterialReferenceV1[],
    evidence: MaterialReferenceV1[],
    publicSummary: string,
    metrics: Record<string, boolean | null | number | string> = {},
  ): SkillInvocationReceiptV1 {
    const draft = {
      schemaVersion: 'skill-invocation-receipt-v1' as const,
      invocationId: input.invocationId,
      workOrderId: workOrder.workOrderId,
      workOrderSha256: workOrder.canonicalSha256,
      skillId: workOrder.skillId,
      actorId: workOrder.actorId,
      status,
      outputs,
      evidence,
      publicSummary,
      metrics,
      startedAt: input.startedAt,
      completedAt: input.completedAt,
    };
    return SkillInvocationReceiptV1Schema.parse({
      ...draft,
      canonicalSha256: hashExperienceValue(draft),
    });
  }
}
