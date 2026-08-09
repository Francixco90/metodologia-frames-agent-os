import {createHash} from 'node:crypto';
import {lstatSync, readFileSync, realpathSync} from 'node:fs';
import path from 'node:path';

import {
  DocumentationClosureReceiptV1Schema,
  DocumentationImpactPlanV1Schema,
  type DocumentationClosureReceiptV1,
  type DocumentationImpactPlanV1,
  type FramesWorkOrderV1,
  hashExperienceValue,
} from '../../core/contracts/index.ts';

export type DocumentationGateResultV1 = {
  status: 'PASS' | 'BLOCKED';
  gate: 'DOCS_TRANSVERSAL_COMPLETE';
  reasonCodes: string[];
};

const fileSha256 = (ref: string, root: string): string => {
  const lexical = path.resolve(root, ref);
  const relative = path.relative(root, lexical);
  if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('DOCS-PATH001');
  let cursor = root;
  for (const segment of ref.split('/')) {
    cursor = path.join(cursor, segment);
    if (lstatSync(cursor).isSymbolicLink()) throw new Error('DOCS-PATH002');
  }
  if (!lstatSync(lexical).isFile()) throw new Error('DOCS-PATH003');
  const physical = realpathSync(lexical);
  const physicalRelative = path.relative(realpathSync(root), physical);
  if (physicalRelative.startsWith('..') || path.isAbsolute(physicalRelative))
    throw new Error('DOCS-PATH004');
  return createHash('sha256').update(readFileSync(physical)).digest('hex');
};

export const verifyDocumentationClosureV1 = ({
  root,
  workOrder,
  candidateSha256,
  impactPlan,
  closureReceipt,
}: {
  root: string;
  workOrder: FramesWorkOrderV1;
  candidateSha256: string;
  impactPlan: DocumentationImpactPlanV1;
  closureReceipt: DocumentationClosureReceiptV1;
}): DocumentationGateResultV1 => {
  const reasons: string[] = [];
  const plan = DocumentationImpactPlanV1Schema.parse(impactPlan);
  const receipt = DocumentationClosureReceiptV1Schema.parse(closureReceipt);
  if (workOrder.changeClass !== plan.changeClass) reasons.push('DOCS-CLASS001');
  if (workOrder.documentationImpact?.planId !== plan.planId) reasons.push('DOCS-PLAN001');
  if (receipt.impactPlanSha256 !== hashExperienceValue(plan)) reasons.push('DOCS-PLAN-HASH001');
  if (receipt.candidateSha256 !== candidateSha256) reasons.push('DOCS-CANDIDATE001');
  if (receipt.status !== 'PASS') reasons.push('DOCS-RECEIPT001');
  for (const item of [...receipt.sources, ...receipt.projections]) {
    try {
      if (fileSha256(item.ref, root) !== item.sha256) reasons.push(`DOCS-HASH001:${item.ref}`);
    } catch (error) {
      reasons.push(
        error instanceof Error ? `${error.message}:${item.ref}` : `DOCS-PATH000:${item.ref}`,
      );
    }
  }
  return {
    status: reasons.length === 0 ? 'PASS' : 'BLOCKED',
    gate: 'DOCS_TRANSVERSAL_COMPLETE',
    reasonCodes: reasons.sort(),
  };
};
