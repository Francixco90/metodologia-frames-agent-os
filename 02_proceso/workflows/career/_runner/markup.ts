import {escapeHtml} from './canonical.ts';

const inline = (value: string): string =>
  escapeHtml(value)
    .replace(/\*\*(.+?)\*\*/gu, '<strong>$1</strong>')
    .replace(/`([^`]+)`/gu, '<code>$1</code>');

export const renderMarkdownFragment = (markdown: string): string => {
  const output: string[] = [];
  let list: string[] = [];
  const flush = (): void => {
    if (list.length)
      output.push(`<ul>${list.map((item) => `<li>${inline(item)}</li>`).join('')}</ul>`);
    list = [];
  };
  for (const line of markdown.split('\n')) {
    const item = /^-\s+(.+)$/u.exec(line)?.[1];
    if (item) list.push(item);
    else {
      flush();
      if (line.trim()) output.push(`<p>${inline(line.trim())}</p>`);
    }
  }
  flush();
  return output.join('\n');
};
