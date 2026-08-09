import {spawnSync} from 'node:child_process';
import {existsSync, lstatSync, readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const root = process.cwd();
const required = [
  'README.md',
  'AGENTS.md',
  'SECURITY.md',
  'package.json',
  'pnpm-lock.yaml',
  'docs/program/dag.yml',
  'docs/program/ownership-manifest.yml',
  'docs/program/instagram-content-network-v2.md',
  'registries/projects/project-registry.yml',
  'registries/memory/memory-policy.yml',
  'registries/content-types/instagram-workflow-matrix.yml',
  'registries/brand/brand-profile-v2.yml',
  'registries/brand/voice-profile-v2.yml',
  'registries/channels/instagram-profile-v1.yml',
  'core/contracts',
  'core/contracts/content-v2.ts',
  'core/orchestration',
  'core/state-machine',
  'agents/RT-01',
  'agents/RT-10',
  'skills/remotion-video-production/SKILL.md',
  'skills/remotion-video-production-v2/SKILL.md',
  'skills/metodologia-brand-router/SKILL.md',
  'skills/instagram-content-orchestration/SKILL.md',
  'skills/instagram-carousel-production/SKILL.md',
  'networks/web',
  'networks/content',
  'workflows/content/types/carousel',
  'renderers/remotion',
  'renderers/static-social',
  'adapters/notebooklm',
  'adapters/n8n',
  'projects/vs-001-source-to-campaign',
  'projects/pilot-carousel-001',
];

const errors = required
  .filter((path) => !existsSync(resolve(root, path)))
  .map((path) => `ruta requerida ausente: ${path}`);

if (lstatSync(root).isSymbolicLink()) {
  errors.push('la raíz del repositorio no puede ser symlink');
}

const readme = readFileSync(resolve(root, 'README.md'), 'utf8');
for (const invariant of [
  'PARTIAL_CONTROLLED',
  'SOURCE_LOCKED',
  'HUMAN_APPROVED',
  'READY',
  'PUBLISHED',
]) {
  if (!readme.includes(invariant)) errors.push(`README no declara invariante ${invariant}`);
}

const checks = [
  'check-toolchain.ts',
  'check-dag.ts',
  'check-ownership.ts',
  'check-principle-conformance.ts',
  'check-projects.ts',
  'check-memory.ts',
  'check-notebooklm.ts',
  'check-sources.ts',
  'check-claims.ts',
  'check-privacy.ts',
  'check-determinism.ts',
  'check-n8n.ts',
  'check-docs.ts',
  'check-brand.ts',
  'check-orchestration.ts',
  'check-carousel.ts',
  'check-content-matrix.ts',
  'check-instagram-v2-skills.ts',
  'check-career-workflows.ts',
  'check-experience-os.ts',
  'check-documentation-os.ts',
  'check-dependency-audit.ts',
  'check-receipts.ts',
  'check-visual-reference-register.mjs',
];

for (const check of checks) {
  const path = resolve(root, 'scripts', check);
  if (!existsSync(path)) {
    errors.push(`check requerido ausente: scripts/${check}`);
    continue;
  }
  const result = spawnSync(process.execPath, ['--import', 'tsx', path], {
    cwd: root,
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    errors.push(`scripts/${check}:\n${result.stdout}${result.stderr}`.trim());
  } else if (result.stdout.trim().length > 0) {
    console.info(result.stdout.trim());
  }
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.info('PASS G01/G04/G05/G06/G07/G08/G09: estructura y checks del repositorio resueltos.');
}
