#!/usr/bin/env node

import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readdirSync, readFileSync, statSync, writeFileSync} from 'node:fs';
import {basename, dirname, relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

import {parse, stringify} from 'yaml';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(scriptDir, '..');
const repoRoot = resolve(packageRoot, '../../../..');
const legacyRoot = resolve(
  repoRoot,
  '03_artefactos/projects/notebooklm-os/metodologia-brand-content',
);
const manifestPath = resolve(packageRoot, 'source-manifest.yml');

const sha256 = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');
const repoPath = (path) => relative(repoRoot, path).split('\\').join('/');

const walk = (root, predicate) =>
  readdirSync(root, {withFileTypes: true})
    .flatMap((entry) => {
      const path = resolve(root, entry.name);
      return entry.isDirectory() ? walk(path, predicate) : predicate(path) ? [path] : [];
    })
    .sort();

const frontMatter = (path) => {
  const text = readFileSync(path, 'utf8');
  const match = text.match(/^---\n([\s\S]*?)\n---\n/u);
  if (match === null) throw new Error(`Missing front matter: ${repoPath(path)}`);
  return parse(match[1]);
};

const markdownSources = walk(resolve(packageRoot, 'knowledge-base'), (path) =>
  path.endsWith('.md'),
).map((path) => {
  const metadata = frontMatter(path);
  const digest = sha256(path);
  return {
    source_id: `NLS-V3-${metadata.document_id}`,
    name: basename(path, '.md'),
    title: metadata.title,
    layer: metadata.layer,
    authority: metadata.authority,
    source_type: 'markdown',
    scope: 'metodologia-brand-content-canon-v3',
    confidentiality: 'PRIVATE',
    owner: 'MetodologIA',
    tags: metadata.tags,
    audiences: metadata.audiences,
    language: metadata.language,
    response_locales: metadata.response_locales,
    rights: metadata.rights,
    status: metadata.status,
    valid_from: metadata.validity.valid_from,
    valid_until: metadata.validity.valid_until,
    content_sha256: digest,
    portable_identity_digest: digest,
    source_ref: repoPath(path),
    source_refs: metadata.source_refs,
    supersedes: metadata.supersedes,
    related_ids: metadata.related_ids,
    provenance: 'Canon v3 curated Markdown successor; source_refs preserve its admitted lineage.',
    notebook_role: metadata.tasks.join(', '),
  };
});

const historicalIndexPath = resolve(legacyRoot, 'source-packs/masterclass-playbooks-v1.yml');
const historicalIndex = parse(readFileSync(historicalIndexPath, 'utf8'));
const historicalFiles = walk(resolve(legacyRoot, 'source-packs/historical-pdf-editions'), (path) =>
  path.endsWith('.pdf'),
);
const historicalByHash = new Map(historicalFiles.map((path) => [sha256(path), path]));
const historicalSources = historicalIndex.sources.map((source) => {
  const path = historicalByHash.get(source.content_sha256);
  if (path === undefined) throw new Error(`Historical PDF missing for ${source.source_id}`);
  return {
    source_id: `NLS-V3-PDF-HIST-${source.source_id.replace(/^NLG-/u, '')}`,
    name: `40-reference--historical-${source.kind}-${String(source.sequence).padStart(2, '0')}--v3.0`,
    title: source.title,
    layer: '40 Golden References',
    authority: 'REFERENCE',
    source_type: 'pdf',
    scope: 'metodologia-brand-content-canon-v3',
    confidentiality: 'PRIVATE',
    owner: 'MetodologIA',
    tags: ['historical', source.kind, 'editorial-gallery'],
    audiences: ['content strategist', 'facilitator'],
    language: 'es-419',
    response_locales: ['en', 'es-419'],
    rights: 'APPROVED',
    status: 'ACTIVE',
    valid_from: '2026-08-26',
    valid_until: null,
    content_sha256: source.content_sha256,
    portable_identity_digest: source.content_sha256,
    source_ref: repoPath(path),
    source_refs: [source.source_id],
    supersedes: [],
    related_ids: [],
    provenance:
      'Existing historical masterclass or playbook PDF; identity and bytes verified by the v2 source-pack manifest.',
    notebook_role: 'editorial and artistic reference; never canonical authority',
    bytes: statSync(path).size,
    pages: source.pages,
  };
});

const parseCsv = (text) => {
  const [header, ...rows] = text.trim().split(/\r?\n/u);
  const keys = header.split(',');
  return rows.map((row) =>
    Object.fromEntries(row.split(',').map((value, index) => [keys[index], value])),
  );
};
const currentIndexPath = resolve(legacyRoot, 'source-packs/formation-canon-v1/drive-editions.csv');
const currentRows = parseCsv(readFileSync(currentIndexPath, 'utf8'));
const currentSources = currentRows.map((source) => {
  const path = resolve(legacyRoot, 'source-packs/formation-canon-v1', source.relative_path);
  if (sha256(path) !== source.content_sha256)
    throw new Error(`Current PDF hash drift: ${source.record_id}`);
  return {
    source_id: `NLS-V3-PDF-CURRENT-${source.record_id.replace(/^NFC-DRV-/u, '')}`,
    name: `40-reference--current-${source.record_id.toLowerCase().replace(/^nfc-drv-/u, '')}--v3.0`,
    title: source.title,
    layer: '40 Golden References',
    authority: 'REFERENCE',
    source_type: 'pdf',
    scope: 'metodologia-brand-content-canon-v3',
    confidentiality: 'PRIVATE',
    owner: 'MetodologIA',
    tags: ['current-edition', 'formation', 'editorial-gallery'],
    audiences: ['content strategist', 'facilitator'],
    language: 'es-419',
    response_locales: ['en', 'es-419'],
    rights: 'APPROVED',
    status: 'ACTIVE',
    valid_from: '2026-08-26',
    valid_until: null,
    content_sha256: source.content_sha256,
    portable_identity_digest: source.content_sha256,
    source_ref: repoPath(path),
    source_refs: [source.record_id],
    supersedes: [],
    related_ids: [],
    provenance:
      'Existing current formation PDF; bytes verified against the v2 Drive-editions index.',
    notebook_role:
      'current editorial and formation reference; Markdown remains governing authority',
    bytes: Number(source.bytes),
    pages: Number(source.pages),
  };
});

const galleryPath = resolve(legacyRoot, 'gallery/catalog.yml');
const gallery = parse(readFileSync(galleryPath, 'utf8'));
const imageSources = gallery.items.map((item) => {
  const path = resolve(legacyRoot, item.file.replace(/^gallery\//u, 'gallery/'));
  if (sha256(path) !== item.content_sha256)
    throw new Error(`Gallery image hash drift: ${item.asset_id}`);
  return {
    source_id: `NLS-V3-${item.asset_id}`,
    name: `50-assets--${item.asset_id.toLowerCase()}--v3.0`,
    title: item.title,
    layer: '50 Assets',
    authority: 'ASSET',
    source_type: 'image',
    scope: 'metodologia-brand-content-canon-v3',
    confidentiality: 'PRIVATE',
    owner: 'MetodologIA',
    tags: ['art-reference', ...item.motifs],
    audiences: ['content strategist', 'visual director'],
    language: 'zxx',
    response_locales: ['en', 'es-419'],
    rights: 'APPROVED',
    status: 'ACTIVE',
    valid_from: '2026-08-26',
    valid_until: null,
    content_sha256: item.content_sha256,
    portable_identity_digest: item.content_sha256,
    source_ref: repoPath(path),
    source_refs: [item.source_id],
    supersedes: [],
    related_ids: [],
    provenance:
      'Existing original-art gallery image; bytes and allowed internal-reference role verified by the v2 catalog.',
    notebook_role: 'internal artistic reference; never logo or factual evidence',
    dimensions: item.dimensions,
  };
});

const sources = [...markdownSources, ...historicalSources, ...currentSources, ...imageSources].sort(
  (left, right) => left.source_id.localeCompare(right.source_id),
);
const ids = sources.map(({source_id: id}) => id);
const hashes = sources.map(({content_sha256: hash}) => hash);
if (new Set(ids).size !== ids.length) throw new Error('Duplicate source_id in Canon v3 manifest.');
if (new Set(hashes).size !== hashes.length)
  throw new Error('Duplicate content hash in Canon v3 manifest.');

const manifest = {
  schema_version: 'notebook-source-pack-v3',
  profile_id: 'metodologia-brand-content-canon-v3',
  display_name: 'MetodologIA · Brand Content Studio · Canon v3',
  state: 'PLANNED_LOCAL',
  generated_by: 'scripts/build-source-manifest.mjs',
  locator_policy: {
    private_locators_persisted: false,
    runtime_resolution: 'repository-relative-path-plus-content-sha256',
  },
  authority_policy: {
    markdown_governs: true,
    pdf_and_images_inspire: true,
    asset_authority_has_veto: true,
    all_sources_blocked: true,
  },
  excluded_packs: [
    {
      pack_id: 'benchmark-ia-regional-global-v4',
      reason: 'attachable factual working pack; excluded from the brand canon',
    },
  ],
  summary: {
    markdown: markdownSources.length,
    historical_pdfs: historicalSources.length,
    current_pdfs: currentSources.length,
    images: imageSources.length,
    total: sources.length,
  },
  sources,
};

writeFileSync(manifestPath, stringify(manifest, {lineWidth: 120}), 'utf8');
execFileSync(resolve(repoRoot, 'node_modules/.bin/prettier'), ['--write', manifestPath], {
  stdio: 'ignore',
});
console.log(JSON.stringify(manifest.summary));
