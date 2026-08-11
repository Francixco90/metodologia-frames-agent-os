// creation-v3-checks.ts — per-skill validation logic for H-03 creation skills.
// Extracted from check-creation-v3-skills.ts (inline table → JSON data file).
// [CÓDIGO]
import {execFileSync} from 'node:child_process';
import {readFileSync, statSync} from 'node:fs';
import {resolve} from 'node:path';
import {parse} from 'yaml';

import type {Registry, SkillEntry, ValidationContext} from './creation-v3-types.ts';

export type {Registry, SkillEntry, ValidationContext} from './creation-v3-types.ts';

const LOCATOR = /\/Users\/|\/home\/|[A-Za-z]:\\Users\\/u;

/** Validate a single H-03 skill; returns error codes (empty = healthy). */
export const validateSkill = (
  skill: SkillEntry,
  registry: Registry,
  ctx: ValidationContext,
): string[] => {
  const {root, sha256, packageDigest} = ctx;
  const errors: string[] = [];
  const registryState = skill.registryState ?? 'active';
  const directory = resolve(root, 'skills', skill.id);
  const markdown = readFileSync(resolve(directory, 'SKILL.md'), 'utf8');
  const lineage = parse(readFileSync(resolve(directory, 'LINEAGE.yml'), 'utf8')) as {
    skill_id?: string;
    version?: string;
    lifecycle_state?: string;
    execution_scope?: string;
    authority_refs?: string[];
    external_fragments_reused?: boolean;
    publication_authority?: boolean;
  };
  const badMeta =
    !markdown.startsWith(`---\nname: ${skill.id}\n`) ||
    !markdown.includes('description: This skill should be used when') ||
    (registryState === 'active' && !markdown.includes(`version: ${skill.version ?? '0.1.0'}`)) ||
    (registryState === 'active' && !markdown.includes('lifecycle_state: active')) ||
    LOCATOR.test(markdown);
  if (badMeta) errors.push(`SKL-H03-002 invalid skill metadata ${skill.id}`);
  const badLineage =
    lineage.skill_id !== skill.id ||
    lineage.version !== (skill.version ?? '0.1.0') ||
    lineage.lifecycle_state !== registryState ||
    lineage.execution_scope !== skill.scope ||
    lineage.external_fragments_reused !== false ||
    lineage.publication_authority !== false;
  if (badLineage) errors.push(`SKL-H03-003 invalid lineage ${skill.id}`);
  for (const ref of lineage.authority_refs ?? []) {
    if (ref.startsWith('/') || ref.includes('..') || !statSync(resolve(root, ref)).isFile()) {
      errors.push(`SKL-H03-004 unresolved authority ${skill.id}:${ref}`);
    }
  }
  const entry = registry.entries?.find(({skill_id: id}) => id === skill.id);
  const badEntry =
    entry?.version !== (skill.version ?? '0.1.0') ||
    entry.current_state !== registryState ||
    entry.execution_scope !== skill.scope ||
    entry.content_sha256 !== sha256(markdown) ||
    entry.package_manifest_sha256 !== packageDigest(skill.id) ||
    entry.lineage_ref !== `skills/${skill.id}/LINEAGE.yml` ||
    entry.publication_authority !== false;
  if (badEntry) errors.push(`SKL-H03-005 stale registry entry ${skill.id}`);
  const events = (registry.events ?? [])
    .filter(({skill_id: id}) => id === skill.id)
    .sort((left, right) => (left.event_order ?? 0) - (right.event_order ?? 0));
  const transitions: Array<[string | null, string]> = [
    [null, 'candidate'],
    ['candidate', 'quarantined'],
    ['quarantined', 'evaluated'],
  ];
  if (registryState === 'active') transitions.push(['evaluated', 'active']);
  if (registryState === 'active' && skill.version) transitions.push(['active', 'active']);
  const minimum = transitions.length;
  const badLifecycle =
    events.length < minimum ||
    (!skill.version && events.length !== minimum) ||
    events.some((event, index) => {
      const expected = transitions[index] ?? ['active', 'active'];
      return (
        event.event_order !== index + 1 ||
        event.from !== expected[0] ||
        event.to !== expected[1] ||
        !event.actor_id
      );
    });
  if (badLifecycle) errors.push(`SKL-H03-006 invalid lifecycle ${skill.id}`);
  try {
    execFileSync(process.execPath, skill.check, {cwd: root, encoding: 'utf8'});
  } catch {
    errors.push(`SKL-H03-007 local checker failed ${skill.id}`);
  }
  return errors;
};
