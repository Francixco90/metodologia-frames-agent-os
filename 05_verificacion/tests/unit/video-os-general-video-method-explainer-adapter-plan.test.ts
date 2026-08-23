import {describe, expect, it} from 'vitest';

import {planOrVerifyGeneralVideoMethodExplainer} from 'workflows/video-os/index.ts';

import {assertCeiling} from './video-os-general-video-method-explainer-adapter.helpers.ts';

describe('General Video method-explainer PLAN adapter', () => {
  const planRequest = {
    schema_version: 'general-video-method-explainer-adapter-request-v1',
    archetype: 'method-explainer',
    mode: 'PLAN_VERIFY_ONLY',
    operation: 'PLAN',
    video_os_request: {
      request: 'Explica PASA',
      sourceRefs: ['sources/pasa.md'],
      sourceAuthority: 'verified',
      rights: 'cleared',
      archetype: 'method-explainer',
      secondaryExports: [],
      constraints: [],
    },
  } as const;

  it('projects a routed plan but preserves the absolute BLOCKED ceiling', async () => {
    const result = await planOrVerifyGeneralVideoMethodExplainer(planRequest);
    expect(result).toMatchObject({
      operation: 'PLAN',
      verdict: 'VALIDATED_CANDIDATE',
      next_gate: 'VO_DIRECTION_APPROVED',
      reason_code: null,
      evidence: {kind: 'PLAN', decision: 'ROUTED', primary_format: '9:16'},
    });
    expect(result.evidence?.kind === 'PLAN' && result.evidence.standard_artifacts).toHaveLength(23);
    assertCeiling(result);
  });

  it('is deterministic and does not mutate its request', async () => {
    const candidate = structuredClone(planRequest);
    const before = structuredClone(candidate);
    const first = await planOrVerifyGeneralVideoMethodExplainer(candidate);
    const second = await planOrVerifyGeneralVideoMethodExplainer(candidate);
    expect(first).toEqual(second);
    expect(candidate).toEqual(before);
  });

  it.each([
    ['missing sources', {sourceRefs: []}, 'ADAPTER-PLAN-NEEDS-INPUT'],
    ['unknown authority', {sourceAuthority: 'unknown'}, 'ADAPTER-PLAN-NEEDS-INPUT'],
    ['unknown rights', {rights: 'unknown'}, 'ADAPTER-PLAN-NEEDS-INPUT'],
    ['private source', {sourceRefs: ['private/pasa.md']}, 'ADAPTER-PLAN-BLOCKED'],
    ['wrong primary format', {primaryFormat: '16:9'}, 'ADAPTER-PLAN-BLOCKED'],
  ] as const)('blocks %s without effects', async (_, mutation, reason) => {
    const candidate = structuredClone(planRequest) as Record<string, unknown>;
    Object.assign(candidate.video_os_request as object, mutation);
    const result = await planOrVerifyGeneralVideoMethodExplainer(candidate);
    expect(result).toMatchObject({operation: 'PLAN', verdict: 'BLOCKED', reason_code: reason});
    assertCeiling(result);
  });

  it.each([
    ['unexpected request field', {...planRequest, unexpected: true}],
    ['wrong mode', {...planRequest, mode: 'EXECUTE'}],
    ['wrong archetype', {...planRequest, archetype: 'case-longform'}],
    [
      'unexpected nested field',
      {...planRequest, video_os_request: {...planRequest.video_os_request, x: 1}},
    ],
    [
      'missing operation',
      Object.fromEntries(Object.entries(planRequest).filter(([key]) => key !== 'operation')),
    ],
  ])('fails closed for %s', async (_, candidate) => {
    const result = await planOrVerifyGeneralVideoMethodExplainer(candidate);
    expect(result).toMatchObject({verdict: 'BLOCKED', reason_code: 'ADAPTER-REQUEST-INVALID'});
    assertCeiling(result);
  });
});
