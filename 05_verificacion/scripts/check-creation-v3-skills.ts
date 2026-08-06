// check-creation-v3-skills.ts — orchestrator for H-03 creation skill validation.
//
// Skill table lives in `creation-v3-skills.json` (data, extracted from the
// former inline array). Per-skill logic lives in `creation-v3-checks.ts`.
// CLI: `pnpm verify:creation-skills` (part of verify:skills). [CÓDIGO]
import {createHash} from 'node:crypto';
import {readFileSync, readdirSync, statSync} from 'node:fs';
import {join, relative, resolve} from 'node:path';
import {parse} from 'yaml';

import {validateSkill, type Registry, type SkillEntry} from './creation-v3-checks.ts';

const root = process.cwd();
const sha256 = (value: Uint8Array | string): string =>
  createHash('sha256').update(value).digest('hex');
const walk = (directory: string): string[] =>
  readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
const packageDigest = (skillId: string): string => {
  const directory = resolve(root, 'skills', skillId);
  const ledger = `${walk(directory)
    .sort()
    .map(
      (path) => `${sha256(readFileSync(path))}  ${relative(directory, path).replaceAll('\\', '/')}`,
    )
    .join('\n')}\n`;
  return sha256(ledger);
};

const skills = JSON.parse(
  readFileSync(resolve(root, '05_verificacion/scripts/creation-v3-skills.json'), 'utf8'),
) as SkillEntry[];
const registry = parse(
  readFileSync(resolve(root, 'registries/skills/creation-v3-skill-registry.yml'), 'utf8'),
) as Registry;

const errors: string[] = [];
if (!registry.mutation_policy?.includes('append-only')) {
  errors.push('SKL-H03-001 registry is not append-only');
}
for (const skill of skills) {
  errors.push(...validateSkill(skill, registry, {root, sha256, packageDigest}));
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.info(
    `PASS CREATION V3 SKILLS: ${skills.length} local H-03 skills are active and hash-bound.`,
  );
}
