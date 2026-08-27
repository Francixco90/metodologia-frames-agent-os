import {
  type BrandEvidenceStatus,
  type BrandRuleCategory,
  type BrandRuleV1,
} from '../../core/contracts/index.ts';

export const uniqueSorted = (values: readonly string[]): string[] => [...new Set(values)].sort();

export const byPortableId =
  <T extends Record<K, string>, K extends keyof T>(key: K) =>
  (left: T, right: T): number =>
    left[key].localeCompare(right[key]);

const EVIDENCE_PRECEDENCE: Record<BrandEvidenceStatus, number> = {
  INFERRED: 0,
  OBSERVED: 1,
  USER_CONFIRMED: 2,
  SOURCE_VERIFIED: 3,
  BLOCKED: 4,
};

export const selectStatus = (statuses: readonly BrandEvidenceStatus[]): BrandEvidenceStatus =>
  [...statuses].sort((left, right) => EVIDENCE_PRECEDENCE[right] - EVIDENCE_PRECEDENCE[left])[0] ??
  'INFERRED';

export const SECTION_FOR_CATEGORY = {
  identity: 'identity',
  positioning: 'positioning',
  audience: 'audiences',
  voice: 'voice',
  rhetoric: 'rhetoric',
  vocabulary: 'vocabulary',
  claim: 'claims',
  visual: 'visualSystem',
  asset: 'assets',
  channel: 'channels',
  'golden-reference': 'goldenReferences',
  template: 'templates',
  exclusion: 'exclusions',
  approval: 'approvals',
} as const satisfies Record<BrandRuleCategory, string>;

export type BrandSectionName = (typeof SECTION_FOR_CATEGORY)[BrandRuleCategory];

export const emptySections = (): Record<BrandSectionName, BrandRuleV1[]> => ({
  identity: [],
  positioning: [],
  audiences: [],
  voice: [],
  rhetoric: [],
  vocabulary: [],
  claims: [],
  visualSystem: [],
  assets: [],
  channels: [],
  goldenReferences: [],
  templates: [],
  exclusions: [],
  approvals: [],
});
