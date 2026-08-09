import {createHash} from 'node:crypto';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parse} from 'yaml';
import {z} from 'zod';

const Definition = z.strictObject({
  id: z.string().regex(/^skill-[a-z0-9-]+$/u),
  code: z.string().regex(/^[A-Z]{3}$/u),
  effect: z.enum(['advisory', 'read_only', 'local_reversible']),
  trigger: z.string().min(10),
  responsibility: z.string().min(10),
  workflow_steps: z.array(z.string().regex(/^S\d{2}$/u)).min(1),
  inputs: z.array(z.string()).min(1),
  outputs: z.array(z.string()).min(1),
  stop: z.string().min(10),
});
const Suite = z.strictObject({
  schema_version: z.literal('skill-system-suite-v1'),
  source_ref: z.string(),
  source_authority_ref: z.string(),
  skills: z.array(Definition).length(8),
});

const skill = (item: z.infer<typeof Definition>) => `---
name: ${item.id}
description: This skill should be used when se necesite ${item.trigger}. Coordina los pasos ${item.workflow_steps.join(', ')} sin ampliar autoridad.
version: 0.1.0
license: LicenseRef-MetodologIA-Internal
metadata:
  owner: MetodologIA
  lifecycle_state: active
  execution_scope: local-evaluation
  model_agnostic: true
---

# ${item.id}

## Operación

Lee [context.md](context.md). ${item.responsibility} [METODOLOGIA][CONFIG]

1. Verifica route lock, actor, fuentes, candidate y efecto.
2. Consume únicamente: ${item.inputs.join(', ')}.
3. Ejecuta el paso ${item.workflow_steps.join(' → ')} sin asumir permisos.
4. Produce: ${item.outputs.join(', ')}.
5. Relee hashes, declara gaps y entrega al verifier indicado.

Consulta [references/operating-contract.md](references/operating-contract.md) solo cuando necesites invariantes y recuperación.

## Límite

${item.stop} No instala, publica, conecta ni promueve. RT-09, RT-11 y H01 permanecen actores separados.
`;

const checker = (item: z.infer<typeof Definition>) => `import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
const id = '${item.id}';
const refs = ['SKILL.md','context.md','LINEAGE.yml','references/operating-contract.md','fixtures/positive/case.yml','fixtures/negative/case.yml','receipts/runtime-boundary.yml'];
const body = refs.map((ref) => readFileSync(resolve('skills', id, ref), 'utf8')).join('\\n');
for (const token of [\`name: \${id}\`,'version: 0.1.0','lifecycle_state: active','execution_scope: local-evaluation','publication_authority: false']) if (!body.includes(token)) throw new Error(\`\${id}: missing \${token}\`);
for (let section=1; section<=6; section+=1) if (!body.includes(\`## \${section}.\`)) throw new Error(\`\${id}: context section \${section}\`);
if (/\\/Users\\/|\\/home\\/|file:\\/\\/|[A-Za-z]:\\\\Users\\\\/u.test(body)) throw new Error(\`\${id}: private locator\`);
console.info(\`PASS \${id}: Skill Systems H-03 package.\`);
`;

const writePackage = async (root: string, item: z.infer<typeof Definition>, sourceRef: string) => {
  const packageRoot = path.join(root, '03_artefactos/skills', item.id);
  for (const dir of ['references', 'fixtures/positive', 'fixtures/negative', 'receipts', 'scripts'])
    await mkdir(path.join(packageRoot, dir), {recursive: true});
  const files: Record<string, string> = {
    'SKILL.md': skill(item),
    'LINEAGE.yml': `schema_version: 1\nskill_id: ${item.id}\nversion: 0.1.0\nlifecycle_state: active\nexecution_scope: local-evaluation\ncontent_origin: locally_authored_for_frames\nderivation_mode: contextualized_from_governed_prd\nauthority_refs: [${sourceRef}, 02_proceso/workflows/skill-systems/contracts.ts]\nexternal_fragments_reused: false\npublication_authority: false\nnetwork_allowed: false\n`,
    'references/operating-contract.md': `# Operating contract\n\nResponsabilidad: ${item.responsibility}\n\nInputs: ${item.inputs.join(', ')}. Outputs: ${item.outputs.join(', ')}.\n\nStop: ${item.stop}\n`,
    'fixtures/positive/case.yml': `schema_version: skill-system-fixture-v1\nskill_id: ${item.id}\nexpected: PASS\neffect: ${item.effect}\n`,
    'fixtures/negative/case.yml': `schema_version: skill-system-fixture-v1\nskill_id: ${item.id}\ninput: {authority: missing}\nexpected: BLOCKED\n`,
    'receipts/runtime-boundary.yml': `schema_version: runtime-boundary-v1\nskill_id: ${item.id}\nnetwork_allowed: false\npublication_authority: false\nexternal_execution: false\nmaximum_effect: ${item.effect}\n`,
    'scripts/check-skill.mjs': checker(item),
  };
  for (const [ref, body] of Object.entries(files))
    await writeFile(path.join(packageRoot, ref), body, 'utf8');
  return {
    id: item.id,
    content_sha256: createHash('sha256').update(files['SKILL.md']!).digest('hex'),
  };
};

export const generateSkillSystemSuite = async (root = process.cwd()) => {
  const source = Suite.parse(
    parse(
      await readFile(path.join(root, '02_proceso/workflows/skill-systems/skill-suite.yml'), 'utf8'),
    ),
  );
  return Promise.all(source.skills.map((item) => writePackage(root, item, source.source_ref)));
};

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) console.info(JSON.stringify(await generateSkillSystemSuite(), null, 2));
