// creation-v3-types.ts — shared types for H-03 creation skill validation.
// Extracted so the checker module stays under the 100-line ceiling. [CÓDIGO]
export type Entry = {
  skill_id?: string;
  version?: string;
  current_state?: string;
  execution_scope?: string;
  content_sha256?: string;
  package_manifest_sha256?: string;
  lineage_ref?: string;
  publication_authority?: boolean;
};
export type Event = {
  event_order?: number;
  skill_id?: string;
  from?: string | null;
  to?: string;
  actor_id?: string;
};
export type Registry = {mutation_policy?: string; entries?: Entry[]; events?: Event[]};
export type SkillEntry = {
  id: string;
  scope: string;
  version?: string;
  registryState?: 'evaluated' | 'active';
  check: string[];
};
export type ValidationContext = {
  root: string;
  sha256: (value: Uint8Array | string) => string;
  packageDigest: (skillId: string) => string;
};
