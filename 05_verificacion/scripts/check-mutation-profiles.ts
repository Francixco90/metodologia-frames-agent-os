import {readFileSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {renderMutationProfilesV1} from './lib/mutation-profile-registry.ts';

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(moduleDirectory, '../..');
const output = path.join(root, '04_estado/registries/skills/mutation-profile-registry.yml');
const expected = renderMutationProfilesV1(root);

if (process.argv.includes('--write')) writeFileSync(output, expected, 'utf8');
else if (readFileSync(output, 'utf8') !== expected) throw new Error('MUTATION-PROFILE-DRIFT001');

process.stdout.write(
  `PASS mutation-profiles entries=${expected.match(/skill_id:/g)?.length ?? 0}\n`,
);
