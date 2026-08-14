import {
  ACTIVE_CAREER_CONTRACTS,
  CANONICAL_CAREER_MIGRATIONS,
  CANONICAL_CAREER_TEMPLATE_REFS,
  COMPATIBILITY_CAREER_CONTRACTS,
  LEGACY_CAREER_DISPLAY_ALIASES,
} from './registry-authority-v1.js';

type Definition = {
  deliverable_id: string;
  display_name: string;
  artifact_kind: string;
  projections: readonly string[];
  template_ref: string;
};
type Lifecycle = {
  deliverable_id: string;
  state: 'active' | 'compatibility-only';
  successor_id: string | null;
  migration: {mode: string; ref?: string | undefined};
};
type Authority = {template_ref: string};
type MigrationAuthority = {deliverable_id: string; mode: string; ref: string};
type RegistryPolicyInput = {
  definitions: readonly Definition[];
  versioned_contract_lifecycle: readonly Lifecycle[];
  template_authorities: readonly Authority[];
  migration_authorities: readonly MigrationAuthority[];
};
type PolicyIssue = {path: Array<string | number>; message: string};

export const careerRegistryPolicyIssues = ({
  definitions,
  versioned_contract_lifecycle: lifecycle,
  template_authorities: authorities,
  migration_authorities: migrationAuthorities,
}: RegistryPolicyInput): PolicyIssue[] => {
  const issues: PolicyIssue[] = [];
  const add = (path: Array<string | number>, message: string): void => {
    issues.push({path, message});
  };
  const ids = new Set<string>();
  definitions.forEach((definition, index) => {
    if (ids.has(definition.deliverable_id)) add(['definitions', index], 'Duplicate id');
    ids.add(definition.deliverable_id);
    if (definition.artifact_kind === 'human_document' && !definition.projections.includes('html')) {
      add(['definitions', index, 'projections'], 'Human documents require an HTML projection');
    }
  });

  const lifecycleById = new Map<string, Lifecycle>();
  lifecycle.forEach((entry, index) => {
    if (lifecycleById.has(entry.deliverable_id)) {
      add(['versioned_contract_lifecycle', index], 'Duplicate lifecycle id');
    }
    lifecycleById.set(entry.deliverable_id, entry);
    if (!ids.has(entry.deliverable_id)) {
      add(['versioned_contract_lifecycle', index, 'deliverable_id'], 'Lifecycle id is not defined');
    }
    if (entry.state === 'compatibility-only') {
      if (!entry.successor_id || !ids.has(entry.successor_id)) {
        add(['versioned_contract_lifecycle', index, 'successor_id'], 'Successor is not defined');
      } else if (entry.successor_id === entry.deliverable_id) {
        add(['versioned_contract_lifecycle', index, 'successor_id'], 'Successor cannot be self');
      }
    }
  });
  for (const id of ACTIVE_CAREER_CONTRACTS) {
    if (lifecycleById.get(id)?.state !== 'active') {
      add(['versioned_contract_lifecycle'], `${id} must be active`);
    }
  }
  for (const id of COMPATIBILITY_CAREER_CONTRACTS) {
    if (lifecycleById.get(id)?.state !== 'compatibility-only') {
      add(['versioned_contract_lifecycle'], `${id} must be compatibility-only`);
    }
  }

  lifecycle.forEach((entry, index) => {
    if (
      entry.state === 'compatibility-only' &&
      entry.successor_id &&
      lifecycleById.get(entry.successor_id)?.state !== 'active'
    ) {
      add(['versioned_contract_lifecycle', index, 'successor_id'], 'Successor must be active');
    }
  });
  const compatibilityIds = new Set(
    lifecycle
      .filter(({state}) => state === 'compatibility-only')
      .map(({deliverable_id}) => deliverable_id),
  );
  definitions.forEach((definition, index) => {
    const canonical = CANONICAL_CAREER_TEMPLATE_REFS[definition.deliverable_id];
    if (canonical && definition.template_ref !== canonical) {
      add(
        ['definitions', index, 'template_ref'],
        'Versioned contract requires its canonical template_ref',
      );
    }
    if (
      !compatibilityIds.has(definition.deliverable_id) &&
      LEGACY_CAREER_DISPLAY_ALIASES.has(definition.display_name)
    ) {
      add(['definitions', index, 'display_name'], 'Legacy display alias is compatibility-only');
    }
  });

  const authorityRefs = new Set<string>();
  authorities.forEach(({template_ref}, index) => {
    if (authorityRefs.has(template_ref))
      add(['template_authorities', index], 'Duplicate authority');
    authorityRefs.add(template_ref);
  });
  definitions.forEach(({template_ref}, index) => {
    if (!authorityRefs.has(template_ref)) {
      add(['definitions', index, 'template_ref'], 'Template ref lacks hash-bound authority');
    }
  });
  const definitionRefs = new Set(definitions.map(({template_ref}) => template_ref));
  authorities.forEach(({template_ref}, index) => {
    if (!definitionRefs.has(template_ref)) {
      add(['template_authorities', index, 'template_ref'], 'Unused template authority');
    }
  });

  const migrationById = new Map<string, MigrationAuthority>();
  migrationAuthorities.forEach((authority, index) => {
    if (migrationById.has(authority.deliverable_id)) {
      add(['migration_authorities', index], 'Duplicate migration authority');
    }
    migrationById.set(authority.deliverable_id, authority);
    const canonical = CANONICAL_CAREER_MIGRATIONS[authority.deliverable_id];
    if (!canonical || authority.mode !== canonical.mode || authority.ref !== canonical.ref) {
      add(
        ['migration_authorities', index],
        'Migration authority path or identity is not canonical',
      );
    }
  });
  lifecycle.forEach((entry, index) => {
    if (entry.state !== 'compatibility-only') return;
    const authority = migrationById.get(entry.deliverable_id);
    if (
      !authority ||
      entry.migration.mode !== authority.mode ||
      entry.migration.ref !== authority.ref
    ) {
      add(
        ['versioned_contract_lifecycle', index, 'migration'],
        'Compatibility migration lacks matching hash-bound authority',
      );
    }
  });
  return issues;
};
