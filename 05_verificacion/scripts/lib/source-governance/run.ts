import {validateSourceDeduplication} from './deduplication.ts';
import {validateGenericReceiptChains} from './generic-receipts.ts';
import {validateHistoricalSourceInvariants} from './historical-sources.ts';
import {validateSourceLifecycleView} from './lifecycle.ts';
import {loadGlobalSourceGovernance, loadProjectLocalSourceGovernance} from './parser.ts';
import {validatePinnedRepositories} from './pinned-repositories.ts';

export type SourceGovernanceCheckResult = Readonly<{
  ok: boolean;
  errors: readonly string[];
  sourceCount: number;
}>;

export const runSourceGovernanceCheck = (root: string): SourceGovernanceCheckResult => {
  const errors: string[] = [];
  const governance = loadGlobalSourceGovernance(root, errors);
  if (governance === undefined) {
    return {ok: false, errors, sourceCount: 0};
  }
  try {
    errors.push(...validateSourceLifecycleView(root, governance.registry));
    errors.push(...validateSourceDeduplication(governance.registry));
    errors.push(...validateGenericReceiptChains(root, governance.registry));
    errors.push(...validateHistoricalSourceInvariants(root, governance.registry));
    if (
      governance.registry.entries.some(
        ({source_kind: sourceKind}) => sourceKind === 'pinned_repository_implementation_source',
      )
    ) {
      errors.push('source-registry.yml global contiene una fuente reservada para PROJECT_LOCAL');
    }
  } catch (error) {
    errors.push(`source governance audit failure: ${String(error)}`);
  }
  return {ok: errors.length === 0, errors, sourceCount: governance.registry.entries.length};
};

export const runProjectLocalSourceGovernanceCheck = (root: string): SourceGovernanceCheckResult => {
  const errors: string[] = [];
  const governance = loadProjectLocalSourceGovernance(root, errors);
  if (governance === undefined) return {ok: false, errors, sourceCount: 0};
  try {
    errors.push(...validatePinnedRepositories(root, governance));
  } catch (error) {
    errors.push(`PROJECT_LOCAL source governance audit failure: ${String(error)}`);
  }
  return {ok: errors.length === 0, errors, sourceCount: governance.projectLocal.entries.length};
};
