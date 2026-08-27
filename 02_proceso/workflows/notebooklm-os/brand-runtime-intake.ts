import {
  BrandEvidenceSetV1Schema,
  BrandIntakePacketV1Schema,
  hashExperienceValue,
  type BrandEvidenceSetV1,
  type BrandIntakePacketV1,
  type BrandRuleV1,
} from '../../core/contracts/index.ts';
import {byPortableId, selectStatus, uniqueSorted} from './brand-runtime-common.ts';

/** Normalize order and collapse repeated content identities without retaining locators. */
export const normalizeBrandInputs = (raw: BrandIntakePacketV1): BrandIntakePacketV1 => {
  const packet = BrandIntakePacketV1Schema.parse(raw);
  const identityGroups = new Map<string, typeof packet.inputRefs>();
  for (const inputRef of packet.inputRefs) {
    const versionIdentity = `${inputRef.portableIdentityDigest}:${inputRef.contentSha256}`;
    const group = identityGroups.get(versionIdentity) ?? [];
    group.push(inputRef);
    identityGroups.set(versionIdentity, group);
  }
  const inputAlias = new Map<string, string>();
  const inputRefs = [...identityGroups.values()]
    .map((group) => {
      const canonical = [...group].sort(byPortableId('inputId'))[0];
      if (canonical === undefined) throw new Error('Brand input identity group cannot be empty.');
      for (const member of group) inputAlias.set(member.inputId, canonical.inputId);
      const selectWorst = <T extends string>(values: readonly T[], precedence: readonly T[]): T =>
        [...values].sort(
          (left, right) => precedence.indexOf(right) - precedence.indexOf(left),
        )[0] ??
        values[0] ??
        precedence[0]!;
      return {
        ...canonical,
        sensitivity: selectWorst(
          group.map(({sensitivity}) => sensitivity),
          ['PUBLIC', 'INTERNAL', 'PRIVATE', 'RESTRICTED'] as const,
        ),
        rights: selectWorst(
          group.map(({rights}) => rights),
          ['APPROVED', 'REVIEW', 'BLOCKED'] as const,
        ),
        safety: selectWorst(
          group.map(({safety}) => safety),
          ['CLEAN', 'REVIEW', 'BLOCKED'] as const,
        ),
        extraction: selectWorst(
          group.map(({extraction}) => extraction),
          ['AVAILABLE', 'PARTIAL', 'UNAVAILABLE'] as const,
        ),
      };
    })
    .sort(byPortableId('inputId'));
  const observations = packet.observations
    .map((observation) => ({
      ...observation,
      inputIds: uniqueSorted(observation.inputIds.map((id) => inputAlias.get(id) ?? id)),
      sourceRefs: uniqueSorted(observation.sourceRefs),
    }))
    .sort(byPortableId('observationId'));
  return BrandIntakePacketV1Schema.parse({
    ...packet,
    audiences: uniqueSorted(packet.audiences),
    channels: uniqueSorted(packet.channels),
    responseLocales: uniqueSorted(packet.responseLocales),
    requestedOutputs: uniqueSorted(packet.requestedOutputs),
    inputRefs,
    observations,
    conflicts: [...packet.conflicts].sort(byPortableId('conflictId')),
    blockingQuestions: uniqueSorted(packet.blockingQuestions),
    coverageGaps: [...packet.coverageGaps].sort(byPortableId('gapId')),
  });
};

/** Compile structured observations into evidence-bound rules; it does no semantic guessing. */
export const compileBrandEvidence = (raw: BrandIntakePacketV1): BrandEvidenceSetV1 => {
  const packet = normalizeBrandInputs(raw);
  const intakeSha256 = hashExperienceValue(packet);
  const inputById = new Map(packet.inputRefs.map((inputRef) => [inputRef.inputId, inputRef]));
  const evidence = packet.observations.map((observation) => {
    const sources = observation.inputIds.flatMap((id) => {
      const source = inputById.get(id);
      return source === undefined ? [] : [source];
    });
    const rightsSensitive = ['asset', 'visual', 'golden-reference', 'template'].includes(
      observation.category,
    );
    const blocked =
      sources.some(({safety}) => safety === 'BLOCKED') ||
      (rightsSensitive && sources.some(({rights}) => rights !== 'APPROVED'));
    return {
      evidenceId: `evidence-${hashExperienceValue(observation).slice(0, 20)}`,
      observationId: observation.observationId,
      category: observation.category,
      statement: observation.statement,
      status: blocked ? ('BLOCKED' as const) : observation.status,
      confidence: observation.confidence,
      inputIds: observation.inputIds,
      sourceRefs: observation.sourceRefs,
    };
  });
  const ruleGroups = new Map<string, typeof evidence>();
  for (const item of evidence) {
    const identity = hashExperienceValue({category: item.category, statement: item.statement});
    const group = ruleGroups.get(identity) ?? [];
    group.push(item);
    ruleGroups.set(identity, group);
  }
  const rules: BrandRuleV1[] = [...ruleGroups.entries()]
    .map(([identity, items]) => ({
      ruleId: `rule-${identity.slice(0, 20)}`,
      category: items[0]?.category ?? 'identity',
      statement: items[0]?.statement ?? 'Missing statement',
      status: selectStatus(items.map(({status}) => status)),
      confidence: Math.max(...items.map(({confidence}) => confidence)),
      evidenceIds: uniqueSorted(items.map(({evidenceId}) => evidenceId)),
      supersedesRuleId: null,
    }))
    .sort(byPortableId('ruleId'));
  const payload = {
    schemaVersion: 'brand-evidence-set-v1' as const,
    evidenceSetId: `brand-evidence-${intakeSha256.slice(0, 20)}`,
    brandId: packet.brandId,
    intakeSha256,
    evidence: [...evidence].sort(byPortableId('evidenceId')),
    rules,
    conflicts: packet.conflicts,
    blockingQuestions: packet.blockingQuestions,
    coverageGaps: packet.coverageGaps,
  };
  return BrandEvidenceSetV1Schema.parse({
    ...payload,
    canonicalSha256: hashExperienceValue(payload),
  });
};
