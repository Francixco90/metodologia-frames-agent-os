import {readFileSync} from 'node:fs';

import {z} from 'zod';

import {
  DocumentationClosureReceiptV1Schema,
  DocumentationImpactPlanV1Schema,
  FramesWorkOrderV1Schema,
  type MutationProfileV1,
  Sha256Schema,
} from '../../02_proceso/core/contracts/index.ts';
import {
  verifyDocumentationClosureV1,
  verifyWorkOrderMutationProfileV1,
} from '../../02_proceso/workflows/maintenance/index.ts';
import {buildMutationProfilesV1} from './lib/mutation-profile-registry.ts';

const GateInputSchema = z.strictObject({
  workOrder: FramesWorkOrderV1Schema,
  candidateSha256: Sha256Schema,
  impactPlan: DocumentationImpactPlanV1Schema,
  closureReceipt: DocumentationClosureReceiptV1Schema,
});

export const verifyDocumentationGateInputV1 = (
  value: unknown,
  root = process.cwd(),
  profiles: readonly MutationProfileV1[] = buildMutationProfilesV1(root),
) => {
  const input = GateInputSchema.parse(value);
  const mutation = verifyWorkOrderMutationProfileV1(input.workOrder, profiles);
  const closure = verifyDocumentationClosureV1({...input, root});
  const reasonCodes = [...mutation.reasonCodes, ...closure.reasonCodes].sort();
  return {
    schema_version: 'documentation-transversal-gate-v1',
    gate: 'DOCS_TRANSVERSAL_COMPLETE' as const,
    status: reasonCodes.length === 0 ? ('PASS' as const) : ('BLOCKED' as const),
    reason_codes: reasonCodes,
  };
};

if (process.argv[1]?.endsWith('check-documentation-closure.ts')) {
  try {
    const raw = readFileSync(0, 'utf8');
    if (!raw.trim()) throw new Error('DOCS-GATE-INPUT001');
    const result = verifyDocumentationGateInputV1(JSON.parse(raw));
    process.stdout.write(`${JSON.stringify(result)}\n`);
    if (result.status !== 'PASS') process.exitCode = 1;
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : 'DOCS-GATE-INPUT000'}\n`);
    process.exitCode = 1;
  }
}
