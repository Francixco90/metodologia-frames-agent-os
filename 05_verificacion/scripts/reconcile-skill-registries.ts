/**
 * Cross-cutting reconciliation gate for both skill registries.
 *
 * Catches drift that the per-skill validators (check-instagram-v2-skills.ts,
 * check-creation-v3-skills.ts) do NOT cover:
 *
 * RCN-001  cross-registry duplicate (skill_id in both v2 and v3)
 * RCN-002  entry missing skill_id
 * RCN-003  entry has no SKILL.md on disk
 * RCN-004  content_sha256 drift (registry vs on-disk SKILL.md)
 * RCN-005  package_manifest_sha256 drift (registry vs on-disk skill dir)
 * RCN-006  unresolved lineage path
 * RCN-007  unresolved content-license receipt path
 * RCN-008  content-license receipt_sha256 drift
 * RCN-009  orphan skill dir (on disk, registered in neither registry)
 * RCN-010  registry entry with no matching skill dir on disk
 * RCN-011  duplicate event_id within a single registry
 *
 * Covers legacy entries (e.g. remotion-video-production v0.2.0) that the
 * validators skip because they are not in their hardcoded skills[] lists.
 *
 * Run via `pnpm verify:skills` (chained after the two validators).
 */
import {createHash} from 'node:crypto';
import {existsSync, readFileSync, readdirSync, statSync} from 'node:fs';
import {join, relative, resolve} from 'node:path';

import {parse} from 'yaml';

const root = process.cwd();
const sha256 = (value: Buffer | string): string => createHash('sha256').update(value).digest('hex');
const portable = (value: string): string => value.replaceAll('\\', '/');

const walk = (directory: string): string[] =>
  readdirSync(directory).flatMap((name) => {
    const child = join(directory, name);
    return statSync(child).isDirectory() ? walk(child) : [child];
  });

const packageDigest = (skillRoot: string): string => {
  const absoluteRoot = resolve(root, skillRoot);
  const manifest = `${walk(absoluteRoot)
    .sort()
    .map((path) => `${sha256(readFileSync(path))}  ${portable(relative(absoluteRoot, path))}`)
    .join('\n')}\n`;
  return sha256(manifest);
};

const readYaml = (path: string): unknown => parse(readFileSync(resolve(root, path), 'utf8'));

type Entry = {
  skill_id?: string;
  content_sha256?: string;
  package_manifest_sha256?: string;
  lineage?: string;
  lineage_ref?: string;
  content_license_evidence?: {
    receipt_ref?: string;
    receipt_sha256?: string;
  };
};

type RegistryEvent = {event_id?: string};

type Registry = {
  mutation_policy?: string;
  entries?: Entry[];
  events?: RegistryEvent[];
};

const errors: string[] = [];

const v2 = readYaml('registries/skills/skill-registry.yml') as Registry;
const v3 = readYaml('registries/skills/creation-v3-skill-registry.yml') as Registry;

const v2Entries = v2.entries ?? [];
const v3Entries = v3.entries ?? [];
const v2Ids = new Set(
  v2Entries.map((entry) => entry.skill_id).filter((id): id is string => id !== undefined),
);
const v3Ids = new Set(
  v3Entries.map((entry) => entry.skill_id).filter((id): id is string => id !== undefined),
);

// RCN-001 cross-registry duplicates
for (const id of v2Ids) {
  if (v3Ids.has(id)) errors.push(`RCN-001 cross-registry duplicate skill_id ${id}`);
}

// RCN-002..008 per-entry binding (both registries, including legacy entries)
const checkHashBinding = (entries: Entry[], label: string): void => {
  for (const entry of entries) {
    const id = entry.skill_id;
    if (!id) {
      errors.push(`RCN-002 ${label}: entry missing skill_id`);
      continue;
    }
    const skillRoot = `skills/${id}`;
    const skillPath = `${skillRoot}/SKILL.md`;
    if (!existsSync(resolve(root, skillPath))) {
      errors.push(`RCN-003 ${label} ${id}: missing SKILL.md on disk`);
      continue;
    }
    const contentHash = sha256(readFileSync(resolve(root, skillPath)));
    if (entry.content_sha256 !== contentHash) {
      errors.push(
        `RCN-004 ${label} ${id}: content_sha256 drift (registry ${entry.content_sha256?.slice(0, 12)}… on-disk ${contentHash.slice(0, 12)}…)`,
      );
    }
    const manifestHash = packageDigest(skillRoot);
    if (entry.package_manifest_sha256 !== manifestHash) {
      errors.push(
        `RCN-005 ${label} ${id}: package_manifest_sha256 drift (registry ${entry.package_manifest_sha256?.slice(0, 12)}… on-disk ${manifestHash.slice(0, 12)}…)`,
      );
    }
    const lineagePath = entry.lineage ?? entry.lineage_ref;
    if (!lineagePath || !existsSync(resolve(root, lineagePath))) {
      errors.push(`RCN-006 ${label} ${id}: unresolved lineage ${lineagePath ?? '<missing>'}`);
    }
    const receiptRef = entry.content_license_evidence?.receipt_ref;
    const receiptHash = entry.content_license_evidence?.receipt_sha256;
    if (receiptRef && receiptHash) {
      if (!existsSync(resolve(root, receiptRef))) {
        errors.push(`RCN-007 ${label} ${id}: unresolved receipt ${receiptRef}`);
      } else if (sha256(readFileSync(resolve(root, receiptRef))) !== receiptHash) {
        errors.push(`RCN-008 ${label} ${id}: receipt_sha256 drift`);
      }
    }
  }
};

checkHashBinding(v2Entries, 'v2');
checkHashBinding(v3Entries, 'v3');

// RCN-009 / RCN-010 orphan and missing-dir reconciliation
const registered = new Set<string>([...v2Ids, ...v3Ids]);
const skillsDir = resolve(root, 'skills');
const diskSkills = readdirSync(skillsDir).filter((name) => {
  if (name === 'vendor') return false;
  const stat = statSync(join(skillsDir, name));
  return stat.isDirectory();
});
for (const name of diskSkills) {
  if (!registered.has(name)) {
    errors.push(`RCN-009 orphan skill dir skills/${name} (registered in neither registry)`);
  }
}
for (const id of registered) {
  if (!diskSkills.includes(id)) {
    errors.push(`RCN-010 registry entry ${id} has no skill dir on disk`);
  }
}

// RCN-011 global event_id uniqueness per registry
const checkEventUniqueness = (registry: Registry, label: string): void => {
  const seen = new Set<string>();
  for (const event of registry.events ?? []) {
    const id = event.event_id;
    if (!id) continue;
    if (seen.has(id)) errors.push(`RCN-011 ${label}: duplicate event_id ${id}`);
    seen.add(id);
  }
};

checkEventUniqueness(v2, 'v2');
checkEventUniqueness(v3, 'v3');

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.info(
    `PASS REGISTRY RECONCILE: ${v2Entries.length} v2 + ${v3Entries.length} v3 entries hash-bound, 0 orphans, 0 cross-registry dupes, event_ids unique.`,
  );
}
