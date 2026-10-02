import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {z} from 'zod';
import {assertContainedInputFileV1} from '../../core/safe-local-path-v1.ts';
export const aulaAuthorityRefV1 = '04_estado/registries/renderers/aula-decks-capability-v1.json';
const Authority = z.object({
  lifecycleState: z.literal('active'),
  publicationAuthority: z.literal(false),
  engineRefs: z.array(z.object({ref: z.string(), sha256: z.string().regex(/^[a-f0-9]{64}$/u)})),
});
export function assertAulaEngineAuthorityV1(root: string) {
  const authority = Authority.parse(
    JSON.parse(
      readFileSync(assertContainedInputFileV1(root, aulaAuthorityRefV1), 'utf8'),
    ) as unknown,
  );
  for (const name of ['runtime.py', 'app.js', 'style.css'])
    if (
      !authority.engineRefs.some(
        (item) => item.ref === `03_artefactos/renderers/frames-aula/${name}`,
      )
    )
      throw new Error('AULA_ENGINE_AUTHORITY_STALE');
  for (const frozen of authority.engineRefs) {
    const ref = frozen.ref;
    if (!ref.startsWith('03_artefactos/renderers/frames-aula/'))
      throw new Error('AULA_ENGINE_AUTHORITY_REF_INVALID');
    const current = createHash('sha256')
      .update(readFileSync(assertContainedInputFileV1(root, ref)))
      .digest('hex');
    if (frozen.sha256 !== current) throw new Error('AULA_ENGINE_AUTHORITY_STALE');
  }
  return authority;
}
