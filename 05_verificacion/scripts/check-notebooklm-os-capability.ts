import {statSync} from 'node:fs';
import {resolve} from 'node:path';

import {add, read, readYaml, root, unique, walkFiles} from './check-notebooklm-os-common.ts';

const contractRoot = '02_proceso/core/contracts';
const contractFiles = walkFiles(contractRoot).filter((path) =>
  /notebooklm-brand-.*\.ts$/u.test(path),
);
const brandContract = contractFiles.map(read).join('\n');
for (const symbol of [
  'BrandInputRefV1',
  'BrandIntakePacketV1',
  'BrandEvidenceSetV1',
  'BrandKnowledgePackV1',
  'BrandProfileApprovalReceiptV1',
  'BrandNotebookBuildV1',
  'BrandContentBriefV1',
  'BrandFeedbackEventV1',
  'BrandQaReceiptV1',
  'BrandEvidenceStatus',
  'BrandBuildState',
]) {
  add(
    new RegExp(`export (?:const|type) ${symbol}(?:Schema)?\\b`, 'u').test(brandContract),
    `${contractRoot}: no exporta ${symbol}`,
  );
}

const runtimeRoot = '02_proceso/workflows/notebooklm-os';
const runtime = walkFiles(runtimeRoot)
  .filter((path) => /brand-runtime(?:-[a-z]+)?\.ts$/u.test(path))
  .map(read)
  .join('\n');
for (const symbol of [
  'normalizeBrandInputs',
  'compileBrandEvidence',
  'compileBrandKnowledgePack',
  'activateBrandKnowledgePack',
  'compileBrandNotebookBuild',
  'compileBrandBootstrap',
  'buildBrandContentBrief',
  'buildBrandStudioBrief',
  'applyBrandFeedback',
])
  add(runtime.includes(`export const ${symbol}`), `${runtimeRoot}: no exporta ${symbol}`);

export const requiredSkills = [
  'notebooklm-os-router',
  'notebooklm-profile-compiler',
  'notebooklm-source-curator',
  'notebooklm-naming-taxonomy',
  'notebooklm-system-prompt',
  'notebooklm-studio-director',
  'notebooklm-artifact-verifier',
  'notebooklm-sharing-guardian',
  'notebooklm-brand-intake',
  'notebooklm-brand-kit-compiler',
  'notebooklm-brand-content-director',
  'notebooklm-brand-verifier',
];
for (const skillId of requiredSkills) {
  const skillRoot = `03_artefactos/skills/${skillId}`;
  const skill = read(`${skillRoot}/SKILL.md`);
  add(statSync(resolve(root, `${skillRoot}/LINEAGE.yml`)).size > 0, `${skillRoot}: LINEAGE vacío`);
  for (const contractWord of ['trigger', 'input', 'output', 'stop', 'done'])
    add(
      new RegExp(contractWord, 'iu').test(skill),
      `${skillRoot}/SKILL.md: falta contrato ${contractWord}`,
    );
}

const skillRegistry = read('04_estado/registries/skills/notebooklm-os-skill-registry.yml');
for (const skillId of requiredSkills)
  add(skillRegistry.includes(`skill_id: ${skillId}`), `skill registry: falta ${skillId}`);
add(
  !/publication_authority:\s*true/u.test(skillRegistry),
  'skill registry: ningún skill puede tener autoridad de publicación',
);

const agents = readYaml('02_proceso/workflows/notebooklm-os/agents.yml') as {
  agents?: Array<{id?: string; independent?: boolean}>;
  separation_rules?: string[];
};
const agentIds = (agents.agents ?? []).flatMap(({id}) => (id ? [id] : []));
for (const id of ['brand-intake-analyst', 'brand-content-director', 'brand-verifier'])
  add(agentIds.includes(id), `agents.yml: falta ${id}`);
add(unique(agentIds), 'agents.yml: IDs duplicados');
add(
  agents.agents?.some(({id, independent}) => id === 'brand-verifier' && independent === true) ??
    false,
  'agents.yml: Brand Verifier debe ser independiente',
);
add(
  (agents.separation_rules ?? []).some((rule) =>
    /brand.*producer.*verifier|producer.*brand.*verifier/iu.test(rule),
  ),
  'agents.yml: falta separación producer/verifier de marca',
);

const commands = readYaml('02_proceso/workflows/notebooklm-os/commands.yml') as {
  aliases?: Record<string, unknown>;
};
for (const alias of [
  'brand-init',
  'brand-audit',
  'brand-build',
  'brand-content',
  'brand-verify',
  'brand-evolve',
])
  add(commands.aliases?.[alias] !== undefined, `commands.yml: falta alias ${alias}`);
