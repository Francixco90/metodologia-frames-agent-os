import {createHash} from 'node:crypto';
import type {SequenceModelV1, WorkflowDocumentationV1} from './contracts.ts';

const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

const mermaidId = (actor: string, index: number): string =>
  `a${index}_${actor.replace(/[^a-z0-9]/giu, '_')}`;

export const renderMermaid = (sequence: SequenceModelV1): string => {
  const aliases = new Map(sequence.actors.map((actor, index) => [actor, mermaidId(actor, index)]));
  const lines = ['sequenceDiagram'];
  for (const actor of sequence.actors)
    lines.push(`  participant ${aliases.get(actor)} as ${actor.replaceAll(':', ' -')}`);
  for (const message of sequence.messages) {
    lines.push(
      `  ${aliases.get(message.from)}->>${aliases.get(message.to)}: ${message.label.replaceAll(':', ' -')}`,
    );
  }
  return lines.join('\n');
};

const list = (items: readonly string[]): string =>
  items.length ? items.map((item) => `- \`${item}\``).join('\n') : '- Ninguno declarado.';

export const renderWorkflowMarkdown = (
  workflow: WorkflowDocumentationV1,
  sequence: SequenceModelV1,
): string => `---
title: "${workflow.id} · ${workflow.title.replaceAll('"', '\\"')}"
type: workflow_reference
status: generated
source: ${workflow.source}
audience: [person, operator, maintainer]
---

# ${workflow.id} · ${workflow.title}

> Esta página se genera desde el workflow canónico. Para cambiarla, edita [su fuente](../../../${workflow.source}) y regenera la documentación.

## Qué puedes conseguir

${workflow.purpose}

## Cuándo usarlo

Frames selecciona este recorrido cuando el resultado solicitado corresponde a **${workflow.title}**. Comando equivalente: \`${workflow.command}\`.

## Qué necesita

${list(workflow.inputs)}

## Qué entrega

${list(workflow.deliverables)}

## Cómo avanza

| Paso | Qué ocurre | Skill principal | Resultado | Aprobación |
|---|---|---|---|---|
${workflow.steps.map((step) => `| ${step.id} | ${step.purpose} | \`${step.primarySkill}\` | ${step.outputs.join(', ') || 'Evidencia'} | \`${step.gate}\` |`).join('\n')}

## Diagrama de secuencia

\`\`\`mermaid
${renderMermaid(sequence)}
\`\`\`

### Alternativa textual

${sequence.accessibleSummary.map((item, index) => `${index + 1}. ${item}`).join('\n')}

## Límites y detención

${workflow.stopRule}

Gates: ${workflow.gates.map((gate) => `\`${gate}\``).join(', ') || '`UNKNOWN`'}. Solo una aprobación inequívoca permite avanzar.

## Siguiente paso

${workflow.nextWorkflow ? `Si el resultado queda aprobado, Frames puede continuar con **${workflow.nextWorkflow}**.` : 'Este workflow cierra su familia. Cualquier efecto externo requiere una autorización separada.'}
`;

const palette = {navy: '#122562', blue: '#137DC5', gold: '#FFD700', soft: '#F3F7FC'};

export const renderSequenceSvg = (sequence: SequenceModelV1): string => {
  const row = 58;
  const width = 920;
  const height = Math.max(180, 90 + sequence.messages.length * row);
  const items = sequence.messages.map((message, index) => {
    const y = 68 + index * row;
    return `<g><circle cx="34" cy="${y}" r="12" fill="${message.kind === 'decision' ? palette.gold : palette.blue}"/><line x1="46" y1="${y}" x2="112" y2="${y}" stroke="${palette.navy}" stroke-width="2"/><text x="126" y="${y - 8}" class="actor">${escapeHtml(message.from)} → ${escapeHtml(message.to)}</text><text x="126" y="${y + 14}" class="label">${escapeHtml(message.label)}</text></g>`;
  });
  return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="seq-title seq-desc" xmlns="http://www.w3.org/2000/svg"><title id="seq-title">Secuencia ${escapeHtml(sequence.workflowId)}</title><desc id="seq-desc">${escapeHtml(sequence.accessibleSummary.join(' '))}</desc><style>.actor{font:700 14px Arial;fill:${palette.navy}}.label{font:13px Arial;fill:#26324d}</style><line x1="34" y1="45" x2="34" y2="${height - 30}" stroke="${palette.navy}" stroke-width="3"/>${items.join('')}</svg>`;
};

const css = `:root{--navy:#122562;--blue:#137DC5;--gold:#FFD700;--soft:#F3F7FC;--ink:#17213d}*{box-sizing:border-box}body{margin:0;font-family:Montserrat,Arial,sans-serif;color:var(--ink);background:white;line-height:1.6}header{background:var(--navy);color:white;padding:2rem max(5vw,1rem)}main{max-width:1100px;margin:auto;padding:2rem max(4vw,1rem)}h1,h2{font-family:Poppins,Arial,sans-serif;color:var(--navy)}header h1{color:white}a{color:#075f9d}input{display:block;width:100%;min-height:44px;margin:.5rem 0 1.5rem;padding:.65rem;border:2px solid #9cabc2;border-radius:10px;font:inherit}.card,section{border:1px solid #d8e2f0;border-radius:16px;padding:1.25rem;margin:1rem 0;background:white}.meta{color:#4a5874}.pill{display:inline-block;background:var(--soft);border-radius:999px;padding:.25rem .65rem;margin:.2rem}table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:.7rem;border-bottom:1px solid #d8e2f0}th{background:var(--soft)}svg{width:100%;height:auto;background:var(--soft);border-radius:12px}@media(prefers-color-scheme:dark){body{background:#091126;color:#eef4ff}.card,section{background:#111d3b;border-color:#314369}h1,h2,a{color:#7dc9ff}.meta{color:#b7c5df}th{background:#1d2b4f}}@media print{header{background:white;color:var(--navy);padding:0}nav{display:none}.card,section{break-inside:avoid}}:focus-visible{outline:3px solid var(--blue);outline-offset:3px}`;

export const renderWorkflowHtml = (
  workflow: WorkflowDocumentationV1,
  sequence: SequenceModelV1,
): string =>
  `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="${escapeHtml(workflow.purpose)}"><meta name="frames:schema" content="workflow-documentation-v1"><meta name="frames:workflow" content="${workflow.id}"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'"><title>${workflow.id} · ${escapeHtml(workflow.title)}</title><style>${css}</style></head><body><header><p>Frames ContentOS · por MetodologIA</p><h1>${workflow.id} · ${escapeHtml(workflow.title)}</h1><p>${escapeHtml(workflow.purpose)}</p></header><main><nav><a href="../index.html">← Volver al catálogo</a></nav><section><h2>Qué necesitas y qué recibes</h2><p><strong>Entradas:</strong> ${escapeHtml(workflow.inputs.join(', ') || 'Ninguna declarada')}</p><p><strong>Entregables:</strong> ${escapeHtml(workflow.deliverables.join(', ') || 'Ninguno declarado')}</p></section><section><h2>Cómo avanza</h2><table><thead><tr><th>Paso</th><th>Acción</th><th>Skill</th><th>Gate</th></tr></thead><tbody>${workflow.steps.map((step) => `<tr><td>${escapeHtml(step.id)}</td><td>${escapeHtml(step.purpose)}</td><td>${escapeHtml(step.primarySkill)}</td><td>${escapeHtml(step.gate)}</td></tr>`).join('')}</tbody></table></section><section><h2>Secuencia</h2>${renderSequenceSvg(sequence)}<ol>${sequence.accessibleSummary.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ol></section><section><h2>Límites</h2><p>${escapeHtml(workflow.stopRule)}</p><p class="meta">Fuente: ${escapeHtml(workflow.source)} · Próximo: ${escapeHtml(workflow.nextWorkflow || 'cierre')}</p></section></main></body></html>\n`;

export const renderPortalHtml = (workflows: WorkflowDocumentationV1[]): string => {
  const script = `const q=document.querySelector('#q');q.addEventListener('input',()=>{const v=q.value.toLocaleLowerCase('es');document.querySelectorAll('[data-search]').forEach(c=>{c.hidden=!c.dataset.search.includes(v)})});`;
  const scriptHash = createHash('sha256').update(script).digest('base64');
  const cards = (family: WorkflowDocumentationV1['family']): string =>
    workflows
      .filter((item) => item.family === family)
      .map(
        (item) =>
          `<article class="card" data-search="${escapeHtml(`${item.id} ${item.title} ${item.purpose}`.toLocaleLowerCase('es'))}"><span class="pill">${item.id}</span><h2><a href="workflows/${item.id.toLowerCase()}.html">${escapeHtml(item.title)}</a></h2><p>${escapeHtml(item.purpose)}</p></article>`,
      )
      .join('');
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="Descubre qué puede hacer Frames y cómo funciona cada recorrido."><meta name="frames:schema" content="documentation-manifest-v1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'sha256-${scriptHash}'; base-uri 'none'; form-action 'none'"><title>Frames · Recorridos</title><style>${css}</style></head><body><header><p>Frames ContentOS · por MetodologIA</p><h1>Elige por lo que quieres conseguir</h1><p>Crea contenido, fortalece tu carrera o inspecciona cómo Frames convierte una intención en resultados verificables.</p></header><main><label for="q"><strong>Buscar un resultado</strong></label><input id="q" type="search" placeholder="Ejemplo: CV, investigar, distribuir" autocomplete="off"><section><h2>Contenido y multimedia</h2>${cards('content')}</section><section><h2>Carrera profesional</h2>${cards('career')}</section><section><h2>Extensiones locales</h2>${cards('local-extension')}</section><section><h2>Mantenimiento del harness</h2>${cards('maintenance')}</section><p class="meta">Portal offline generado desde los workflows canónicos. No publica ni ejecuta efectos externos.</p></main><script>${script}</script></body></html>\n`;
};
