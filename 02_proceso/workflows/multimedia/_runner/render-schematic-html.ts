/**
 * render-schematic-html.ts — brand-ready HTML WOW schematic generator (P00–P09).
 *
 * CLI: `pnpm mw:render-schematics` (or `node --import tsx .../render-schematic-html.ts`)
 *
 * Template-driven, deterministic, token-efficient: ONE template
 * (`_assets/schematic-template.html`) + this generator reads each
 * `pNN-{slug}/workflow.yml` (brief + capability_map + gates + state) and emits
 * a single-file brand-ready executive one-pager per stage to
 * `pNN-{slug}/schematic.html`.
 *
 * Source of truth = `workflow.yml`. Regenerable: re-running overwrites the 10
 * HTML files identically (modulo timestamp-free content). Offline-only: no
 * CDN, no external fonts (system-ui fallback), CSS animations (no GSAP
 * dependency at view time). [CÓDIGO]
 *
 * Output state: `RENDERED_DRAFT`. The render NEVER grants HUMAN_APPROVED,
 * READY, or PUBLISHED — recorded in the HTML `<meta name="state">` + footer.
 *
 * Source: `MIA-MEDIA-LIB-2.0.0`. [DOC]
 */
import {readFileSync, readdirSync, writeFileSync, existsSync} from 'node:fs';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parse} from 'yaml';

import {MultimediaWorkflowSchema} from '../_schema/workflow-v1.schema.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const MW_DIR = join(HERE, '..');
const TEMPLATE_PATH = join(MW_DIR, '_assets', 'schematic-template.html');

// Fixed chain node labels (P00–P09). SVG chain is fixed; only active node
// highlight + injected data change per stage. Token-efficient + deterministic.
const CHAIN: {id: string; slug: string}[] = [
  {id: 'P00', slug: 'definir-sistema'},
  {id: 'P01', slug: 'curar-material'},
  {id: 'P02', slug: 'investigar'},
  {id: 'P03', slug: 'crear-brief'},
  {id: 'P04', slug: 'calendarizar'},
  {id: 'P05', slug: 'disenar-pieza'},
  {id: 'P06', slug: 'crear-activos'},
  {id: 'P07', slug: 'revisar'},
  {id: 'P08', slug: 'editar'},
  {id: 'P09', slug: 'distribuir'},
];

const NODE_W = 88;
const NODE_H = 70;
const NODE_Y = 25;
const GAP = 110; // center-to-center
const X0 = 16;

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildChain(activeId: string): {nodes: string; connectors: string} {
  const activeIdx = CHAIN.findIndex((c) => c.id === activeId);
  const nodes = CHAIN.map((c, i) => {
    const x = X0 + i * GAP;
    const cls = i === activeIdx ? 'node active' : i < activeIdx ? 'node done' : 'node';
    return `    <g class="${cls}" data-stage="${c.id}">
      <rect x="${x}" y="${NODE_Y}" width="${NODE_W}" height="${NODE_H}" rx="12" />
      <text class="id" x="${x + NODE_W / 2}" y="${NODE_Y + 30}" text-anchor="middle">${c.id}</text>
      <text class="slug" x="${x + NODE_W / 2}" y="${NODE_Y + 50}" text-anchor="middle">${esc(c.slug)}</text>
    </g>`;
  }).join('\n');
  const connectors = CHAIN.slice(0, -1)
    .map((_, i) => {
      const x1 = X0 + i * GAP + NODE_W;
      const x2 = X0 + (i + 1) * GAP;
      const y = NODE_Y + NODE_H / 2;
      return `    <line class="connector" x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" />`;
    })
    .join('\n');
  return {nodes, connectors};
}

function chips(items: string[], cls: string): string {
  return items.map((i) => `<span class="chip ${cls}">${esc(i)}</span>`).join('');
}

function outputsList(items: string[]): string {
  return items.map((i) => `            <li>${esc(i)}</li>`).join('\n');
}

function render(): {ok: number; fail: number} {
  if (!existsSync(TEMPLATE_PATH)) throw new Error(`template not found: ${TEMPLATE_PATH}`);
  const template = readFileSync(TEMPLATE_PATH, 'utf8');
  let ok = 0;
  let fail = 0;
  const stageDirs = readdirSync(MW_DIR).filter((d) => d.startsWith('p0'));
  for (const dir of stageDirs) {
    const wfPath = join(MW_DIR, dir, 'workflow.yml');
    if (!existsSync(wfPath)) continue;
    const raw = parse(readFileSync(wfPath, 'utf8')) as unknown;
    let wf;
    try {
      wf = MultimediaWorkflowSchema.parse(raw);
    } catch (e) {
      console.error(`FAIL ${dir}: schema parse — ${(e as Error).message}`);
      fail++;
      continue;
    }
    const brief = wf.brief;
    const cap = wf.capability_map;
    if (!brief || !cap) {
      console.error(`FAIL ${dir}: missing brief or capability_map`);
      fail++;
      continue;
    }
    const {nodes, connectors} = buildChain(wf.workflow_id);
    const html = template
      .replace(/{{ACTIVE_STAGE}}/g, wf.workflow_id)
      .replace(/{{STAGE_ID}}/g, wf.workflow_id)
      .replace(/{{STAGE_DIR}}/g, dir)
      .replace(/{{STAGE_TITLE}}/g, esc(wf.title))
      .replace(/{{STAGE_PURPOSE}}/g, esc(wf.purpose))
      .replace(/{{WORK_PRODUCT_STATE}}/g, esc(wf.work_product_state))
      .replace(/{{CHAIN_NODES}}/g, nodes)
      .replace(/{{CHAIN_CONNECTORS}}/g, connectors)
      .replace(/{{OUTPUTS_LIST}}/g, outputsList(brief.outputs))
      .replace(/{{DELIVERABLES_CHIPS}}/g, chips(brief.deliverables, 'asset'))
      .replace(/{{SKILLS_CHIPS}}/g, chips(cap.skills, 'skill'))
      .replace(/{{GATES_CHIPS}}/g, chips(wf.gates, ''))
      .replace(/{{CTA}}/g, esc(brief.cta));
    const outPath = join(MW_DIR, dir, 'schematic.html');
    writeFileSync(outPath, html, 'utf8');
    console.info(
      `OK ${dir} -> schematic.html (${wf.workflow_id}, ${brief.outputs.length} outputs, ${cap.skills.length} skills)`,
    );
    ok++;
  }
  return {ok, fail};
}

const {ok, fail} = render();
console.info(`--- ${ok} ok, ${fail} fail`);
if (fail > 0) process.exit(1);
