// ledger/markdown.ts — human-readable projection of the canonical ledger YAML.
// Prose composer: delegates table rendering to markdown-tables.ts. [CÓDIGO]
import type {Ledger} from '../generate-file-disposition-ledger.ts';
import {renderBudgetRows, renderEntryTable} from './markdown-rows.ts';
import {renderBudgetTable, renderSummaryTable} from './markdown-tables.ts';

export const markdownFor = (ledger: Ledger): string => {
  const budgets = ledger.budgets;
  const budgetTable = renderBudgetTable(renderBudgetRows(budgets));
  const entryTable = renderEntryTable(ledger.entries);
  const runtimeEvidence = budgets.runtime_generated_evidence;
  return `# File disposition ledger

Baseline: \`${ledger.baseline_commit}\`. Coverage: **${ledger.coverage}**. [CÓDIGO]

Este documento es la proyección legible de
\`docs/program/file-disposition-ledger.yml\`. El YAML canónico se regenera desde el árbol y los blobs
de Git, compara el working tree y resuelve owner, decisión, justificación y evidencia para cada uno
de los ${ledger.baseline_file_count} archivos. [CONFIG]

## Clases

${renderSummaryTable('Clase', ledger.summary.artifact_classes)}

## Disposiciones

${renderSummaryTable('Disposición', ledger.summary.dispositions)}

Las únicas decisiones válidas son \`refactored\`, \`generator_fixed\`, \`superseded\`,
\`verified_no_change\`, \`quarantined\` e \`immutable_history\`. Un archivo byte-idéntico no se
presenta como refactor; \`superseded\` exige sucesor real; el wrapper Stitch permanece en cuarentena;
y la historia conserva bytes. [CONFIG]

## Presupuestos medidos

${budgetTable}

Además, ${budgets.editable_markdown_per_file.checked_files} Markdown editables del baseline se
comprueban individualmente contra un máximo de 2× palabras. Violaciones registradas:
**${budgets.editable_markdown_per_file.violations.length}**. La historia queda excluida de los
presupuestos authored. El inventario generado declara cada output como binding aplicable o N/A con
justificación. La evidencia runtime de orquestación excluida suma **${runtimeEvidence.files}**
archivos append-only. Las métricas usan tokens separados por whitespace y líneas físicas; un
terminador final no crea una LOC vacía. [CONFIG]

## Cobertura ${ledger.coverage}

Cada fila resume métricas y evidencia; la justificación, el hash actual, la regla de ownership y el
posible sucesor permanecen en el YAML canónico. [CONFIG]

${entryTable}
`;
};
