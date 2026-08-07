// ledger/markdown-rows.ts — ledger-specific row content for the markdown
// projection (entry table + budget rows). Domain-aware formatting. [CÓDIGO]
import type {Ledger} from '../generate-file-disposition-ledger.ts';

const ENTRY_HEADERS = [
  'Ruta',
  'Owner',
  'Decisión',
  'Palabras iniciales',
  'Palabras actuales',
  'LOC inicial',
  'LOC actual',
  'SHA-256 inicial',
  'Evidencia',
] as const;

export const renderEntryTable = (entries: Ledger['entries']): string => {
  const rows = entries.map(
    (entry) =>
      [
        `\`${entry.path}\``,
        `\`${entry.resolved_owner}\``,
        `\`${entry.decision}\``,
        String(entry.initial_words),
        String(entry.evidence.current_words ?? 'n/a'),
        String(entry.initial_loc),
        String(entry.evidence.current_loc ?? 'n/a'),
        `\`${entry.initial_sha256}\``,
        entry.evidence.byte_identical ? '`byte-identical`' : '`changed`',
      ] as const,
  );
  const widths = ENTRY_HEADERS.map((header, index) =>
    Math.max(header.length, ...rows.map((row) => row[index]?.length ?? 0)),
  );
  return [
    `| ${ENTRY_HEADERS.map((h, i) => h.padEnd(widths[i] ?? h.length)).join(' | ')} |`,
    `| ${widths.map((w) => '-'.repeat(w)).join(' | ')} |`,
    ...rows.map((row) => `| ${row.map((v, i) => v.padEnd(widths[i] ?? v.length)).join(' | ')} |`),
  ].join('\n');
};

export const renderBudgetRows = (budgets: Ledger['budgets']): readonly (readonly string[])[] => {
  const eligible = budgets.authored_eligible_corpus;
  const total = budgets.total_authored_hard_cap;
  const generated = budgets.generated_template_budget;
  const history = budgets.immutable_history;
  return [
    [
      'Corpus authored elegible',
      String(eligible.baseline_words),
      String(eligible.final_words),
      `${eligible.maximum_words} (1.5×)`,
      `${eligible.actual_multiplier}×`,
      `\`${eligible.status}\``,
    ],
    [
      'Total authored (palabras)',
      String(total.baseline_words),
      String(total.final_words),
      `${total.maximum_words} (2×)`,
      `${total.word_multiplier}×`,
      `\`${total.status}\``,
    ],
    [
      'Total authored (LOC)',
      String(total.baseline_loc),
      String(total.final_loc),
      `${total.maximum_loc} (2×)`,
      `${total.loc_multiplier}×`,
      `\`${total.status}\``,
    ],
    [
      'Generated/template aplicables',
      `${generated.inventory_count} inventariados`,
      `${generated.applicable_bindings} checks + ${generated.not_applicable_count} N/A`,
      '2× palabras y LOC',
      generated.coverage,
      `\`${generated.status}\``,
    ],
    [
      'Historia baseline',
      `${history.baseline_files} archivos`,
      `${history.byte_identical_files} byte-idénticos`,
      String(history.baseline_files),
      'n/a',
      `\`${history.status}\``,
    ],
  ];
};
