// check-brand/channel-validators.ts — channel profile validation + freshness.
// [CÓDIGO]
import {channelProfileSchema} from './schemas-channels-fonts.ts';
import {expectedChannelSources} from './expected-sources.ts';

export const validateChannelProfileObject = (input: unknown): string[] => {
  const parsed = channelProfileSchema.safeParse(input);
  if (!parsed.success) return [`CHANNEL001 invalid channel profile: ${parsed.error.message}`];
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const source of parsed.data.source_bindings) {
    if (seen.has(source.source_id)) {
      errors.push(`CHANNEL002 duplicate official source ${source.source_id}`);
    }
    seen.add(source.source_id);
    const expectedUri = expectedChannelSources.get(source.source_id);
    if (expectedUri === undefined || source.canonical_uri !== expectedUri) {
      errors.push(`CHANNEL002 official source binding drift ${source.source_id}`);
    }
    if (source.observed_at !== parsed.data.freshness_policy.observed_at) {
      errors.push(`CHANNEL003 source observation timestamp drift ${source.source_id}`);
    }
  }
  for (const sourceId of expectedChannelSources.keys()) {
    if (!seen.has(sourceId)) errors.push(`CHANNEL002 official source missing ${sourceId}`);
  }
  return errors;
};

export const evaluateChannelFreshness = (
  input: unknown,
  referenceTime = new Date(),
): {
  state: 'fresh' | 'stale';
  local_tests: 'allowed';
  ready: 'defer_to_remaining_gates' | 'blocked';
} => {
  const profile = channelProfileSchema.parse(input);
  const observedAt = new Date(profile.freshness_policy.observed_at).getTime();
  const expiresAt = observedAt + profile.freshness_policy.stale_after_days * 24 * 60 * 60 * 1000;
  if (referenceTime.getTime() > expiresAt) {
    return {
      state: 'stale',
      local_tests: profile.freshness_policy.when_stale.local_tests,
      ready: profile.freshness_policy.when_stale.ready,
    };
  }
  return {
    state: 'fresh',
    local_tests: profile.freshness_policy.when_fresh.local_tests,
    ready: profile.freshness_policy.when_fresh.ready,
  };
};