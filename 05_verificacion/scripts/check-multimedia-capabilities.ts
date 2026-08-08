// Fail-closed P00–P09 capability, template, gate and deliverable integrity. [CÓDIGO]
import {readFileSync, readdirSync, existsSync, realpathSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parse} from 'yaml';

import {
  MultimediaWorkflowSchema,
  type MultimediaWorkflow,
} from '../../02_proceso/workflows/multimedia/_schema/workflow-v1.schema.ts';
import {
  loadDeliverableDefinitions,
  type TemplateRegistryEntry,
  validateCatalogCoverage,
  validateTemplateAcceptanceGates,
  validateWorkflowDeliverables,
} from './lib/multimedia-deliverables.ts';
export {
  type TemplateRegistryEntry,
  validateTemplateAcceptanceGates,
} from './lib/multimedia-deliverables.ts';

const root = process.cwd();
const MW_DIR = join(root, '02_proceso', 'workflows', 'multimedia');
const ARTIFACT_REGISTRY = join(MW_DIR, '_assets', 'artifact-registry.md');
const TEMPLATE_REGISTRY = join(MW_DIR, '_assets', 'deliverable-template-registry.yml');
const DESIGN_PROFILE = join(MW_DIR, '_assets', 'metodologia-html-v7.yml');
const V3_REGISTRY = join(
  root,
  '04_estado',
  'registries',
  'skills',
  'creation-v3-skill-registry.yml',
);
const V2_REGISTRY = join(root, '04_estado', 'registries', 'skills', 'skill-registry.yml');
const SKILLS_DIR = join(root, '03_artefactos', 'skills');

type Registry = {entries?: Array<{skill_id?: string}>; entries_inline?: string[]};
type TemplateRegistry = {templates?: TemplateRegistryEntry[]};

function collectSkillIds(path: string): Set<string> {
  const ids = new Set<string>();
  if (!existsSync(path)) return ids;
  const raw = parse(readFileSync(path, 'utf8')) as Registry;
  if (Array.isArray(raw.entries)) {
    for (const e of raw.entries) if (typeof e?.skill_id === 'string') ids.add(e.skill_id);
  }
  // v2 registry also nests skill_id under sections; scan text as fallback.
  const text = readFileSync(path, 'utf8');
  for (const m of text.matchAll(/^\s*-\s*skill_id:\s*([A-Za-z0-9_-]+)\s*$/gm)) {
    if (m[1]) ids.add(m[1]);
  }
  return ids;
}

const v3Ids = collectSkillIds(V3_REGISTRY);
const v2Ids = collectSkillIds(V2_REGISTRY);
const artifactText = existsSync(ARTIFACT_REGISTRY) ? readFileSync(ARTIFACT_REGISTRY, 'utf8') : '';
const templateRegistry = existsSync(TEMPLATE_REGISTRY)
  ? (parse(readFileSync(TEMPLATE_REGISTRY, 'utf8')) as TemplateRegistry)
  : {};
const templates = new Map(
  (templateRegistry.templates ?? []).map((entry) => [entry.template_id ?? '', entry]),
);
const deliverableDefinitions = loadDeliverableDefinitions(root);
const deliverables = new Map(deliverableDefinitions.map((item) => [item.deliverable_id, item]));

function skillExists(id: string): boolean {
  if (v3Ids.has(id) || v2Ids.has(id)) return true;
  // direct skill dir (covers vendor + unregistered skills with a SKILL.md)
  return existsSync(join(SKILLS_DIR, id, 'SKILL.md'));
}

function assetExists(id: string): boolean {
  // Asset ids are schema basenames (e.g. brand-os-v1). A real binding requires
  // BOTH the materialized schema file AND a registry entry. Forward-contract
  // (registry listing without a file) fails this gate — materialization closes it.
  const schemaFile = join(MW_DIR, '_schema', 'artifacts', `${id}.schema.ts`);
  return existsSync(schemaFile) && artifactText.includes(`${id}.schema.ts`);
}

function templateExists(id: string): boolean {
  const entry = templates.get(id);
  if (!entry || entry.design_profile !== 'metodologia-html-v7' || !existsSync(DESIGN_PROFILE)) {
    return false;
  }
  return [entry.markdown_template_ref, entry.html_template_ref, entry.data_schema_ref].every(
    (ref) => typeof ref === 'string' && existsSync(join(root, ref)),
  );
}

const errors: string[] = [];
let checked = 0;
const workflows: MultimediaWorkflow[] = [];

const stageDirs = readdirSync(MW_DIR).filter((d) => d.startsWith('p0'));
for (const dir of stageDirs) {
  const wfPath = join(MW_DIR, dir, 'workflow.yml');
  if (!existsSync(wfPath)) continue;
  checked++;
  let wf;
  try {
    wf = MultimediaWorkflowSchema.parse(parse(readFileSync(wfPath, 'utf8')));
    workflows.push(wf);
  } catch (e) {
    errors.push(`MW-CAP-01 ${dir}: schema parse failed — ${(e as Error).message.split('\n')[0]}`);
    continue;
  }
  const brief = wf.brief;
  if (!brief || brief.outputs.length === 0 || brief.deliverables.length === 0) {
    errors.push(`MW-CAP-02 ${dir}: missing or empty brief.outputs/deliverables (BLUF)`);
  }
  const cap = wf.capability_map;
  if (!cap || cap.skills.length === 0) {
    errors.push(`MW-CAP-03 ${dir}: missing or empty capability_map.skills`);
  } else {
    for (const s of cap.skills) {
      if (!skillExists(s)) errors.push(`MW-CAP-03 ${dir}: skill does not resolve: ${s}`);
    }
  }
  if (!cap || cap.assets.length === 0) {
    errors.push(`MW-CAP-04 ${dir}: missing or empty capability_map.assets`);
  } else {
    for (const a of cap.assets) {
      if (!assetExists(a)) errors.push(`MW-CAP-04 ${dir}: asset not in artifact-registry: ${a}`);
    }
  }
  const templateIds = [
    ...wf.outputs.map((output) => output.template_id),
    ...wf.execution_steps.map((step) => step.template_id),
  ];
  for (const id of templateIds) {
    if (!templateExists(id)) errors.push(`MW-CAP-05 ${dir}: template does not resolve: ${id}`);
  }
  for (const step of wf.execution_steps) {
    const assigned = [step.primary_skill, ...step.optional_skills];
    for (const skill of assigned) {
      if (!skillExists(skill))
        errors.push(`MW-CAP-06 ${dir}: step skill does not resolve: ${skill}`);
      if (!cap?.skills.includes(skill)) {
        errors.push(`MW-CAP-06 ${dir}: step skill absent from capability_map: ${skill}`);
      }
    }
  }
  errors.push(...validateTemplateAcceptanceGates(wf, templates));
  errors.push(
    ...validateWorkflowDeliverables(root, wf, deliverables).map((issue) => `MW-CAP-08 ${issue}`),
  );
}
errors.push(
  ...validateCatalogCoverage(workflows, deliverableDefinitions).map(
    (issue) => `MW-CAP-08 ${issue}`,
  ),
);

if (
  process.argv[1] &&
  realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1])
) {
  if (errors.length > 0) {
    console.error(errors.join('\n'));
    process.exitCode = 1;
  } else {
    console.info(
      `PASS MULTIMEDIA CAPABILITIES: ${checked} stages verified (skills + assets + steps + templates + gates resolve).`,
    );
  }
}
