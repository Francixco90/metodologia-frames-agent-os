/**
 * check-multimedia-capabilities.ts — deterministic capability_map + BLUF
 * enforcement for the multimedia P00–P09 chain.
 *
 * CLI: `pnpm verify:multimedia`
 *
 * For each `02_proceso/workflows/multimedia/pNN-{slug}/workflow.yml`:
 *   MW-CAP-01: workflow parses against `multimedia-workflow-v1`.
 *   MW-CAP-02: `brief` present with non-empty outputs + deliverables (BLUF enforce).
 *   MW-CAP-03: `capability_map.skills` each resolve against the creation-v3
 *              skill registry, the v2 skill registry, or a direct skill dir
 *              at `03_artefactos/skills/<id>/SKILL.md` (vendor skills excluded
 *              from registries are reachable via the dir check).
 *   MW-CAP-04: `capability_map.assets` each resolve against the artifact
 *              registry (`_assets/artifact-registry.md`) by schema basename.
 *
 * Fail-closed: any unresolved binding fails the gate. The generator
 * (`render-schematic-html.ts`) depends on the same contract, so a green gate
 * implies regenerable schematics. [CÓDIGO]
 */
import {readFileSync, readdirSync, statSync, existsSync} from 'node:fs';
import {join} from 'node:path';
import {parse} from 'yaml';

import {MultimediaWorkflowSchema} from '../../02_proceso/workflows/multimedia/_schema/workflow-v1.schema.ts';

const root = process.cwd();
const MW_DIR = join(root, '02_proceso', 'workflows', 'multimedia');
const ARTIFACT_REGISTRY = join(MW_DIR, '_assets', 'artifact-registry.md');
const V3_REGISTRY = join(root, '04_estado', 'registries', 'skills', 'creation-v3-skill-registry.yml');
const V2_REGISTRY = join(root, '04_estado', 'registries', 'skills', 'skill-registry.yml');
const SKILLS_DIR = join(root, '03_artefactos', 'skills');

type Registry = {entries?: Array<{skill_id?: string}>; entries_inline?: string[]};

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

function skillExists(id: string): boolean {
  if (v3Ids.has(id) || v2Ids.has(id)) return true;
  // direct skill dir (covers vendor + unregistered skills with a SKILL.md)
  return existsSync(join(SKILLS_DIR, id, 'SKILL.md'));
}

function assetExists(id: string): boolean {
  // asset ids are schema basenames (e.g. brand-os-v1); registry lists them as
  // `…/<id>.schema.ts` or `<id>.schema.ts`. Substring match is deterministic.
  return artifactText.includes(`${id}.schema.ts`);
}

const errors: string[] = [];
let checked = 0;

const stageDirs = readdirSync(MW_DIR).filter((d) => d.startsWith('p0'));
for (const dir of stageDirs) {
  const wfPath = join(MW_DIR, dir, 'workflow.yml');
  if (!existsSync(wfPath)) continue;
  checked++;
  let wf;
  try {
    wf = MultimediaWorkflowSchema.parse(parse(readFileSync(wfPath, 'utf8')));
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
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.info(
    `PASS MULTIMEDIA CAPABILITIES: ${checked} stages verified (capability_map + BLUF bindings resolve).`,
  );
}