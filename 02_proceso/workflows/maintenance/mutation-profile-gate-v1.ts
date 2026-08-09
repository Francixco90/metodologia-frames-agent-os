import type {FramesWorkOrderV1, MutationProfileV1} from '../../core/contracts/index.ts';

export type MutationProfileGateV1 = {
  status: 'PASS' | 'BLOCKED';
  reasonCodes: string[];
};

export const verifyWorkOrderMutationProfileV1 = (
  workOrder: FramesWorkOrderV1,
  profiles: readonly MutationProfileV1[],
): MutationProfileGateV1 => {
  const matches = profiles.filter((profile) => profile.skillId === workOrder.skillId);
  const reasons: string[] = [];
  if (matches.length !== 1)
    reasons.push(matches.length === 0 ? 'MUTATION-PROFILE001' : 'MUTATION-PROFILE002');
  const profile = matches[0];
  if (profile?.documentationImpactRequired) {
    if (!workOrder.changeClass || !workOrder.documentationImpact) reasons.push('MUTATION-DOCS001');
    else if (!profile.mutationClasses.includes(workOrder.changeClass))
      reasons.push('MUTATION-CLASS001');
  }
  return {
    status: reasons.length === 0 ? 'PASS' : 'BLOCKED',
    reasonCodes: reasons,
  };
};
