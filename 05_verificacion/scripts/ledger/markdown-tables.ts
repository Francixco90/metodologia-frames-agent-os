// ledger/markdown-tables.ts — generic markdown table formatters (no ledger
// domain knowledge). [CÓDIGO]
export const renderSummaryTable = (header: string, values: Record<string, number>): string => {
  const rows = Object.entries(values).map(([key, value]) => [`\`${key}\``, String(value)] as const);
  const firstWidth = Math.max(header.length, ...rows.map(([key]) => key.length));
  const secondWidth = Math.max('Archivos'.length, ...rows.map(([, value]) => value.length));
  return [
    `| ${header.padEnd(firstWidth)} | ${'Archivos'.padStart(secondWidth)} |`,
    `| ${'-'.repeat(firstWidth)} | ${`${'-'.repeat(secondWidth - 1)}:`} |`,
    ...rows.map(([key, value]) => `| ${key.padEnd(firstWidth)} | ${value.padStart(secondWidth)} |`),
  ].join('\n');
};

export const renderBudgetTable = (rows: readonly (readonly string[])[]): string => {
  const headers = ['Gate', 'Baseline', 'Final', 'Límite', 'Ratio', 'Estado'] as const;
  const rightAligned = new Set([1, 2, 3, 4]);
  const widths = headers.map((header, index) =>
    Math.max(header.length, ...rows.map((row) => row[index]?.length ?? 0)),
  );
  const renderRow = (row: readonly string[]): string =>
    `| ${row
      .map((value, index) =>
        rightAligned.has(index)
          ? value.padStart(widths[index] ?? value.length)
          : value.padEnd(widths[index] ?? value.length),
      )
      .join(' | ')} |`;
  const separator = widths.map((width, index) =>
    rightAligned.has(index) ? `${'-'.repeat(Math.max(width - 1, 2))}:` : '-'.repeat(width),
  );
  return [renderRow(headers), renderRow(separator), ...rows.map(renderRow)].join('\n');
};