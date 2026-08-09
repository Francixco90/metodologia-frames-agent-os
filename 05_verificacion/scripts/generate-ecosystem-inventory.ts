import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {discoverLocalExtensions} from '../../02_proceso/workflows/local-extensions/index.ts';
import type {EcosystemInventoryV1} from '../../02_proceso/core/contracts/index.ts';
import {buildEcosystemInventoryV1} from '../../02_proceso/workflows/maintenance/index.ts';

const root = process.cwd();
const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
const stableJson = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;

const counts = (inventory: EcosystemInventoryV1): Map<string, number> => {
  const result = new Map<string, number>();
  for (const item of inventory.items) result.set(item.kind, (result.get(item.kind) ?? 0) + 1);
  return result;
};

export const renderInventoryMarkdownV1 = (inventory: EcosystemInventoryV1): string => {
  const lines = [
    '---',
    'title: Inventario del ecosistema Frames',
    `scope: ${inventory.scope}`,
    'status: generated',
    '---',
    '',
    '# Inventario del ecosistema Frames',
    '',
    'Usa este índice para saber qué puede enrutar, ejecutar, documentar y verificar Frames.',
    '',
    '## Resumen',
    '',
    ...[...counts(inventory)].sort().map(([kind, total]) => `- ${kind}: ${total}`),
    '',
    '## Capacidades',
    '',
    '| Tipo | ID | Estado | Alcance | Fuente |',
    '| --- | --- | --- | --- | --- |',
    ...inventory.items.map(
      (item) => `| ${item.kind} | ${item.id} | ${item.state} | ${item.scope} | \`${item.ref}\` |`,
    ),
    '',
    `Hash de fuentes: \`${inventory.sourceSha256}\`.`,
    '',
  ];
  return lines.join('\n');
};

export const renderInventoryHtmlV1 = (inventory: EcosystemInventoryV1): string => {
  const rows = inventory.items
    .map(
      (item) =>
        `<tr data-search="${escapeHtml(`${item.kind} ${item.id} ${item.state}`.toLowerCase())}"><td>${escapeHtml(item.kind)}</td><td>${escapeHtml(item.id)}</td><td>${escapeHtml(item.state)}</td><td>${escapeHtml(item.scope)}</td></tr>`,
    )
    .join('');
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'"><title>Inventario Frames</title><style>:root{color-scheme:light dark;--navy:#122562;--gold:#ffd700;--blue:#137dc5}*{box-sizing:border-box}body{font-family:Montserrat,Arial,sans-serif;margin:auto;max-width:1200px;padding:24px;line-height:1.5}h1{font-family:Poppins,Arial,sans-serif;color:var(--navy)}input{min-height:44px;width:100%;padding:10px;border:2px solid var(--blue);border-radius:8px}table{border-collapse:collapse;width:100%;margin-top:20px}th,td{text-align:left;border-bottom:1px solid #9bb5db;padding:10px}th{background:var(--navy);color:white}@media(max-width:600px){table{font-size:.82rem}}@media print{input{display:none}}@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important}}</style></head><body><a href="#inventory">Saltar al inventario</a><header><p>Frames ContentOS · por MetodologIA</p><h1>Inventario del ecosistema</h1><p>Encuentra workflows, skills, rutas, comandos y controles disponibles.</p><label>Buscar<input id="search" type="search" autocomplete="off"></label></header><main id="inventory"><table><thead><tr><th>Tipo</th><th>ID</th><th>Estado</th><th>Alcance</th></tr></thead><tbody>${rows}</tbody></table></main><script>const q=document.querySelector('#search');q.addEventListener('input',()=>{const v=q.value.toLowerCase();document.querySelectorAll('tbody tr').forEach(r=>r.hidden=!r.dataset.search.includes(v))});</script></body></html>\n`;
};

export const buildInventoryOutputsV1 = (
  inventory: EcosystemInventoryV1,
  directory: string,
): Map<string, string> =>
  new Map([
    [path.join(directory, 'ecosystem-inventory-v1.json'), stableJson(inventory)],
    [path.join(directory, 'ecosystem-inventory.md'), renderInventoryMarkdownV1(inventory)],
    [path.join(directory, 'ecosystem-inventory.html'), renderInventoryHtmlV1(inventory)],
  ]);

export const runEcosystemInventoryGeneratorV1 = ({
  root: selectedRoot = root,
  local = false,
  write = false,
}: {
  root?: string;
  local?: boolean;
  write?: boolean;
} = {}): EcosystemInventoryV1 => {
  const discovery = local
    ? discoverLocalExtensions({
        repository_root: selectedRoot,
        ...(process.env.FRAMES_USER_EXTENSIONS_ROOT
          ? {user_root: process.env.FRAMES_USER_EXTENSIONS_ROOT}
          : {}),
      })
    : undefined;
  const inventory = buildEcosystemInventoryV1(selectedRoot, discovery);
  const directory = local
    ? path.join(selectedRoot, '04_estado/local/documentation')
    : path.join(selectedRoot, '03_artefactos/content/documentation');
  const expected = buildInventoryOutputsV1(inventory, directory);
  if (write) {
    mkdirSync(directory, {recursive: true});
    for (const [ref, value] of expected) writeFileSync(ref, value, 'utf8');
  } else {
    const drift = [...expected].filter(([ref, value]) => readFileSync(ref, 'utf8') !== value);
    if (drift.length)
      throw new Error(`ECOSYSTEM-INVENTORY-DRIFT001:${drift.map(([ref]) => ref).join(',')}`);
  }
  return inventory;
};

if (path.resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  const inventory = runEcosystemInventoryGeneratorV1({
    local: process.argv.includes('--local'),
    write: process.argv.includes('--write'),
  });
  process.stdout.write(
    `PASS ecosystem-inventory scope=${inventory.scope} items=${inventory.items.length}\n`,
  );
}
