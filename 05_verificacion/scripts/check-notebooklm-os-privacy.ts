import {statSync} from 'node:fs';
import {resolve} from 'node:path';

import {requiredSkills} from './check-notebooklm-os-capability.ts';
import {add, fixtureRoot, read, root, walkFiles} from './check-notebooklm-os-common.ts';

const antiLeakRoots = [
  '02_proceso/core/contracts',
  '02_proceso/workflows/notebooklm-os',
  '04_estado/registries/skills/notebooklm-os-skill-registry.yml',
  fixtureRoot,
  ...requiredSkills.map((skillId) => `03_artefactos/skills/${skillId}`),
];
const antiLeakFiles = [
  ...new Set(
    antiLeakRoots.flatMap((path) =>
      statSync(resolve(root, path)).isDirectory() ? walkFiles(path) : [path],
    ),
  ),
].filter((path) => !/\.(?:png|jpe?g|gif|webp|pdf|zip|pptx|docx)$/iu.test(path));
const forbiddenPatterns: Array<[RegExp, string]> = [
  [/(?:^|[\s"'=])\/(?:Users|home|private|tmp|var)\//mu, 'locator local'],
  [/[A-Za-z]:[\\/](?:Users|private)[\\/]/u, 'locator local Windows'],
  [/file:\/\//u, 'file URI'],
  [/https?:\/\/(?:drive\.google|notebook\.google)\.com/iu, 'locator privado Google'],
  [/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/iu, 'UUID'],
  [/\b(?:Javier|Katherin|Pr[ií]stino)\b/iu, 'identidad privada'],
  [/\bCanon v[123]\b/iu, 'canon privado'],
];
for (const relativePath of antiLeakFiles) {
  const raw = read(relativePath);
  for (const [pattern, label] of forbiddenPatterns)
    add(!pattern.test(raw), `${relativePath}: contiene ${label}`);
}
