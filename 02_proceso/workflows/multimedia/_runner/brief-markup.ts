import {sha256Text} from './brief-model.ts';

const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const inline = (value: string): string =>
  escapeHtml(value)
    .replace(/`([^`]+)`/gu, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/gu, '<strong>$1</strong>');

const nodeParts = (raw: string): {id: string; label: string} => {
  const match = /^([A-Za-z0-9_-]+)(?:\[(.*)\])?$/u.exec(raw.trim());
  const id = match?.[1] ?? raw.trim();
  const label = (match?.[2] ?? id).replace(/^"|"$/gu, '');
  return {id, label};
};

export const renderMermaidSvg = (source: string): string => {
  const nodes = new Map<string, string>();
  const edges: Array<[string, string]> = [];
  for (const line of source.replaceAll('\r\n', '\n').split('\n').slice(1)) {
    const edge = /^\s*(.+?)\s*-->\s*(.+?)\s*$/u.exec(line);
    if (!edge?.[1] || !edge[2]) continue;
    const from = nodeParts(edge[1]);
    const to = nodeParts(edge[2]);
    nodes.set(from.id, from.label);
    nodes.set(to.id, to.label);
    edges.push([from.id, to.id]);
  }
  if (nodes.size === 0) {
    const safe = source.split('\n').slice(0, 12).map(escapeHtml);
    const height = 56 + safe.length * 20;
    return `<svg class="brief-diagram" role="img" aria-label="Diagrama" viewBox="0 0 760 ${height}"><rect x="8" y="8" width="744" height="${height - 16}" rx="18"/><text x="28" y="38">${safe.map((line, index) => `<tspan x="28" dy="${index === 0 ? 0 : 20}">${line}</tspan>`).join('')}</text></svg>`;
  }

  const entries = [...nodes.entries()];
  const positions = new Map(
    entries.map(([id], index) => [
      id,
      {x: 20 + (index % 3) * 250, y: 24 + Math.floor(index / 3) * 112},
    ]),
  );
  const height = 48 + Math.ceil(entries.length / 3) * 112;
  const lines = edges
    .map(([from, to]) => {
      const a = positions.get(from);
      const b = positions.get(to);
      return a && b
        ? `<line x1="${a.x + 210}" y1="${a.y + 32}" x2="${b.x}" y2="${b.y + 32}" marker-end="url(#arrow)"/>`
        : '';
    })
    .join('');
  const boxes = entries
    .map(([id, label]) => {
      const point = positions.get(id)!;
      return `<g><rect x="${point.x}" y="${point.y}" width="210" height="64" rx="16"/><text x="${point.x + 105}" y="${point.y + 38}" text-anchor="middle">${escapeHtml(label.slice(0, 28))}</text></g>`;
    })
    .join('');
  return `<svg class="brief-diagram" role="img" aria-label="Diagrama" viewBox="0 0 760 ${height}"><desc>${escapeHtml(source)}</desc><defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z"/></marker></defs>${lines}${boxes}</svg>`;
};

export const markdownToHtml = (markdown: string): string => {
  const lines = markdown.replaceAll('\r\n', '\n').split('\n');
  const output: string[] = [];
  let list: 'ul' | 'ol' | undefined;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? '';
    if (line.trim().startsWith('```')) {
      const language = line.trim().slice(3);
      const block: string[] = [];
      while (++index < lines.length && !(lines[index] ?? '').trim().startsWith('```')) {
        block.push(lines[index] ?? '');
      }
      output.push(
        language === 'mermaid'
          ? renderMermaidSvg(block.join('\n'))
          : `<pre><code>${escapeHtml(block.join('\n'))}</code></pre>`,
      );
      continue;
    }
    const unordered = /^-\s+(.+)$/u.exec(line);
    const ordered = /^\d+\.\s+(.+)$/u.exec(line);
    const wanted = unordered ? 'ul' : ordered ? 'ol' : undefined;
    if (list && wanted !== list) output.push(`</${list}>`);
    if (wanted && list !== wanted) output.push(`<${wanted}>`);
    list = wanted;
    if (unordered?.[1] || ordered?.[1])
      output.push(`<li>${inline(unordered?.[1] ?? ordered?.[1] ?? '')}</li>`);
    else if (/^###\s+/u.test(line)) output.push(`<h3>${inline(line.replace(/^###\s+/u, ''))}</h3>`);
    else if (line.trim()) output.push(`<p>${inline(line)}</p>`);
  }
  if (list) output.push(`</${list}>`);
  return output.join('\n');
};

export const renderBriefSection = (id: string, markdown: string, index: number): string => {
  const inner = `<span class="step-index" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span>\n<h2>${escapeHtml(id)}</h2>\n<div class="section-body">${markdownToHtml(markdown)}</div>`;
  return `<section data-brief-section="${escapeHtml(id)}" data-rendered-sha256="${sha256Text(inner)}">${inner}</section>`;
};
