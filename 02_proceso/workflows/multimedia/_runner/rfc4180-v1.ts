export type Rfc4180CellV1 = boolean | null | number | string;

const normalizeCell = (value: Rfc4180CellV1): string => {
  if (value === null) return '';
  if (typeof value === 'number' && !Number.isFinite(value))
    throw new Error('RFC4180 forbids non-finite numbers');
  return String(value).replaceAll('\r\n', '\n').replaceAll('\r', '\n').replaceAll('\n', '\r\n');
};

const encodeCell = (value: Rfc4180CellV1): string => {
  const normalized = normalizeCell(value);
  return /[",\r\n]/u.test(normalized) ? `"${normalized.replaceAll('"', '""')}"` : normalized;
};

export const encodeRfc4180 = (rows: readonly (readonly Rfc4180CellV1[])[]): string => {
  if (rows.length === 0) throw new Error('RFC4180 requires at least one row');
  const width = rows[0]?.length ?? 0;
  if (width === 0 || rows.some((row) => row.length !== width))
    throw new Error('RFC4180 requires a non-empty rectangular table');
  return `${rows.map((row) => row.map(encodeCell).join(',')).join('\r\n')}\r\n`;
};
