import {validateSourceDeduplication} from './deduplication.ts';
import {validateGenericReceiptChains} from './generic-receipts.ts';
import {validateHistoricalSourceInvariants} from './historical-sources.ts';
import {validateSourceLifecycleView} from './lifecycle.ts';
import {loadSourceGovernance} from './parser.ts';
import {validatePinnedRepositories} from './pinned-repositories.ts';

export type SourceGovernanceCheckResult = Readonly<{
  ok: boolean;
  errors: readonly string[];
  sourceCount: number;
}>;

export const runSourceGovernanceCheck = (root: string): SourceGovernanceCheckResult => {
  const errors: string[] = [];
  const governance = loadSourceGovernance(root, errors);
  if (governance === undefined) {
    return {ok: false, errors, sourceCount: 0};
  }
  try {
    errors.push(...validateSourceLifecycleView(root, governance.registry));
    errors.push(...validateSourceDeduplication(governance.registry));
    errors.push(...validateGenericReceiptChains(root, governance.registry));
    errors.push(...validatePinnedRepositories(root, governance));
    errors.push(...validateHistoricalSourceInvariants(root, governance.registry));
  } catch (error) {
    errors.push(`source governance audit failure: ${String(error)}`);
  }
  return {ok: errors.length === 0, errors, sourceCount: governance.registry.entries.length};
};
