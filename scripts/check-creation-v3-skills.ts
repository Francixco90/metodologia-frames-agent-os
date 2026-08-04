import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync, readdirSync, statSync} from 'node:fs';
import {join, relative, resolve} from 'node:path';

import {parse} from 'yaml';

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

type Entry = {
  skill_id?: string;
  version?: string;
  current_state?: string;
  execution_scope?: string;
  content_sha256?: string;
  package_manifest_sha256?: string;
  lineage_ref?: string;
  dependency_receipt_ref?: string;
  publication_authority?: boolean;
};
type Event = {
  event_id?: string;
  event_order?: number;
  skill_id?: string;
  from?: string | null;
  to?: string;
  actor_id?: string;
};

const registry = parse(
  readFileSync(resolve(root, 'registries/skills/creation-v3-skill-registry.yml'), 'utf8'),
) as {mutation_policy?: string; entries?: Entry[]; events?: Event[]};
const errors: string[] = [];
if (!registry.mutation_policy?.includes('append-only')) {
  errors.push('SKL-H03-001 registry is not append-only');
}

type SkillEntry = {
  id: string;
  scope: string;
  version?: string;
  check: readonly string[];
};

const skills: SkillEntry[] = [
  {
    id: 'data-visual-composition',
    scope: 'local-evaluation',
    check: ['--import', 'tsx', 'skills/data-visual-composition/scripts/check.ts'],
  },
  {
    id: 'motion-library-adapters',
    scope: 'local-evaluation-only',
    version: '0.2.0',
    check: ['skills/motion-library-adapters/scripts/check-skill.mjs'],
  },
  {
    id: 'content-os-core',
    scope: 'local-evaluation',
    check: ['skills/content-os-core/scripts/check-skill.mjs'],
  },
  {
    id: 'content-os-animation',
    scope: 'local-evaluation',
    check: ['skills/content-os-animation/scripts/check-skill.mjs'],
  },
  {
    id: 'content-os-keyframes',
    scope: 'local-evaluation',
    check: ['skills/content-os-keyframes/scripts/check-skill.mjs'],
  },
  {
    id: 'content-os-creative',
    scope: 'local-evaluation',
    check: ['skills/content-os-creative/scripts/check-skill.mjs'],
  },
  {
    id: 'content-os-media',
    scope: 'local-evaluation',
    check: ['skills/content-os-media/scripts/check-skill.mjs'],
  },
  {
    id: 'content-os-registry',
    scope: 'local-evaluation',
    check: ['skills/content-os-registry/scripts/check-skill.mjs'],
  },
  {
    id: 'content-os-router',
    scope: 'local-evaluation',
    check: ['skills/content-os-router/scripts/check-skill.mjs'],
  },
  {
    id: 'content-os-faceless-explainer',
    scope: 'local-evaluation',
    check: ['skills/content-os-faceless-explainer/scripts/check-skill.mjs'],
  },
  {
    id: 'content-os-pr-to-video',
    scope: 'local-evaluation',
    check: ['skills/content-os-pr-to-video/scripts/check-skill.mjs'],
  },
  {
    id: 'content-os-product-launch-video',
    scope: 'local-evaluation',
    check: ['skills/content-os-product-launch-video/scripts/check-skill.mjs'],
  },
  {
    id: 'content-os-motion-graphics',
    scope: 'local-evaluation',
    check: ['skills/content-os-motion-graphics/scripts/check-skill.mjs'],
  },
  {
    id: 'content-os-embedded-captions',
    scope: 'local-evaluation',
    check: ['skills/content-os-embedded-captions/scripts/check-skill.mjs'],
  },
  {
    id: 'content-os-slideshow',
    scope: 'local-evaluation',
    check: ['skills/content-os-slideshow/scripts/check-skill.mjs'],
  },
  {
    id: 'content-os-general-video',
    scope: 'local-evaluation',
    check: ['skills/content-os-general-video/scripts/check-skill.mjs'],
  },
  {
    id: 'content-os-remotion-bridge',
    scope: 'local-evaluation',
    check: ['skills/content-os-remotion-bridge/scripts/check-skill.mjs'],
  },
  {
    id: 'content-os-talking-head-recut',
    scope: 'local-evaluation',
    check: ['skills/content-os-talking-head-recut/scripts/check-skill.mjs'],
  },
  {
    id: 'content-os-music-to-video',
    scope: 'local-evaluation',
    check: ['skills/content-os-music-to-video/scripts/check-skill.mjs'],
  },
  {
    id: 'content-os-changelog-video',
    scope: 'local-evaluation',
    check: ['skills/content-os-changelog-video/scripts/check-skill.mjs'],
  },
];

for (const skill of skills) {
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
  if (
    !markdown.startsWith(`---\nname: ${skill.id}\n`) ||
    !markdown.includes('description: This skill should be used when') ||
    !markdown.includes(`version: ${skill.version ?? '0.1.0'}`) ||
    !markdown.includes('lifecycle_state: active') ||
    /\/Users\/|\/home\/|[A-Za-z]:\\Users\\/u.test(markdown)
  ) {
    errors.push(`SKL-H03-002 invalid skill metadata ${skill.id}`);
  }
  if (
    lineage.skill_id !== skill.id ||
    lineage.version !== (skill.version ?? '0.1.0') ||
    lineage.lifecycle_state !== 'active' ||
    lineage.execution_scope !== skill.scope ||
    lineage.external_fragments_reused !== false ||
    lineage.publication_authority !== false
  ) {
    errors.push(`SKL-H03-003 invalid lineage ${skill.id}`);
  }
  for (const ref of lineage.authority_refs ?? []) {
    if (ref.startsWith('/') || ref.includes('..') || !statSync(resolve(root, ref)).isFile()) {
      errors.push(`SKL-H03-004 unresolved authority ${skill.id}:${ref}`);
    }
  }
  const entry = registry.entries?.find(({skill_id: id}) => id === skill.id);
  if (
    entry?.version !== (skill.version ?? '0.1.0') ||
    entry.current_state !== 'active' ||
    entry.execution_scope !== skill.scope ||
    entry.content_sha256 !== sha256(markdown) ||
    entry.package_manifest_sha256 !== packageDigest(skill.id) ||
    entry.lineage_ref !== `skills/${skill.id}/LINEAGE.yml` ||
    entry.publication_authority !== false
  ) {
    errors.push(`SKL-H03-005 stale registry entry ${skill.id}`);
  }
  const events = (registry.events ?? [])
    .filter(({skill_id: id}) => id === skill.id)
    .sort((left, right) => (left.event_order ?? 0) - (right.event_order ?? 0));
  const transitions: Array<[string | null, string]> = [
    [null, 'candidate'],
    ['candidate', 'quarantined'],
    ['quarantined', 'evaluated'],
    ['evaluated', 'active'],
  ];
  if (skill.version) {
    transitions.push(['active', 'active']);
  }
  if (
    events.length !== transitions.length ||
    events.some(
      (event, index) =>
        event.event_order !== index + 1 ||
        event.from !== transitions[index]?.[0] ||
        event.to !== transitions[index]?.[1] ||
        !event.actor_id,
    )
  ) {
    errors.push(`SKL-H03-006 invalid lifecycle ${skill.id}`);
  }
  try {
    execFileSync(process.execPath, skill.check, {cwd: root, encoding: 'utf8'});
  } catch {
    errors.push(`SKL-H03-007 local checker failed ${skill.id}`);
  }
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.info('PASS CREATION V3 SKILLS: seventeen local H-03 skills are active and hash-bound.');
}
