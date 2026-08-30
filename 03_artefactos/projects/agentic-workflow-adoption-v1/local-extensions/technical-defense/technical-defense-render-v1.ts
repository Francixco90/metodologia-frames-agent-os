import type {TechnicalDefenseCaseV1} from './technical-defense-contracts-v1.ts';

export const TECHNICAL_DEFENSE_OUTPUT_REFS_V1 = [
  'brief.md',
  'evidence-map.md',
  'architecture-narrative.md',
  'claim-matrix.md',
  'qa-bank.md',
  'threat-model.md',
  'rehearsal-report.md',
  'technical-defense-package.md',
  'technical-defense-package.html',
] as const;

const LABEL = 'BORRADOR LOCAL · NO VERIFICADO · LOCAL_SIMULATION';
const head = (title: string): string => `> ${LABEL}\n\n# ${title}\n\n`;
const table = (rows: readonly (readonly string[])[]): string =>
  `${rows.map((row) => `| ${row.join(' | ')} |`).join('\n')}\n`;
const safe = (value: string): string =>
  value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

const renderRedTeam = (value: TechnicalDefenseCaseV1): {markdown: string; html: string} => {
  if (value.red_team.findings.length === 0)
    return {markdown: '- Sin findings abiertos.', html: '<p>Sin findings abiertos.</p>'};
  return {
    markdown: value.red_team.findings
      .map(
        ({severity, description, limitation, owner, signoff_sha256}) =>
          `- **${severity}** — ${description}\n  - Limitación: ${limitation ?? 'No aplica.'}\n  - Owner: ${owner ?? 'No aplica.'}\n  - Signoff SHA-256: ${signoff_sha256 ?? 'No aplica.'}`,
      )
      .join('\n'),
    html: `<ul>${value.red_team.findings
      .map(
        ({severity, description, limitation, owner, signoff_sha256}) =>
          `<li><strong>${safe(severity)}</strong>: ${safe(description)}<ul><li>Limitación: ${safe(limitation ?? 'No aplica.')}</li><li>Owner: ${safe(owner ?? 'No aplica.')}</li><li>Signoff SHA-256: ${safe(signoff_sha256 ?? 'No aplica.')}</li></ul></li>`,
      )
      .join('')}</ul>`,
  };
};

export const renderTechnicalDefenseV1 = (
  value: TechnicalDefenseCaseV1,
): Record<(typeof TECHNICAL_DEFENSE_OUTPUT_REFS_V1)[number], string> => {
  const requirements = value.requirements.map(({id, text}) => `- **${id}** — ${text}`).join('\n');
  const evidence = table([
    ['ID', 'Ref', 'Rights', 'SHA-256'],
    ['---', '---', '---', '---'],
    ...value.evidence.map((item) => [item.id, item.ref, item.rights, item.sha256]),
  ]);
  const claims = table([
    ['Claim', 'Statement', 'Evidence'],
    ['---', '---', '---'],
    ...value.claims.map((item) => [item.id, item.statement, item.evidence_ids.join(', ')]),
  ]);
  const architecture = value.architecture.tradeoffs
    .map(
      ({decision, benefit, cost}) => `- **${decision}** — beneficio: ${benefit}; costo: ${cost}.`,
    )
    .join('\n');
  const qa = value.questions
    .map(
      ({id, question, answer, evidence_ids}) =>
        `## ${id} · ${question}\n\n${answer}\n\nEvidencia: ${evidence_ids.join(', ')}.`,
    )
    .join('\n\n');
  const threats = value.threats
    .map(
      ({id, failure, mitigation, residual_risk}) =>
        `## ${id} · ${failure}\n\nMitigación: ${mitigation}\n\nRiesgo residual: ${residual_risk}.`,
    )
    .join('\n\n');
  const rehearsals = value.rehearsals
    .map(
      ({id, observer_task_id, observer_actor_instance_id, occurred_at, score, notes}) =>
        `- ${id} · ${occurred_at} · tarea ${observer_task_id} · observador ${observer_actor_instance_id} · ${score}/100 · ${notes}`,
    )
    .join('\n');
  const redTeam = renderRedTeam(value);
  const piiStatus = `Datos: ${value.pilot_data_classification} · PII: ${value.pii_redaction_receipt.status} · receipt ${value.pii_redaction_receipt.receipt_sha256}.`;
  const brief = `${head(value.title)}${piiStatus}\n\nObjetivo congelado: ${value.objective}\n\nCongelado: ${value.frozen_at}.\n\n## Inventario de requisitos\n\n${requirements}\n\nFases: intake/freeze → requisitos → arquitectura/trade-offs → claims → threat model → Q&A → rehearsal → red-team → paquete final.`;
  const packageMd = `${head(`Paquete de defensa · ${value.title}`)}Estado máximo: ACTIVE_LOCAL.\n\n${piiStatus}\n\n${value.objective}\n\n## Requisitos\n\n${requirements}\n\n## Claims\n\n${claims}\n## Threats\n\n${threats}\n\n## Red-team\n\nVeredicto: ${value.red_team.verdict} · tarea ${value.red_team.task_id} · ${value.red_team.actor_instance_id}.\n\n${redTeam.markdown}`;
  const packageHtml = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${safe(value.title)}</title></head><body><header><p>${LABEL}</p><h1>${safe(value.title)}</h1><p>Estado máximo: ACTIVE_LOCAL</p><p>${safe(piiStatus)}</p></header><main><h2>Objetivo</h2><p>${safe(value.objective)}</p><h2>Requisitos</h2><ul>${value.requirements.map((item) => `<li><strong>${safe(item.id)}</strong>: ${safe(item.text)}</li>`).join('')}</ul><h2>Claims</h2><ul>${value.claims.map((item) => `<li><strong>${safe(item.id)}</strong>: ${safe(item.statement)} [${safe(item.evidence_ids.join(', '))}]</li>`).join('')}</ul><h2>Threat model</h2><ul>${value.threats.map((item) => `<li><strong>${safe(item.failure)}</strong>: ${safe(item.mitigation)}. Riesgo residual: ${safe(item.residual_risk)}</li>`).join('')}</ul><h2>Red-team</h2><p>Veredicto: ${safe(value.red_team.verdict)} · tarea ${safe(value.red_team.task_id)} · ${safe(value.red_team.actor_instance_id)}.</p>${redTeam.html}</main></body></html>`;
  return {
    'brief.md': brief,
    'evidence-map.md': `${head('Mapa de evidencia')}${evidence}`,
    'architecture-narrative.md': `${head('Narrativa de arquitectura')}${value.architecture.summary}\n\n## Trade-offs\n\n${architecture}`,
    'claim-matrix.md': `${head('Matriz de claims')}${claims}`,
    'qa-bank.md': `${head('Banco Q&A')}${qa}`,
    'threat-model.md': `${head('Threat / failure model')}${threats}`,
    'rehearsal-report.md': `${head('Informe de ensayo')}${rehearsals}\n\n## Red-team\n\nVeredicto: ${value.red_team.verdict} · ${value.red_team.actor_instance_id}.\n\n${redTeam.markdown}`,
    'technical-defense-package.md': packageMd,
    'technical-defense-package.html': packageHtml,
  };
};

export const technicalDefenseOutputBytesV1 = (value: string): Uint8Array =>
  Buffer.from(value.endsWith('\n') ? value : `${value}\n`);
