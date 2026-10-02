import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {z} from 'zod';
import {AULA_KINDS} from '../../../02_proceso/workflows/multimedia/_runner/aula-capability-v1.ts';
import {sha256} from '../ledger/git-walker.ts';
export const isVerifiedAulaFont = (root: string, path: string, bytes: Buffer): boolean => {
  const fonts: Record<string, string> = {
    'Poppins-Bold.ttf': '983676516167748b74de6f4771fb384c664fd913acb8b471122ecacf5da5ea6c',
    'Montserrat-VariableFont_wght.ttf':
      '0f7b311b2f3279e4eef9b2f968bcdbab6e28f4daeb1f049f4f278a902bcd82f7',
  };
  const name = path.split('/').at(-1)!;
  if (!fonts[name] || sha256(bytes) !== fonts[name]) return false;
  const result = z
    .object({
      skills: z
        .array(z.object({name: z.string().regex(/^[a-z][a-z0-9-]*$/)}))
        .length(AULA_KINDS.length * 2),
    })
    .safeParse(
      JSON.parse(
        readFileSync(resolve(root, '04_estado/registries/skills/aula-decks-package.json'), 'utf8'),
      ) as unknown,
    );
  if (
    !result.success ||
    new Set(result.data.skills.map((skill) => skill.name)).size !== AULA_KINDS.length * 2
  )
    return false;
  const manifest = result.data;
  const scopes = [
    '03_artefactos/renderers/frames-aula/assets/core/fonts/',
    ...manifest.skills.map(
      (skill: {name: string}) => `03_artefactos/skills/${skill.name}/engine/assets/core/fonts/`,
    ),
  ];
  return scopes.some((scope) => path === scope + name);
};
