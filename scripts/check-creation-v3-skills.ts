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
  {
    id: 'content-os-figma',
    scope: 'local-evaluation',
    check: ['skills/content-os-figma/scripts/check-skill.mjs'],
  },
  {
    id: 'content-os-hyperframes-cli',
    scope: 'local-evaluation',
    check: ['skills/content-os-hyperframes-cli/scripts/check-skill.mjs'],
  },
  {
    id: 'content-os-captions-overlay',
    scope: 'local-evaluation',
    check: ['skills/content-os-captions-overlay/scripts/check-skill.mjs'],
  },
  {
    id: 'content-os-motion-doctrine',
    scope: 'local-evaluation',
    check: ['skills/content-os-motion-doctrine/scripts/check-skill.mjs'],
  },
  {
    id: 'content-os-cut-the-curve',
    scope: 'local-evaluation',
    check: ['skills/content-os-cut-the-curve/scripts/check-skill.mjs'],
  },
  {
    id: 'content-os-seam-craft',
    scope: 'local-evaluation',
    check: ['skills/content-os-seam-craft/scripts/check-skill.mjs'],
  },
  {
    id: 'content-os-oversized-cursor',
    scope: 'local-evaluation',
    check: ['skills/content-os-oversized-cursor/scripts/check-skill.mjs'],
  },
  {
    id: 'content-os-remotion-best-practices',
    scope: 'local-evaluation',
    check: ['skills/content-os-remotion-best-practices/scripts/check-skill.mjs'],
  },
  {
    id: 'content-os-remotion-create',
    scope: 'local-evaluation',
    check: ['skills/content-os-remotion-create/scripts/check-skill.mjs'],
  },
  {
    id: 'content-os-remotion-markup',
    scope: 'local-evaluation',
    check: ['skills/content-os-remotion-markup/scripts/check-skill.mjs'],
  },
  {
    id: 'content-os-remotion-render',
    scope: 'local-evaluation',
    check: ['skills/content-os-remotion-render/scripts/check-skill.mjs'],
  },
  {
    id: 'content-os-remotion-maps',
    scope: 'local-evaluation',
    check: ['skills/content-os-remotion-maps/scripts/check-skill.mjs'],
  },
  {
    id: 'content-os-remotion-multimedia',
    scope: 'local-evaluation',
    check: ['skills/content-os-remotion-multimedia/scripts/check-skill.mjs'],
  },
  {
    id: 'content-os-remotion-captions',
    scope: 'local-evaluation',
    check: ['skills/content-os-remotion-captions/scripts/check-skill.mjs'],
  },
  {
    id: 'content-os-remotion-interactivity',
    scope: 'local-evaluation',
    check: ['skills/content-os-remotion-interactivity/scripts/check-skill.mjs'],
  },
  {
    id: 'content-os-remotion-saas',
    scope: 'local-evaluation',
    check: ['skills/content-os-remotion-saas/scripts/check-skill.mjs'],
  },
  {
    id: 'content-os-remotion-docs',
    scope: 'local-evaluation',
    check: ['skills/content-os-remotion-docs/scripts/check-skill.mjs'],
  },
  {
    id: 'content-os-remotion-upgrade',
    scope: 'local-evaluation',
    check: ['skills/content-os-remotion-upgrade/scripts/check-skill.mjs'],
  },
  {
    id: 'content-os-bento-grid',
    scope: 'local-evaluation',
    check: ['skills/content-os-bento-grid/scripts/check-skill.mjs'],
  },
  {
    id: 'content-os-bento-slides',
    scope: 'local-evaluation',
    check: ['skills/content-os-bento-slides/scripts/check-skill.mjs'],
  },
  {
    id: 'content-os-bento-apple-grid',
    scope: 'local-evaluation',
    check: ['skills/content-os-bento-apple-grid/scripts/check-skill.mjs'],
  },
  {
    id: 'design-impeccable',
    scope: 'local-evaluation',
    check: ['skills/design-impeccable/scripts/check-skill.mjs'],
  },
  {
    id: 'design-ui-ux-pro-max',
    scope: 'local-evaluation',
    check: ['skills/design-ui-ux-pro-max/scripts/check-skill.mjs'],
  },
  {
    id: 'design-frontend-design',
    scope: 'local-evaluation',
    check: ['skills/design-frontend-design/scripts/check-skill.mjs'],
  },
  {
    id: 'design-web-design-guidelines',
    scope: 'local-evaluation',
    check: ['skills/design-web-design-guidelines/scripts/check-skill.mjs'],
  },
  {
    id: 'design-taste-frontend',
    scope: 'local-evaluation',
    check: ['skills/design-taste-frontend/scripts/check-skill.mjs'],
  },
  {
    id: 'design-high-end-visual',
    scope: 'local-evaluation',
    check: ['skills/design-high-end-visual/scripts/check-skill.mjs'],
  },
  {
    id: 'design-minimalist-ui',
    scope: 'local-evaluation',
    check: ['skills/design-minimalist-ui/scripts/check-skill.mjs'],
  },
  {
    id: 'design-redesign',
    scope: 'local-evaluation',
    check: ['skills/design-redesign/scripts/check-skill.mjs'],
  },
  {
    id: 'design-emil',
    scope: 'local-evaluation',
    check: ['skills/design-emil/scripts/check-skill.mjs'],
  },
  {
    id: 'design-extract',
    scope: 'local-evaluation',
    check: ['skills/design-extract/scripts/check-skill.mjs'],
  },
  {
    id: 'design-css-native',
    scope: 'local-evaluation',
    check: ['skills/design-css-native/scripts/check-skill.mjs'],
  },
  {
    id: 'design-audit-genjutsu',
    scope: 'local-evaluation',
    check: ['skills/design-audit-genjutsu/scripts/check-skill.mjs'],
  },
  {
    id: 'design-framer-motion',
    scope: 'local-evaluation',
    check: ['skills/design-framer-motion/scripts/check-skill.mjs'],
  },
  {
    id: 'design-motion-principles',
    scope: 'local-evaluation',
    check: ['skills/design-motion-principles/scripts/check-skill.mjs'],
  },
  {
    id: 'design-swiftui-graphics',
    scope: 'local-evaluation',
    check: ['skills/design-swiftui-graphics/scripts/check-skill.mjs'],
  },
  {
    id: 'design-compose-graphics',
    scope: 'local-evaluation',
    check: ['skills/design-compose-graphics/scripts/check-skill.mjs'],
  },
  {
    id: 'design-compose-motion',
    scope: 'local-evaluation',
    check: ['skills/design-compose-motion/scripts/check-skill.mjs'],
  },
  {
    id: 'design-mobile-principles',
    scope: 'local-evaluation',
    check: ['skills/design-mobile-principles/scripts/check-skill.mjs'],
  },
  {
    id: 'design-canvas-generative',
    scope: 'local-evaluation',
    check: ['skills/design-canvas-generative/scripts/check-skill.mjs'],
  },
  {
    id: 'design-desktop-principles',
    scope: 'local-evaluation',
    check: ['skills/design-desktop-principles/scripts/check-skill.mjs'],
  },
  {
    id: 'design-swiftui-motion',
    scope: 'local-evaluation',
    check: ['skills/design-swiftui-motion/scripts/check-skill.mjs'],
  },
  {
    id: 'design-threejs-r3f',
    scope: 'local-evaluation',
    check: ['skills/design-threejs-r3f/scripts/check-skill.mjs'],
  },
  {
    id: 'design-compose-multiplatform',
    scope: 'local-evaluation',
    check: ['skills/design-compose-multiplatform/scripts/check-skill.mjs'],
  },
  {
    id: 'design-genjutsu-gsap-motion',
    scope: 'local-evaluation',
    check: ['skills/design-genjutsu-gsap-motion/scripts/check-skill.mjs'],
  },
  {
    id: 'design-genjutsu-uiux',
    scope: 'local-evaluation',
    check: ['skills/design-genjutsu-uiux/scripts/check-skill.mjs'],
  },
  {
    id: 'design-cast',
    scope: 'local-evaluation',
    check: ['skills/design-cast/scripts/check-skill.mjs'],
  },
  {
    id: 'design-paint',
    scope: 'local-evaluation',
    check: ['skills/design-paint/scripts/check-skill.mjs'],
  },
  {
    id: 'design-dna',
    scope: 'local-evaluation',
    check: ['skills/design-dna/scripts/check-skill.mjs'],
  },
  {
    id: 'dev-spec',
    scope: 'local-evaluation',
    check: ['skills/dev-spec/scripts/check-skill.mjs'],
  },
  {
    id: 'dev-qa',
    scope: 'local-evaluation',
    check: ['skills/dev-qa/scripts/check-skill.mjs'],
  },
  {
    id: 'dev-review',
    scope: 'local-evaluation',
    check: ['skills/dev-review/scripts/check-skill.mjs'],
  },
  {
    id: 'dev-ship',
    scope: 'local-evaluation',
    check: ['skills/dev-ship/scripts/check-skill.mjs'],
  },
  {
    id: 'dev-investigate',
    scope: 'local-evaluation',
    check: ['skills/dev-investigate/scripts/check-skill.mjs'],
  },
  {
    id: 'dev-careful',
    scope: 'local-evaluation',
    check: ['skills/dev-careful/scripts/check-skill.mjs'],
  },
  {
    id: 'dev-retro',
    scope: 'local-evaluation',
    check: ['skills/dev-retro/scripts/check-skill.mjs'],
  },
  {
    id: 'dev-qa-only',
    scope: 'local-evaluation',
    check: ['skills/dev-qa-only/scripts/check-skill.mjs'],
  },
  {
    id: 'dev-plan-eng-review',
    scope: 'local-evaluation',
    check: ['skills/dev-plan-eng-review/scripts/check-skill.mjs'],
  },
  {
    id: 'dev-plan-devex-review',
    scope: 'local-evaluation',
    check: ['skills/dev-plan-devex-review/scripts/check-skill.mjs'],
  },
  {
    id: 'dev-plan-design-review',
    scope: 'local-evaluation',
    check: ['skills/dev-plan-design-review/scripts/check-skill.mjs'],
  },
  {
    id: 'dev-plan-ceo-review',
    scope: 'local-evaluation',
    check: ['skills/dev-plan-ceo-review/scripts/check-skill.mjs'],
  },
  {
    id: 'dev-plan-tune',
    scope: 'local-evaluation',
    check: ['skills/dev-plan-tune/scripts/check-skill.mjs'],
  },
  {
    id: 'dev-devex-review',
    scope: 'local-evaluation',
    check: ['skills/dev-devex-review/scripts/check-skill.mjs'],
  },
  {
    id: 'dev-design-review',
    scope: 'local-evaluation',
    check: ['skills/dev-design-review/scripts/check-skill.mjs'],
  },
  {
    id: 'dev-design-html',
    scope: 'local-evaluation',
    check: ['skills/dev-design-html/scripts/check-skill.mjs'],
  },
  {
    id: 'dev-design-consultation',
    scope: 'local-evaluation',
    check: ['skills/dev-design-consultation/scripts/check-skill.mjs'],
  },
  {
    id: 'dev-design-shotgun',
    scope: 'local-evaluation',
    check: ['skills/dev-design-shotgun/scripts/check-skill.mjs'],
  },
  {
    id: 'dev-document-generate',
    scope: 'local-evaluation',
    check: ['skills/dev-document-generate/scripts/check-skill.mjs'],
  },
  {
    id: 'dev-document-release',
    scope: 'local-evaluation',
    check: ['skills/dev-document-release/scripts/check-skill.mjs'],
  },
  {
    id: 'dev-freeze',
    scope: 'local-evaluation',
    check: ['skills/dev-freeze/scripts/check-skill.mjs'],
  },
  {
    id: 'dev-unfreeze',
    scope: 'local-evaluation',
    check: ['skills/dev-unfreeze/scripts/check-skill.mjs'],
  },
  {
    id: 'dev-guard',
    scope: 'local-evaluation',
    check: ['skills/dev-guard/scripts/check-skill.mjs'],
  },
  {
    id: 'dev-health',
    scope: 'local-evaluation',
    check: ['skills/dev-health/scripts/check-skill.mjs'],
  },
  {
    id: 'dev-canary',
    scope: 'local-evaluation',
    check: ['skills/dev-canary/scripts/check-skill.mjs'],
  },
  {
    id: 'dev-land-and-deploy',
    scope: 'local-evaluation',
    check: ['skills/dev-land-and-deploy/scripts/check-skill.mjs'],
  },
  {
    id: 'dev-skillify',
    scope: 'local-evaluation',
    check: ['skills/dev-skillify/scripts/check-skill.mjs'],
  },
  {
    id: 'dev-learn',
    scope: 'local-evaluation',
    check: ['skills/dev-learn/scripts/check-skill.mjs'],
  },
  {
    id: 'dev-pair-agent',
    scope: 'local-evaluation',
    check: ['skills/dev-pair-agent/scripts/check-skill.mjs'],
  },
  {
    id: 'dev-setup-deploy',
    scope: 'local-evaluation',
    check: ['skills/dev-setup-deploy/scripts/check-skill.mjs'],
  },
  {
    id: 'dev-test-driven-development',
    scope: 'local-evaluation',
    check: ['skills/dev-test-driven-development/scripts/check-skill.mjs'],
  },
  {
    id: 'dev-systematic-debugging',
    scope: 'local-evaluation',
    check: ['skills/dev-systematic-debugging/scripts/check-skill.mjs'],
  },
  {
    id: 'dev-brainstorming',
    scope: 'local-evaluation',
    check: ['skills/dev-brainstorming/scripts/check-skill.mjs'],
  },
  {
    id: 'dev-dispatching-parallel-agents',
    scope: 'local-evaluation',
    check: ['skills/dev-dispatching-parallel-agents/scripts/check-skill.mjs'],
  },
  {
    id: 'dev-executing-plans',
    scope: 'local-evaluation',
    check: ['skills/dev-executing-plans/scripts/check-skill.mjs'],
  },
  {
    id: 'dev-writing-plans',
    scope: 'local-evaluation',
    check: ['skills/dev-writing-plans/scripts/check-skill.mjs'],
  },
  {
    id: 'dev-finishing-a-development-branch',
    scope: 'local-evaluation',
    check: ['skills/dev-finishing-a-development-branch/scripts/check-skill.mjs'],
  },
  {
    id: 'dev-receiving-code-review',
    scope: 'local-evaluation',
    check: ['skills/dev-receiving-code-review/scripts/check-skill.mjs'],
  },
  {
    id: 'dev-requesting-code-review',
    scope: 'local-evaluation',
    check: ['skills/dev-requesting-code-review/scripts/check-skill.mjs'],
  },
  {
    id: 'dev-subagent-driven-development',
    scope: 'local-evaluation',
    check: ['skills/dev-subagent-driven-development/scripts/check-skill.mjs'],
  },
  {
    id: 'dev-using-git-worktrees',
    scope: 'local-evaluation',
    check: ['skills/dev-using-git-worktrees/scripts/check-skill.mjs'],
  },
  {
    id: 'dev-using-superpowers',
    scope: 'local-evaluation',
    check: ['skills/dev-using-superpowers/scripts/check-skill.mjs'],
  },
  {
    id: 'dev-verification-before-completion',
    scope: 'local-evaluation',
    check: ['skills/dev-verification-before-completion/scripts/check-skill.mjs'],
  },
  {
    id: 'dev-writing-skills',
    scope: 'local-evaluation',
    check: ['skills/dev-writing-skills/scripts/check-skill.mjs'],
  },
  {
    id: 'dev-ponytail',
    scope: 'local-evaluation',
    check: ['skills/dev-ponytail/scripts/check-skill.mjs'],
  },
  {
    id: 'dev-ponytail-review',
    scope: 'local-evaluation',
    check: ['skills/dev-ponytail-review/scripts/check-skill.mjs'],
  },
  {
    id: 'dev-ponytail-audit',
    scope: 'local-evaluation',
    check: ['skills/dev-ponytail-audit/scripts/check-skill.mjs'],
  },
  {
    id: 'dev-ponytail-debt',
    scope: 'local-evaluation',
    check: ['skills/dev-ponytail-debt/scripts/check-skill.mjs'],
  },
  {
    id: 'dev-ponytail-gain',
    scope: 'local-evaluation',
    check: ['skills/dev-ponytail-gain/scripts/check-skill.mjs'],
  },
  {
    id: 'dev-ponytail-help',
    scope: 'local-evaluation',
    check: ['skills/dev-ponytail-help/scripts/check-skill.mjs'],
  },
  {
    id: 'dev-karpathy-guidelines',
    scope: 'local-evaluation',
    check: ['skills/dev-karpathy-guidelines/scripts/check-skill.mjs'],
  },
  {
    id: 'context-save',
    scope: 'local-evaluation',
    check: ['skills/context-save/scripts/check-skill.mjs'],
  },
  {
    id: 'context-restore',
    scope: 'local-evaluation',
    check: ['skills/context-restore/scripts/check-skill.mjs'],
  },
  {
    id: 'context-sync-gbrain',
    scope: 'local-evaluation',
    check: ['skills/context-sync-gbrain/scripts/check-skill.mjs'],
  },
  {
    id: 'context-setup-gbrain',
    scope: 'local-evaluation',
    check: ['skills/context-setup-gbrain/scripts/check-skill.mjs'],
  },
  {
    id: 'context-agents-dox',
    scope: 'local-evaluation',
    check: ['skills/context-agents-dox/scripts/check-skill.mjs'],
  },
  {
    id: 'context-codebase-guardian',
    scope: 'local-evaluation',
    check: ['skills/context-codebase-guardian/scripts/check-skill.mjs'],
  },
  {
    id: 'context-lsp',
    scope: 'local-evaluation',
    check: ['skills/context-lsp/scripts/check-skill.mjs'],
  },
  {
    id: 'context-memory',
    scope: 'local-evaluation',
    check: ['skills/context-memory/scripts/check-skill.mjs'],
  },
  {
    id: 'context-schema-aware-db',
    scope: 'local-evaluation',
    check: ['skills/context-schema-aware-db/scripts/check-skill.mjs'],
  },
  {
    id: 'context-teammates',
    scope: 'local-evaluation',
    check: ['skills/context-teammates/scripts/check-skill.mjs'],
  },
  {
    id: 'media-rembg',
    scope: 'local-evaluation',
    check: ['skills/media-rembg/scripts/check-skill.mjs'],
  },
  {
    id: 'media-make-pdf',
    scope: 'local-evaluation',
    check: ['skills/media-make-pdf/scripts/check-skill.mjs'],
  },
  {
    id: 'web-crawl4ai',
    scope: 'local-evaluation',
    check: ['skills/web-crawl4ai/scripts/check-skill.mjs'],
  },
  {
    id: 'web-scrape',
    scope: 'local-evaluation',
    check: ['skills/web-scrape/scripts/check-skill.mjs'],
  },
  {
    id: 'web-browse',
    scope: 'local-evaluation',
    check: ['skills/web-browse/scripts/check-skill.mjs'],
  },
  {
    id: 'web-open-browser',
    scope: 'local-evaluation',
    check: ['skills/web-open-browser/scripts/check-skill.mjs'],
  },
  {
    id: 'web-setup-browser-cookies',
    scope: 'local-evaluation',
    check: ['skills/web-setup-browser-cookies/scripts/check-skill.mjs'],
  },
  {
    id: 'web-hackernews-frontpage',
    scope: 'local-evaluation',
    check: ['skills/web-hackernews-frontpage/scripts/check-skill.mjs'],
  },
  {
    id: 'gstack-autoplan',
    scope: 'local-evaluation',
    check: ['skills/gstack-autoplan/scripts/check-skill.mjs'],
  },
  {
    id: 'gstack-benchmark',
    scope: 'local-evaluation',
    check: ['skills/gstack-benchmark/scripts/check-skill.mjs'],
  },
  {
    id: 'gstack-benchmark-models',
    scope: 'local-evaluation',
    check: ['skills/gstack-benchmark-models/scripts/check-skill.mjs'],
  },
  {
    id: 'gstack-upgrade',
    scope: 'local-evaluation',
    check: ['skills/gstack-upgrade/scripts/check-skill.mjs'],
  },
  {
    id: 'gstack-ios-clean',
    scope: 'local-evaluation',
    check: ['skills/gstack-ios-clean/scripts/check-skill.mjs'],
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
  console.info(
    `PASS CREATION V3 SKILLS: ${skills.length} local H-03 skills are active and hash-bound.`,
  );
}
