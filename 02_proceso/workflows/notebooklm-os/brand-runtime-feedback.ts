import {
  BrandFeedbackEventV1Schema,
  BrandKnowledgePackV1Schema,
  hashExperienceValue,
  type BrandFeedbackEventV1,
  type BrandKnowledgePackV1,
  type BrandRuleV1,
} from '../../core/contracts/index.ts';
import {
  byPortableId,
  emptySections,
  SECTION_FOR_CATEGORY,
  uniqueSorted,
  type BrandSectionName,
} from './brand-runtime-common.ts';

const parseVersion = (version: string): [number, number] => {
  const match = /^v(\d+)\.(\d+)$/u.exec(version);
  if (match === null) throw new Error(`Invalid version: ${version}`);
  return [Number(match[1]), Number(match[2])];
};

const isSuccessorVersion = (candidate: string, current: string): boolean => {
  const [candidateMajor, candidateMinor] = parseVersion(candidate);
  const [currentMajor, currentMinor] = parseVersion(current);
  return (
    candidateMajor > currentMajor ||
    (candidateMajor === currentMajor && candidateMinor > currentMinor)
  );
};

/** Apply explicit user feedback as a review successor; it never preserves ACTIVE implicitly. */
export const applyBrandFeedback = (
  rawPack: BrandKnowledgePackV1,
  rawEvent: BrandFeedbackEventV1,
): BrandKnowledgePackV1 => {
  const pack = BrandKnowledgePackV1Schema.parse(rawPack);
  const event = BrandFeedbackEventV1Schema.parse(rawEvent);
  if (event.brandId !== pack.brandId) throw new Error('Feedback targets a different brand.');
  if (!isSuccessorVersion(event.successorVersion, pack.version))
    throw new Error('Feedback must create a higher successor version.');
  if (event.action === 'REPLACE' && event.replacementStatement === null)
    throw new Error('REPLACE requires replacementStatement.');
  if (event.action !== 'REPLACE' && event.replacementStatement !== null)
    throw new Error('replacementStatement is only valid for REPLACE.');
  const sections = emptySections();
  let matchedRule: BrandRuleV1 | undefined;
  for (const [sectionName, rules] of Object.entries(pack.sections) as Array<
    [BrandSectionName, BrandRuleV1[]]
  >) {
    for (const rule of rules) {
      if (rule.ruleId === event.targetRuleId) matchedRule = rule;
      sections[sectionName].push(rule);
    }
  }
  if (matchedRule === undefined) throw new Error('Feedback target rule was not found.');
  const availableEvidence = new Set(
    Object.values(pack.sections).flatMap((rules) => rules.flatMap(({evidenceIds}) => evidenceIds)),
  );
  if (event.evidenceIds.some((evidenceId) => !availableEvidence.has(evidenceId)))
    throw new Error('Feedback references evidence outside the knowledge pack.');
  const sectionName = SECTION_FOR_CATEGORY[matchedRule.category];
  sections[sectionName] = sections[sectionName].map((rule) => {
    if (rule.ruleId !== matchedRule?.ruleId) return rule;
    if (event.action === 'CONFIRM') {
      return {
        ...rule,
        status: 'USER_CONFIRMED' as const,
        confidence: 1,
        evidenceIds: uniqueSorted([...rule.evidenceIds, ...event.evidenceIds]),
      };
    }
    return {...rule, status: 'BLOCKED' as const};
  });
  if (event.action === 'REPLACE') {
    const replacementStatement = event.replacementStatement ?? '';
    sections[sectionName].push({
      ruleId: `rule-${hashExperienceValue({
        category: matchedRule.category,
        statement: replacementStatement,
        supersedes: matchedRule.ruleId,
      }).slice(0, 20)}`,
      category: matchedRule.category,
      statement: replacementStatement,
      status: 'USER_CONFIRMED',
      confidence: 1,
      evidenceIds: uniqueSorted(event.evidenceIds),
      supersedesRuleId: matchedRule.ruleId,
    });
  }
  for (const rules of Object.values(sections)) rules.sort(byPortableId('ruleId'));
  const identity = {
    brandId: pack.brandId,
    version: event.successorVersion,
    predecessor: pack.canonicalSha256,
    feedbackId: event.feedbackId,
  };
  const payload = {
    ...pack,
    packId: `brand-pack-${hashExperienceValue(identity).slice(0, 20)}`,
    version: event.successorVersion,
    status: event.action === 'BLOCK' ? ('BLOCKED' as const) : ('REVIEW' as const),
    approvalGate: null,
    approvalReceiptSha256: null,
    reviewedPredecessorSha256: null,
    sections,
  };
  return BrandKnowledgePackV1Schema.parse({
    ...payload,
    canonicalSha256: hashExperienceValue(payload),
  });
};
