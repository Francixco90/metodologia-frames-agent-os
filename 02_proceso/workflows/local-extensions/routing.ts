import type {LocalExtensionDiscovery, LocalExtensionRecord} from './contracts.ts';

export interface CanonicalCandidate {
  route_id: string;
  triggers: readonly string[];
  capabilities: readonly string[];
}

export interface LocalRouteResolution {
  canonical: CanonicalCandidate[];
  local: Array<{record: LocalExtensionRecord; role: 'PRIMARY_LOCAL' | 'SUPPLEMENT'}>;
  decision: 'CANONICAL_FIRST' | 'LOCAL_UNIQUE' | 'AMBIGUOUS' | 'NO_MATCH';
  selected_local?: string;
}

const matches = (needles: readonly string[], values: readonly string[]): boolean =>
  needles.some((needle) => values.includes(needle));

export const resolveLocalExtensionCandidates = (input: {
  discovery: LocalExtensionDiscovery;
  canonical: readonly CanonicalCandidate[];
  signals: readonly string[];
  required_capabilities?: readonly string[];
}): LocalRouteResolution => {
  const signals = [
    ...new Set(input.signals.map((value) => value.trim().toLowerCase()).filter(Boolean)),
  ].sort();
  const capabilities = [...new Set(input.required_capabilities ?? [])].sort();
  const canonical = input.canonical
    .filter((item) => matches(signals, item.triggers) || matches(capabilities, item.capabilities))
    .sort((left, right) =>
      left.route_id < right.route_id ? -1 : left.route_id > right.route_id ? 1 : 0,
    );
  const local = input.discovery.records
    .filter((record) => record.state === 'ACTIVE_LOCAL' && record.manifest)
    .filter((record) => {
      const manifest = record.manifest;
      return Boolean(
        manifest &&
        (matches(signals, manifest.triggers) || matches(capabilities, manifest.capabilities)),
      );
    })
    .map((record) => ({
      record,
      role: canonical.length > 0 ? ('SUPPLEMENT' as const) : ('PRIMARY_LOCAL' as const),
    }))
    .sort((left, right) =>
      left.record.extension_id < right.record.extension_id
        ? -1
        : left.record.extension_id > right.record.extension_id
          ? 1
          : 0,
    );
  if (canonical.length > 0) return {canonical, local, decision: 'CANONICAL_FIRST'};
  if (local.length === 1) {
    const selected = local[0];
    if (!selected) throw new Error('LOCAL_EXTENSION_SELECTION_INVARIANT');
    return {
      canonical,
      local,
      decision: 'LOCAL_UNIQUE',
      selected_local: selected.record.extension_id,
    };
  }
  return {canonical, local, decision: local.length > 1 ? 'AMBIGUOUS' : 'NO_MATCH'};
};
