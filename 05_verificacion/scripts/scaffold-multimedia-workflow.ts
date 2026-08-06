/**
 * scaffold-multimedia-workflow.ts — D3 of multimedia-workflows plan.
 *
 * CLI: `pnpm mw:scaffold --from <html-path> [--all] [--only PNN] [--dry-run]`
 * (default: --all)
 *
 * Reads the MIA-MEDIA-LIB-2.0.0 HTML ebook, extracts each prompt P00–P09
 * verbatim (SPEC 7 sections, 3 variables, O/I/A/R, model, no-regression, DoD,
 * metadata), binds it to the B2 work-product table, and materializes 5 files
 * per workflow dir under `02_proceso/workflows/multimedia/pNN-{slug}/`:
 *   - workflow.yml        (source of truth, validated by MultimediaWorkflowSchema)
 *   - prompt-spec.md      (frontmatter + verbatim SPEC, validated by PromptSpecFrontmatterSchema)
 *   - task-template.yaml  (TaskContractSchema skeleton)
 *   - build.ts            (thin shim → _runner/run.ts)
 *   - notebooklm-binding.yml
 *
 * Idempotent: refuses to overwrite existing files unless --force. [CÓDIGO]
 *
 * Fail-closed: if a prompt's SPEC/variables/model cannot be extracted, the
 * script reports the prompt and skips it (no inference substituted for the
 * absent section — escalation, not assumption). [CONFIG]
 *
 * Source: `MIA-MEDIA-LIB-2.0.0` (MetodologIA Universal Multimedia Creation
 * Library, v2.0.0-candidato). [DOC]
 */
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {SCAFFOLD_EPOCH} from './lib/deterministic-epoch.ts';

interface B2Entry {
  nn: string;
  slug: string;
  command: string;
  workProductState: string;
  outputs: string[];
  gates: string[];
  nextWorkflow: string | null;
  responsable: 'lead' | 'guardian' | 'governance';
  gateTarget: string;
  tags: string[];
}

const B2_TABLE: B2Entry[] = [
  {
    nn: 'P00',
    slug: 'definir-sistema',
    command: '/definir-sistema',
    workProductState: 'DEFINED',
    outputs: ['Brand OS', 'Calibration sample', 'Pilot plan'],
    gates: ['G13', 'G14'],
    nextWorkflow: 'P01',
    responsable: 'lead',
    gateTarget: 'G13',
    tags: ['identity', 'voice', 'brand-os', 'pilot'],
  },
  {
    nn: 'P01',
    slug: 'curar-material',
    command: '/curar-material',
    workProductState: 'CLASSIFIED',
    outputs: ['Capture Card', 'Triage Record', 'Digest/Shortlist'],
    gates: ['G14'],
    nextWorkflow: 'P02',
    responsable: 'lead',
    gateTarget: 'G14',
    tags: ['documentary', 'curation', 'capture'],
  },
  {
    nn: 'P02',
    slug: 'investigar',
    command: '/investigar',
    workProductState: 'DISCOVERED',
    outputs: ['Claim Register', 'Opportunity Map', 'Question Bank'],
    gates: ['G14'],
    nextWorkflow: 'P03',
    responsable: 'lead',
    gateTarget: 'G14',
    tags: ['research', 'claims', 'opportunity'],
  },
  {
    nn: 'P03',
    slug: 'crear-brief',
    command: '/crear-brief',
    workProductState: 'DIRECTION_APPROVED',
    outputs: ['Brief/Campaign Map', 'A/B concepts', 'Definition of Ready'],
    gates: ['G13', 'G14'],
    nextWorkflow: 'P04',
    responsable: 'lead',
    gateTarget: 'G13',
    tags: ['strategy', 'brief', 'campaign'],
  },
  {
    nn: 'P04',
    slug: 'calendarizar',
    command: '/calendarizar',
    workProductState: 'DEFINED',
    outputs: ['Editorial Calendar', 'Board', 'Batch Plan'],
    gates: ['G14'],
    nextWorkflow: 'P05',
    responsable: 'lead',
    gateTarget: 'G14',
    tags: ['operations', 'calendar', 'batching'],
  },
  {
    nn: 'P05',
    slug: 'disenar-pieza',
    command: '/disenar-pieza',
    workProductState: 'SPEC_APPROVED',
    outputs: ['Creative Spec', 'Continuity Bible', 'Asset Map'],
    gates: ['MW_SPEC_APPROVED', 'G14'],
    nextWorkflow: 'P06',
    responsable: 'lead',
    gateTarget: 'G14',
    tags: ['design', 'spec', 'continuity', 'asset-map'],
  },
  {
    nn: 'P06',
    slug: 'crear-activos',
    command: '/crear-activos',
    workProductState: 'BUILD_VALIDATED',
    outputs: ['Asset Package', 'Asset Manifest', 'Capability Report'],
    gates: ['MW_ASSET_REVIEW', 'G14'],
    nextWorkflow: 'P07',
    responsable: 'lead',
    gateTarget: 'G14',
    tags: ['assets', 'build', 'capability'],
  },
  {
    nn: 'P07',
    slug: 'revisar',
    command: '/revisar',
    workProductState: 'REVIEW_SHOTS_APPROVED',
    outputs: ['Review Report', 'Verdict', 'Top-5 changes'],
    gates: ['G14'],
    nextWorkflow: 'P08',
    responsable: 'guardian',
    gateTarget: 'G14',
    tags: ['review', 'verdict', 'guardian'],
  },
  {
    nn: 'P08',
    slug: 'editar',
    command: '/editar',
    workProductState: 'POSTPRODUCTION_VALIDATED',
    outputs: ['Edit Candidate', 'EDL', 'Export Matrix'],
    gates: ['MW_EDIT_APPROVED', 'G14'],
    nextWorkflow: 'P09',
    responsable: 'lead',
    gateTarget: 'G14',
    tags: ['edit', 'edl', 'postproduction'],
  },
  {
    nn: 'P09',
    slug: 'distribuir',
    command: '/distribuir',
    workProductState: 'READY',
    outputs: ['Platform Package', 'Publication Record', 'Learning Report'],
    gates: ['MW_DISTRIBUTION_AUTHORIZED', 'G15', 'G17'],
    nextWorkflow: null,
    responsable: 'governance',
    gateTarget: 'G15',
    tags: ['distribution', 'publish', 'learning'],
  },
];

interface PromptExtract {
  nn: string;
  command: string;
  titleEs: string;
  titleEn: string;
  titlePt: string;
  purposeEs: string;
  purposeEn: string;
  purposePt: string;
  discipline: string;
  phase: string;
  specEs: string;
  specEn: string;
  specPt: string;
  variables: Array<{name: string; default: string}>;
  modelPreferred: string;
  modelAlt: string;
  modelAvoid: string;
  modelFullEs: string;
  noRegressionEs: string;
  dodEs: string;
  acceptanceEs: string;
  sourceBasisEs: string;
  metaTags: string;
}

const stripTags = (s: string): string =>
  s
    .replace(/<[^>]*>/gu, '')
    .replace(/&amp;/gu, '&')
    .replace(/&lt;/gu, '<')
    .replace(/&gt;/gu, '>')
    .replace(/&quot;/gu, '"')
    .replace(/&#39;/gu, "'")
    .replace(/&nbsp;/gu, ' ')
    .trim();

const extractSpan = (block: string, lang: string): string => {
  const re = new RegExp(`<span class="${lang}">([\\s\\S]*?)</span>`, 'u');
  const m = re.exec(block);
  return m && m[1] !== undefined ? stripTags(m[1]) : '';
};

/** Decode HTML entities + preserve newlines in SPEC code spans. */
const decodeSpan = (block: string, lang: string): string => {
  const re = new RegExp(`<span class="${lang}">([\\s\\S]*?)</span>`, 'u');
  const m = re.exec(block);
  if (!m || m[1] === undefined) return '';
  return m[1]
    .replace(/&amp;/gu, '&')
    .replace(/&lt;/gu, '<')
    .replace(/&gt;/gu, '>')
    .replace(/&quot;/gu, '"')
    .replace(/&#39;/gu, "'")
    .replace(/&nbsp;/gu, ' ')
    .trim();
};

const extractPrompt = (html: string, nn: string): PromptExtract | null => {
  const articleRe = new RegExp(
    `<article[^>]*id="MIA-MEDIA-${nn}"[^>]*>([\\s\\S]*?)</article>`,
    'u',
  );
  const am = articleRe.exec(html);
  if (!am || am[1] === undefined) return null;
  const art = am[1];

  const commandMatch = /<div class="card-num">MIA-MEDIA-[A-Z0-9]+ · (\/[\w-]+)<\/div>/u.exec(
    art,
  );
  const command = commandMatch?.[1] ?? '';

  const h3Match = /<h3>([\s\S]*?)<\/h3>/u.exec(art);
  const h3 = h3Match?.[1] ?? '';
  const titleEs = extractSpan(h3, 'es');
  const titleEn = extractSpan(h3, 'en');
  const titlePt = extractSpan(h3, 'pt');

  // First <p> after <h3> is the purpose.
  const pMatch = /<h3>[\s\S]*?<\/h3>\s*<p>([\s\S]*?)<\/p>/u.exec(art);
  const p = pMatch?.[1] ?? '';
  const purposeEs = extractSpan(p, 'es');
  const purposeEn = extractSpan(p, 'en');
  const purposePt = extractSpan(p, 'pt');

  // tag-row: first two tags = discipline + phase (es).
  const tagRowMatch = /<div class="tag-row">([\s\S]*?)<\/div>\s*<div/u.exec(art);
  const tagRow = tagRowMatch?.[1] ?? '';
  const tagEs = (text: string): string => {
    const re = /<span class="es">([^<]*)<\/span>/u;
    const m = re.exec(text);
    return m && m[1] !== undefined ? m[1].trim() : '';
  };
  const tagMatches = tagRow.match(/<span class="tag">[\s\S]*?<\/span>/gu) ?? [];
  const discipline = tagEs(tagMatches[0] ?? '');
  const phase = tagEs(tagMatches[1] ?? '');

  // SPEC panel.
  const specRe = /<div class="prompt-block"[^>]*data-block="spec"[^>]*>[\s\S]*?<code>([\s\S]*?)<\/code>/u;
  const specBlock = specRe.exec(art)?.[1] ?? '';
  const specEs = decodeSpan(specBlock, 'es');
  const specEn = decodeSpan(specBlock, 'en');
  const specPt = decodeSpan(specBlock, 'pt');

  // parametros panel → variables (es span).
  const paramRe = /<div class="prompt-block"[^>]*data-block="parametros"[^>]*>[\s\S]*?<code>([\s\S]*?)<\/code>/u;
  const paramBlock = paramRe.exec(art)?.[1] ?? '';
  const paramEs = decodeSpan(paramBlock, 'es');
  const variables = Array.from(
    paramEs.matchAll(/\{\{(\S+?)\s*=\s*"([^"]*)"\}\}/gu),
  ).map((m) => ({name: m[1] ?? '', default: m[2] ?? ''}));

  // callouts.
  const calloutEs = (blockId: string): string => {
    const re = new RegExp(
      `data-block="${blockId}"[^>]*>[\\s\\S]*?<span class="es">([\\s\\S]*?)</span>`,
      'u',
    );
    const m = re.exec(art);
    return m && m[1] !== undefined ? stripTags(m[1]) : '';
  };
  const modelFullEs = calloutEs('modelo');
  const noRegressionEs = calloutEs('no-regression');
  const dodEs = calloutEs('dod');
  const acceptanceEs = calloutEs('criterios');
  const sourceBasisEs = calloutEs('source-basis');

  // model parse: "Preferido: A. Alternativa: B. C. Disponibilidad..."
  const modelRe = /Preferido:\s*(.+?)\.\s*Alternativa:\s*(.+?)\.\s*(.+?)\.\s*Disponibilidad/u;
  const mm = modelRe.exec(modelFullEs);
  const modelPreferred = mm?.[1]?.trim() ?? modelFullEs;
  const modelAlt = mm?.[2]?.trim() ?? 'asistente general con buen manejo de contexto';
  const modelAvoid = mm?.[3]?.trim() ?? 'generador multimedia como único decisor estratégico';

  // metadata tag-row.
  const metaRe = /<div class="tag-row" data-block="metadata">([\s\S]*?)<\/div>/u;
  const metaBlock = metaRe.exec(art)?.[1] ?? '';
  const metaTagsMatch = /<span class="es">([^<]*)<\/span>/u.exec(metaBlock);
  const metaTags = metaTagsMatch?.[1]?.trim() ?? '';

  return {
    nn,
    command,
    titleEs,
    titleEn,
    titlePt,
    purposeEs,
    purposeEn,
    purposePt,
    discipline,
    phase,
    specEs,
    specEn,
    specPt,
    variables,
    modelPreferred,
    modelAlt,
    modelAvoid,
    modelFullEs,
    noRegressionEs,
    dodEs,
    acceptanceEs,
    sourceBasisEs,
    metaTags,
  };
};

const slugify = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '')
    .slice(0, 40);

/** Split SPEC es into 7 sections by canonical headers. */
const SECTIONS_ES = [
  'SITUACIÓN',
  'PEDIDO',
  'EJECUCIÓN',
  'LÍMITES Y CASOS BORDE',
  'CRITERIO',
  'DEFINITION OF DONE',
  'FALLBACK',
] as const;

/** Frontmatter enum values (underscores) — distinct from the SPEC body headers (spaces). */
const SECTIONS_ENUM = [
  'SITUACIÓN',
  'PEDIDO',
  'EJECUCIÓN',
  'LÍMITES_Y_CASOS_BORDE',
  'CRITERIO',
  'DEFINITION_OF_DONE',
  'FALLBACK',
] as const;

const splitSections = (spec: string): Record<string, string> => {
  const out: Record<string, string> = {};
  for (let i = 0; i < SECTIONS_ES.length; i++) {
    const header = SECTIONS_ES[i];
    if (!header) continue;
    const next = SECTIONS_ES[i + 1];
    const startIdx = spec.indexOf(header);
    if (startIdx === -1) {
      out[header] = '';
      continue;
    }
    const bodyStart = startIdx + header.length;
    const endIdx = next ? spec.indexOf(next, bodyStart) : spec.length;
    out[header] = (endIdx === -1 ? spec.slice(bodyStart) : spec.slice(bodyStart, endIdx)).trim();
  }
  return out;
};

/** Extract numbered modes from the PEDIDO section. */
const extractModes = (pedido: string): Array<{id: string; name: string; description: string}> => {
  const lines = pedido.split('\n');
  const modes: Array<{id: string; name: string; description: string}> = [];
  for (const line of lines) {
    const m = /^\s*\d+\.\s*(.+?)\s*$/u.exec(line.trim());
    if (m && m[1] !== undefined) {
      const name = m[1].replace(/\.$/u, '').trim();
      modes.push({id: slugify(name), name, description: name});
    }
  }
  if (modes.length === 0) {
    modes.push({id: 'single', name: 'single-mode', description: 'Prompt executes as a single stage.'});
  }
  return modes;
};

const yq = (s: string): string => s.replace(/"/gu, "'");

const generateWorkflowYml = (entry: B2Entry, ex: PromptExtract): string => {
  const sections = splitSections(ex.specEs);
  const modes = extractModes(sections['PEDIDO'] ?? '');
  const noReg = ex.noRegressionEs
    .split(/[;·]/u)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const dod = ex.dodEs
    .split(/[;·]/u)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const fallback = sections['FALLBACK'] ?? ex.dodEs;

  const lines: string[] = [];
  lines.push(`schema_version: multimedia-workflow-v1`);
  lines.push(`workflow_id: ${entry.nn}`);
  lines.push(`command: ${entry.command}`);
  lines.push(`title: ${JSON.stringify(ex.titleEs)}`);
  lines.push(`purpose: ${JSON.stringify(ex.purposeEs)}`);
  lines.push(`discipline: ${JSON.stringify(ex.discipline)}`);
  lines.push(`phase: ${JSON.stringify(ex.phase)}`);
  lines.push(`tags:`);
  for (const t of entry.tags) lines.push(`  - ${t}`);
  lines.push(`modes:`);
  for (const m of modes) {
    lines.push(`  - id: ${m.id}`);
    lines.push(`    name: ${JSON.stringify(yq(m.name))}`);
    lines.push(`    description: ${JSON.stringify(yq(m.description))}`);
  }
  lines.push(`inputs:`);
  const prev = B2_TABLE.find((e) => e.nextWorkflow === entry.nn);
  if (prev) {
    lines.push(`  - p${prev.nn.slice(1)}-${prev.slug}/workflow.yml`);
  } else {
    lines.push(`  []`);
  }
  lines.push(`outputs:`);
  for (const o of entry.outputs) {
    lines.push(`  - artifact: ${JSON.stringify(o)}`);
    lines.push(`    schema_ref: _assets/artifact-registry.md`);
    lines.push(`    required: true`);
  }
  lines.push(`work_product_state: ${entry.workProductState}`);
  lines.push(`gates:`);
  for (const g of entry.gates) lines.push(`  - ${g}`);
  lines.push(`next_workflow: ${entry.nextWorkflow ?? 'null'}`);
  lines.push(`task_template_ref: task-template.yaml`);
  lines.push(`prompt_spec_ref: prompt-spec.md`);
  lines.push(`model:`);
  lines.push(`  preferred: ${JSON.stringify(yq(ex.modelPreferred))}`);
  lines.push(`  alt: ${JSON.stringify(yq(ex.modelAlt))}`);
  lines.push(`  avoid: ${JSON.stringify(yq(ex.modelAvoid))}`);
  lines.push(`no_regression:`);
  for (const n of noReg) lines.push(`  - ${JSON.stringify(yq(n))}`);
  if (noReg.length === 0) lines.push(`  - ${JSON.stringify(yq(ex.noRegressionEs || ex.dodEs))}`);
  lines.push(`dod:`);
  for (const d of dod) lines.push(`  - ${JSON.stringify(yq(d))}`);
  if (dod.length === 0) lines.push(`  - ${JSON.stringify(yq(ex.dodEs))}`);
  lines.push(`fallback: ${JSON.stringify(yq(fallback))}`);
  lines.push(`metadata:`);
  lines.push(`  source_id: MIA-MEDIA-LIB-2.0.0`);
  lines.push(`  version: 2.0.0-candidato`);
  lines.push(`  status: candidate`);
  lines.push(`  locale:`);
  lines.push(`    - es`);
  lines.push(`    - en`);
  lines.push(`    - pt`);
  return `${lines.join('\n')}\n`;
};

const generatePromptSpec = (entry: B2Entry, ex: PromptExtract): string => {
  const fm: string[] = [];
  fm.push(`---`);
  fm.push(`schema_version: prompt-spec-v1`);
  fm.push(`prompt_id: ${entry.nn}`);
  fm.push(`command: ${entry.command}`);
  fm.push(`title: ${JSON.stringify(ex.titleEs)}`);
  fm.push(`purpose: ${JSON.stringify(ex.purposeEs)}`);
  fm.push(`variables:`);
  for (const v of ex.variables) {
    fm.push(`  - name: ${v.name}`);
    fm.push(`    default: ${JSON.stringify(yq(v.default))}`);
  }
  fm.push(`evidence_tuple:`);
  fm.push(`  observado: true`);
  fm.push(`  inferido: true`);
  fm.push(`  supuesto: true`);
  fm.push(`  dato_requerido: true`);
  fm.push(`sections:`);
  for (const s of SECTIONS_ENUM) fm.push(`  - ${s}`);
  fm.push(`model:`);
  fm.push(`  preferred: ${JSON.stringify(yq(ex.modelPreferred))}`);
  fm.push(`  alt: ${JSON.stringify(yq(ex.modelAlt))}`);
  fm.push(`  avoid: ${JSON.stringify(yq(ex.modelAvoid))}`);
  fm.push(`metadata:`);
  fm.push(`  source_id: MIA-MEDIA-LIB-2.0.0`);
  fm.push(`  version: 2.0.0-candidato`);
  fm.push(`  status: candidate`);
  fm.push(`  locale:`);
  fm.push(`    - es`);
  fm.push(`    - en`);
  fm.push(`    - pt`);
  fm.push(`---`);
  fm.push(``);
  fm.push(`# ${ex.titleEs} · ${entry.nn}`);
  fm.push(``);
  fm.push(`> Provenance: \`MIA-MEDIA-LIB-2.0.0\` v2.0.0-candidato · Estado: candidate · ${ex.metaTags} [DOC]`);
  fm.push(``);
  fm.push(`## ES — SPEC verbatim`);
  fm.push(``);
  fm.push('```text');
  fm.push(ex.specEs);
  fm.push('```');
  fm.push(``);
  fm.push(`## EN — SPEC verbatim`);
  fm.push(``);
  fm.push('```text');
  fm.push(ex.specEn);
  fm.push('```');
  fm.push(``);
  fm.push(`## PT — SPEC verbatim`);
  fm.push(``);
  fm.push('```text');
  fm.push(ex.specPt);
  fm.push('```');
  fm.push(``);
  fm.push(`## Evidence tuple (O/I/A/R)`);
  fm.push(``);
  fm.push(ex.sourceBasisEs);
  fm.push(``);
  fm.push(`## Modelo recomendado`);
  fm.push(``);
  fm.push(ex.modelFullEs);
  fm.push(``);
  fm.push(`## Criterios de aceptación`);
  fm.push(``);
  fm.push(ex.acceptanceEs);
  fm.push(``);
  fm.push(`## No-regresión`);
  fm.push(``);
  fm.push(ex.noRegressionEs);
  fm.push(``);
  fm.push(`## Definition of Done`);
  fm.push(``);
  fm.push(ex.dodEs);
  fm.push(``);
  return fm.join('\n');
};

const generateTaskTemplate = (entry: B2Entry, ex: PromptExtract): string => {
  const sections = splitSections(ex.specEs);
  const limits = (sections['LÍMITES Y CASOS BORDE'] ?? '')
    .split('\n')
    .map((l) => l.replace(/^-\s*/u, '').trim())
    .filter((l) => l.length > 0)
    .slice(0, 8);
  const writeSetPrefix =
    entry.responsable === 'guardian' ? 'guardian/multimedia' : `03_artefactos/content/multimedia`;
  const lines: string[] = [];
  lines.push(`schema_version: task-contract-v1`);
  lines.push(`task_id: TASK-mw-${entry.nn.toLowerCase()}-000`);
  lines.push(`project_id: null`);
  lines.push(`objetivo: ${JSON.stringify(yq(ex.purposeEs)).slice(0, 500)}`);
  lines.push(`repo: metodologia-frames-agent-os`);
  lines.push(`responsable: ${entry.responsable}`);
  lines.push(`inputs:`);
  lines.push(`  - 02_proceso/workflows/multimedia/p${entry.nn.slice(1)}-${entry.slug}/prompt-spec.md`);
  lines.push(`write_set:`);
  lines.push(`  - ${writeSetPrefix}/p${entry.nn.slice(1)}-${entry.slug}/**`);
  lines.push(`no_objetivos:`);
  for (const l of limits) lines.push(`  - ${JSON.stringify(yq(l)).slice(0, 200)}`);
  if (limits.length === 0) lines.push(`  - ${JSON.stringify(yq('No inventar identidad, consentimiento, derechos ni resultados.'))}`);
  lines.push(`done: ${JSON.stringify(yq(ex.dodEs)).slice(0, 500)}`);
  lines.push(`validacion: "pnpm mw:run ${entry.nn} --dry-run && pnpm check:tasks"`);
  lines.push(`gaps: []`);
  lines.push(`state: INTAKE`);
  lines.push(`created_from_route: R3-LOOSE`);
  lines.push(`gate_target: ${JSON.stringify(entry.gateTarget)}`);
  lines.push(`spawned_subtasks: []`);
  lines.push(`parent_task_id: null`);
  lines.push(`evidence_tags:`);
  lines.push(`  prompt_source: DOC`);
  lines.push(`created_at: ${SCAFFOLD_EPOCH}`);
  lines.push(`updated_at: ${SCAFFOLD_EPOCH}`);
  return `${lines.join('\n')}\n`;
};

const generateBuildTs = (entry: B2Entry): string =>
  `import {runWorkflow} from '../_runner/run.ts';\n\nrunWorkflow('${entry.nn}').catch((err) => {\n  console.error(err);\n  process.exitCode = 1;\n});\n`;

const generateNotebookBinding = (entry: B2Entry): string => {
  const lines: string[] = [];
  lines.push(`schema_version: 1`);
  lines.push(`workflow_id: ${entry.nn}`);
  lines.push(`entrypoints:`);
  lines.push(`  - workflows/multimedia/p${entry.nn.slice(1)}-${entry.slug}/build.ts`);
  lines.push(`notebooklm:`);
  lines.push(`  contract_ref: registries/notebooks/work-unit-binding-contract.yml`);
  lines.push(`  adapter_id: notebooklm-grounding-readonly-v1`);
  lines.push(`  binding_id: null`);
  lines.push(`  purpose: "Bind ${entry.nn} prompt-spec to NotebookLM grounding when sources are mapped."`);
  lines.push(`  binding:`);
  lines.push(`    mode: none`);
  lines.push(`    reason_code: binding_not_selected`);
  lines.push(`    locator_material_present: false`);
  lines.push(`  coverage:`);
  lines.push(`    status: coverage_gap`);
  lines.push(`    expected_source_ids: []`);
  lines.push(`    covered_source_ids: []`);
  lines.push(`    missing_source_ids: []`);
  return `${lines.join('\n')}\n`;
};

const parseArgs = (argv: string[]): {from: string; all: boolean; only: string | undefined; dryRun: boolean; force: boolean} => {
  const out = {from: '', all: false, only: undefined as string | undefined, dryRun: false, force: false};
  for (const arg of argv.slice(2)) {
    if (arg.startsWith('--from=')) out.from = arg.slice('--from='.length);
    else if (arg === '--all') out.all = true;
    else if (arg.startsWith('--only=')) out.only = arg.slice('--only='.length);
    else if (arg === '--dry-run') out.dryRun = true;
    else if (arg === '--force') out.force = true;
  }
  if (!out.all && out.only === undefined) out.all = true;
  return out;
};

const ROOT = process.cwd();
const MULTIMEDIA_DIR = resolve(ROOT, '02_proceso/workflows/multimedia');

const main = (): void => {
  const args = parseArgs(process.argv);
  if (args.from.length === 0) {
    console.error('[FAIL] --from <html-path> required');
    process.exitCode = 1;
    return;
  }
  const htmlPath = resolve(args.from);
  if (!existsSync(htmlPath)) {
    console.error(`[FAIL] HTML source not found: ${htmlPath}`);
    process.exitCode = 1;
    return;
  }
  const html = readFileSync(htmlPath, 'utf8');

  const targets = args.all
    ? B2_TABLE
    : B2_TABLE.filter((e) => e.nn === args.only);
  if (targets.length === 0) {
    console.error(`[FAIL] no prompts matched --only=${args.only ?? '(none)'}`);
    process.exitCode = 1;
    return;
  }

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const entry of targets) {
    const ex = extractPrompt(html, entry.nn);
    if (
      ex === null ||
      ex.specEs.length === 0 ||
      ex.variables.length !== 3 ||
      ex.modelFullEs.length === 0
    ) {
      console.error(
        `[SKIP] ${entry.nn}: extraction incomplete (spec=${ex?.specEs.length ?? 0} vars=${ex?.variables.length ?? 0} model=${ex?.modelFullEs.length ?? 0}) — fail-closed, human amend`,
      );
      failed++;
      continue;
    }
    const dir = resolve(MULTIMEDIA_DIR, `p${entry.nn.slice(1)}-${entry.slug}`);
    const files: Array<{name: string; content: string}> = [
      {name: 'workflow.yml', content: generateWorkflowYml(entry, ex)},
      {name: 'prompt-spec.md', content: generatePromptSpec(entry, ex)},
      {name: 'task-template.yaml', content: generateTaskTemplate(entry, ex)},
      {name: 'build.ts', content: generateBuildTs(entry)},
      {name: 'notebooklm-binding.yml', content: generateNotebookBinding(entry)},
    ];
    for (const f of files) {
      const path = resolve(dir, f.name);
      if (existsSync(path) && !args.force) {
        console.info(`[SKIP] ${entry.nn}/${f.name} exists (use --force to overwrite)`);
        skipped++;
        continue;
      }
      if (args.dryRun) {
        console.info(`[DRY] ${entry.nn}/${f.name} would write ${f.content.length} bytes`);
        continue;
      }
      mkdirSync(dir, {recursive: true});
      writeFileSync(path, f.content, 'utf8');
      created++;
      console.info(`[WROTE] ${entry.nn}/${f.name}`);
    }
  }
  console.info(
    `MW:SCAFFOLD summary: created=${created} skipped=${skipped} failed=${failed} dry_run=${args.dryRun}`,
  );
};

main();