import {createHash} from 'node:crypto';
import {readFileSync, readdirSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {format} from 'prettier';
import {parse} from 'yaml';

import {DeliverableDefinitionRegistryV1Schema} from '../_schema/deliverable-v1.schema.ts';
import {MultimediaWorkflowSchema} from '../_schema/workflow-v1.schema.ts';

const ROOT = process.cwd();
const DIR = resolve(ROOT, '02_proceso/workflows/multimedia');
const OUT = resolve(DIR, '_assets');
const sha256 = (value: string): string => createHash('sha256').update(value).digest('hex');
const esc = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
const definitions = DeliverableDefinitionRegistryV1Schema.parse(
  parse(readFileSync(resolve(OUT, 'deliverable-definition-registry.yml'), 'utf8')),
).definitions;
const definitionById = new Map(definitions.map((item) => [item.deliverable_id, item]));

const stages = readdirSync(DIR)
  .filter((name) => /^p0[0-9]-/u.test(name))
  .sort()
  .map((name) => {
    const workflow = MultimediaWorkflowSchema.parse(
      parse(readFileSync(resolve(DIR, name, 'workflow.yml'), 'utf8')) as unknown,
    );
    return {
      id: workflow.workflow_id,
      title: workflow.title,
      purpose: workflow.purpose,
      state: workflow.work_product_state,
      prompt: `${name}/prompt-spec.md`,
      outputs: workflow.brief.outputs,
      deliverables: workflow.outputs.map((output) => {
        const definition = definitionById.get(output.deliverable_id);
        if (!definition) throw new Error(`Unresolved deliverable: ${output.deliverable_id}`);
        return {
          id: definition.deliverable_id,
          name: definition.display_name,
          class: definition.deliverable_class,
          touchpoint: definition.touchpoint,
          purpose: definition.purpose,
          formats: definition.formats,
          piece_families: definition.piece_families,
          required: output.required,
          condition: output.condition ?? null,
          gate: definition.acceptance_gate,
          template_markdown: `${name}/templates/${definition.deliverable_id}.template.md`,
          template_html: `${name}/templates/${definition.deliverable_id}.template.html`,
        };
      }),
      skills: workflow.capability_map.skills,
      gates: workflow.gates,
      steps: workflow.execution_steps.map((step) => ({
        id: step.step_id,
        purpose: step.purpose,
        skill: step.primary_skill,
        gate: step.gate,
        stop: step.stop_rule,
      })),
    };
  });

const model = JSON.stringify({schema_version: 'multimedia-library-v1', stages});
const digest = sha256(model);
const safeModel = model.replaceAll('<', '\\u003c');
const chain = stages.map((stage) => stage.id).join(' --> ');
const markdown = [
  '---',
  'schema_version: multimedia-library-v1',
  `content_sha256: ${digest}`,
  'design_profile: metodologia-html-v7',
  'state: RENDERED_DRAFT',
  '---',
  '',
  '# Biblioteca Universal de Creación Multimedia',
  '',
  'Diez workflows ejecutables. Cada etapa carga solo su prompt, templates y skills asignadas. [CONFIG]',
  '',
  '```mermaid',
  'flowchart LR',
  `  ${chain}`,
  '```',
  '',
  ...stages.flatMap((stage) => [
    `## ${stage.id} · ${stage.title}`,
    '',
    stage.purpose,
    '',
    `- Prompt: [${stage.prompt}](../${stage.prompt})`,
    `- Estado: ${stage.state}`,
    '- Deliverables:',
    ...stage.deliverables.map(
      (item) =>
        `  - **${item.name}** (\`${item.id}\`) · ${item.touchpoint} · ${item.required ? 'obligatorio' : `condicional: ${item.condition}`} · ${item.formats.join('/')} · gate \`${item.gate}\` — ${item.purpose} · [template MD](../${item.template_markdown}) · [template HTML](../${item.template_html})`,
    ),
    `- Skills: ${stage.skills.join(', ')}`,
    `- Gates: ${stage.gates.join(', ')}`,
    '',
    ...stage.steps.map(
      (step, index) =>
        `${index + 1}. **${step.id}:** ${step.purpose} · skill: \`${step.skill}\` · gate: \`${step.gate}\` · stop: ${step.stop}`,
    ),
    '',
  ]),
  '> RENDERED_DRAFT ≠ HUMAN_APPROVED ≠ READY ≠ PUBLISHED. [CONFIG]',
  '',
].join('\n');

const cards = stages
  .map(
    (stage) =>
      `<article class="card" id="${stage.id}"><p class="eyebrow">${stage.id} · ${esc(stage.state)}</p><h2>${esc(stage.title)}</h2><p>${esc(stage.purpose)}</p><h3>Pasos</h3><ol>${stage.steps.map((step) => `<li><strong>${step.id}</strong> ${esc(step.purpose)}<small>${esc(step.skill)} · ${esc(step.gate)}</small></li>`).join('')}</ol><h3>Entregables</h3><ul>${stage.deliverables.map((item) => `<li><strong>${esc(item.name)}</strong><small>${esc(item.class)} · ${esc(item.touchpoint)} · ${esc(item.formats.join('/'))} · ${esc(item.gate)}</small><span>${esc(item.purpose)}</span><a href="../${item.template_markdown}">MD</a> · <a href="../${item.template_html}">HTML</a></li>`).join('')}</ul><a href="../${stage.prompt}">Abrir prompt canónico</a></article>`,
  )
  .join('');
const nodes = stages
  .map(
    (stage, index) =>
      `<g><rect x="${20 + index * 94}" y="20" width="72" height="44" rx="12"/><text x="${56 + index * 94}" y="47">${stage.id}</text></g>`,
  )
  .join('');
const lines = stages
  .slice(1)
  .map((_, index) => `<line x1="${92 + index * 94}" y1="42" x2="${114 + index * 94}" y2="42"/>`)
  .join('');
const html = `<!doctype html><html lang="es" data-theme="light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="state" content="RENDERED_DRAFT"><meta name="content-sha256" content="${digest}"><meta name="design-system" content="metodologia-html-v7"><title>MetodologIA · Biblioteca Multimedia</title><style>:root{--navy:#122562;--gold:#FFD700;--blue:#137DC5;--bg:#FFF;--soft:#F0F4F8;--text:#122562;--surface:#FFF}html[data-theme=dark]{--bg:#09143a;--soft:#182f73;--text:#f8fafc;--surface:#122562}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:400 1rem Montserrat,system-ui,sans-serif;line-height:1.55}header,main,footer{max-width:1180px;margin:auto;padding:1.5rem}h1,h2{font-family:Poppins,system-ui,sans-serif;font-weight:700}h2{border-left:5px solid var(--gold);padding-left:.75rem}.hero{background:var(--navy);color:#fff;border-radius:24px;padding:clamp(1.5rem,5vw,3rem)}button,a{min-height:44px}button{float:right;border:2px solid var(--blue);border-radius:999px;padding:.5rem 1rem}.chain{overflow:auto;background:var(--surface);border:1px solid #137dc544;border-radius:16px;margin:1rem 0}.chain svg{min-width:960px;width:100%}.chain rect{fill:var(--gold);stroke:var(--navy)}.chain text{font:700 12px Poppins;text-anchor:middle;fill:var(--navy)}.chain line{stroke:var(--blue);stroke-width:3}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1rem}.card{background:var(--surface);border:1px solid #137dc544;border-radius:16px;padding:1.25rem}.eyebrow,small{display:block;font-family:"Trebuchet MS",sans-serif}.eyebrow{color:var(--blue);font-weight:700}li{margin:.65rem 0}a{color:var(--blue);font-weight:700}:focus-visible{outline:3px solid var(--blue);outline-offset:3px}@media(max-width:768px){.grid{grid-template-columns:1fr}}@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important}}@media print{button{display:none}.card{break-inside:avoid}}</style></head><body><header><section class="hero"><button type="button" aria-label="Cambiar tema">Tema</button><p>MetodologIA · Frames ContentOS</p><h1>Biblioteca Universal de Creación Multimedia</h1><p>P00–P09 con steps, skills, deliverables y gates verificables.</p></section></header><main><section class="chain" aria-label="Cadena P00 a P09"><svg viewBox="0 0 980 84" role="img">${lines}${nodes}</svg></section><section class="grid">${cards}</section></main><footer>RENDERED_DRAFT ≠ HUMAN_APPROVED ≠ READY ≠ PUBLISHED</footer><!-- prettier-ignore --><script type="application/json" id="library-model">${safeModel}</script><script>document.querySelector('button')?.addEventListener('click',()=>{const r=document.documentElement;r.dataset.theme=r.dataset.theme==='dark'?'light':'dark'})</script></body></html>\n`;

const formatOptions = {
  bracketSpacing: false,
  singleQuote: true,
  trailingComma: 'all' as const,
  printWidth: 100,
};
writeFileSync(
  resolve(OUT, 'multimedia-library.md'),
  await format(markdown, {...formatOptions, parser: 'markdown'}),
  'utf8',
);
writeFileSync(
  resolve(OUT, 'multimedia-library.html'),
  await format(html, {...formatOptions, parser: 'html'}),
  'utf8',
);
console.info(`PASS multimedia-library: ${stages.length} stages sha256=${digest}`);
