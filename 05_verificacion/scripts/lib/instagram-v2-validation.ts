import {parse} from 'yaml';

import {
  PACKAGE_MANIFEST_ALGORITHM,
  expectedVersion,
  type LicenseEvidence,
  type Registry,
  type SharedLicenseReceipt,
  type SkillContract,
} from './instagram-v2-contract.ts';
import type {InstagramV2FileAccess} from './instagram-v2-files.ts';

const LOCATOR = /\/Users\/|\/home\/|[A-Za-z]:\\Users\\/u;
const TRANSITIONS: ReadonlyArray<readonly [string | null, string]> = [
  [null, 'candidate'],
  ['candidate', 'quarantined'],
  ['quarantined', 'evaluated'],
  ['evaluated', 'active'],
];

export const validateRegistryPolicy = (registry: Registry): string[] =>
  registry.mutation_policy?.includes('append-only')
    ? []
    : ['SKL-V2-001 registry must remain append-only'];

export const validateSkill = (
  skill: SkillContract,
  registry: Registry,
  license: LicenseEvidence,
  files: InstagramV2FileAccess,
): string[] => {
  const errors: string[] = [];
  const skillRoot = `skills/${skill.id}`;
  const skillPath = `${skillRoot}/SKILL.md`;
  const lineagePath = `${skillRoot}/LINEAGE.yml`;
  for (const path of [
    skillPath,
    lineagePath,
    `${skillRoot}/${skill.positive}`,
    `${skillRoot}/${skill.negative}`,
  ]) {
    if (!files.exists(path)) errors.push(`SKL-V2-002 missing ${path}`);
  }
  if (!files.exists(skillPath) || !files.exists(lineagePath)) return errors;

  const text = files.read(skillPath);
  const frontmatterMatch = text.match(/^---\n([\s\S]*?)\n---\n/u);
  if (frontmatterMatch === null) {
    errors.push(`SKL-V2-003 ${skill.id}: frontmatter missing`);
    return errors;
  }
  const frontmatter = parse(frontmatterMatch[1] ?? '') as {
    name?: string;
    description?: string;
    license?: string;
    metadata?: {lifecycle_state?: string; execution_scope?: string};
  };
  if (
    frontmatter.name !== skill.id ||
    frontmatter.license !== 'LicenseRef-MetodologIA-Internal' ||
    !frontmatter.description?.startsWith('This skill should be used when') ||
    frontmatter.metadata?.lifecycle_state !== 'active' ||
    frontmatter.metadata.execution_scope !== skill.scope
  ) {
    errors.push(`SKL-V2-003 ${skill.id}: frontmatter contract mismatch`);
  }
  if (text.split(/\s+/u).length > 1_200) {
    errors.push(`SKL-V2-004 ${skill.id}: progressive-disclosure budget exceeded`);
  }
  for (const term of skill.requiredTerms) {
    if (!text.includes(term)) errors.push(`SKL-V2-005 ${skill.id}: missing ${term}`);
  }
  if (LOCATOR.test(text)) errors.push(`SKL-V2-006 ${skill.id}: absolute locator forbidden`);

  const lineage = files.readYaml<{
    skill_id?: string;
    version?: string;
    content_origin?: string;
    lifecycle_state?: string;
    execution_scope?: string;
    authority_refs?: string[];
    external_fragments_reused?: boolean;
    publication_authority?: boolean;
  }>(lineagePath);
  if (
    lineage.skill_id !== skill.id ||
    lineage.version !== expectedVersion(skill) ||
    !lineage.content_origin?.startsWith('locally_authored') ||
    lineage.lifecycle_state !== 'active' ||
    lineage.execution_scope !== skill.scope ||
    lineage.external_fragments_reused !== (skill.id === 'metodologia-certificate-builder') ||
    lineage.publication_authority !== false
  ) {
    errors.push(`SKL-V2-007 ${skill.id}: lineage contract mismatch`);
  }
  for (const reference of lineage.authority_refs ?? []) {
    if (reference.startsWith('/') || reference.includes('..') || !files.exists(reference)) {
      errors.push(`SKL-V2-008 ${skill.id}: unresolved authority ref ${reference}`);
    }
  }

  const entry = registry.entries?.find(({skill_id}) => skill_id === skill.id);
  const contentHash = files.sha256(text);
  if (
    entry?.version !== expectedVersion(skill) ||
    entry.current_state !== 'active' ||
    entry.content_sha256 !== contentHash ||
    entry.package_manifest_sha256 !== files.packageDigest(skillRoot) ||
    entry.package_manifest_algorithm !== PACKAGE_MANIFEST_ALGORITHM ||
    entry.lineage !== lineagePath ||
    entry.content_license !== 'LicenseRef-MetodologIA-Internal' ||
    entry.content_license_evidence?.text_ref !== license.textRef ||
    entry.content_license_evidence.text_sha256 !== license.textHash ||
    entry.content_license_evidence.receipt_ref !== license.receiptRef ||
    entry.content_license_evidence.receipt_sha256 !== license.receiptHash ||
    entry.execution_scope !== skill.scope ||
    entry.production_runtime_status !== skill.productionStatus ||
    !entry.tests?.includes('pnpm verify:skills')
  ) {
    errors.push(`SKL-V2-009 ${skill.id}: active registry binding mismatch`);
  }

  const events = (registry.events ?? [])
    .filter(({skill_id}) => skill_id === skill.id)
    .sort((left, right) => (left.event_order ?? 0) - (right.event_order ?? 0));
  const latestEvent = events.at(-1);
  if (
    events.length < 4 ||
    events.some((event, index) => event.event_order !== index + 1) ||
    events
      .slice(0, 4)
      .some(
        (event, index) =>
          event.transition?.from !== TRANSITIONS[index]?.[0] ||
          event.transition?.to !== TRANSITIONS[index]?.[1] ||
          !entry?.event_ids?.includes(event.event_id ?? ''),
      ) ||
    events.some((event) => !entry?.event_ids?.includes(event.event_id ?? '')) ||
    latestEvent?.content_sha256 !== contentHash ||
    latestEvent.transition?.to !== 'active'
  ) {
    errors.push(`SKL-V2-010 ${skill.id}: lifecycle chain mismatch`);
  }
  return errors;
};

export const validateLicenseReceipt = (
  receipt: SharedLicenseReceipt,
  skills: readonly SkillContract[],
): string[] =>
  receipt.append_only === true &&
  receipt.permissions?.publication === 'forbidden_without_explicit_gate' &&
  JSON.stringify(receipt.applies_to?.package_refs) ===
    JSON.stringify(skills.map(({id}) => `skills/${id}`))
    ? []
    : ['SKL-V2-011 shared content-license receipt mismatch'];
