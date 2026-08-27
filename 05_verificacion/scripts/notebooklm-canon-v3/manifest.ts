import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {basename, resolve, sep} from 'node:path';

import {parse as parseYaml} from 'yaml';

import {portableRelative, statSafe, walkFiles} from './io.ts';
import type {ParsedKnowledgeDocument} from './model.ts';
import {CanonSourceManifestV3Schema} from './schemas.ts';

const collectSourceIds = (value: unknown, output = new Set<string>()): Set<string> => {
  if (Array.isArray(value)) for (const item of value) collectSourceIds(item, output);
  else if (typeof value === 'object' && value !== null) {
    for (const [key, item] of Object.entries(value)) {
      if ((key === 'sourceId' || key === 'source_id') && typeof item === 'string') output.add(item);
      else collectSourceIds(item, output);
    }
  }
  return output;
};

export const discoverManifestSourceIds = (root: string): Set<string> => {
  const ids = new Set<string>();
  const candidates = walkFiles(root).filter((path) =>
    /^source-manifest.*\.(?:json|ya?ml)$/u.test(basename(path)),
  );
  for (const path of candidates) {
    const content = readFileSync(path, 'utf8');
    collectSourceIds(
      path.endsWith('.json') ? (JSON.parse(content) as unknown) : (parseYaml(content) as unknown),
      ids,
    );
  }
  return ids;
};

export const validateSourceManifest = (
  root: string,
  byPath: Map<string, ParsedKnowledgeDocument>,
): {errors: string[]; sourceIds: Set<string>; sourceCount: number} => {
  const errors: string[] = [];
  const manifest = CanonSourceManifestV3Schema.parse(
    parseYaml(readFileSync(resolve(root, 'source-manifest.yml'), 'utf8')) as unknown,
  );
  const sourceIds = new Set(manifest.sources.map(({source_id: sourceId}) => sourceId));
  const hashes = manifest.sources.map(({content_sha256: hash}) => hash);
  const identityDigests = manifest.sources.map(({portable_identity_digest: digest}) => digest);
  const paths = manifest.sources.map(({source_ref: sourceRef}) => sourceRef);
  if (sourceIds.size !== manifest.sources.length)
    errors.push('source-manifest.yml: source_id values must be unique.');
  if (new Set(hashes).size !== hashes.length)
    errors.push('source-manifest.yml: content_sha256 values must be unique.');
  if (new Set(identityDigests).size !== identityDigests.length)
    errors.push('source-manifest.yml: portable_identity_digest values must be unique.');
  if (new Set(paths).size !== paths.length)
    errors.push('source-manifest.yml: source_ref values must be unique.');
  const counts = {
    markdown: manifest.sources.filter(({source_type: type}) => type === 'markdown').length,
    historical_pdfs: manifest.sources.filter(
      ({source_id: id, source_type: type}) => type === 'pdf' && id.includes('-PDF-HIST-'),
    ).length,
    current_pdfs: manifest.sources.filter(
      ({source_id: id, source_type: type}) => type === 'pdf' && id.includes('-PDF-CURRENT-'),
    ).length,
    images: manifest.sources.filter(({source_type: type}) => type === 'image').length,
    total: manifest.sources.length,
  };
  for (const [field, actual] of Object.entries(counts)) {
    const declared = manifest.summary[field as keyof typeof manifest.summary];
    if (actual !== declared)
      errors.push(`source-manifest.yml: summary.${field} is ${declared}; readback is ${actual}.`);
  }
  const classifiedPdfs = counts.historical_pdfs + counts.current_pdfs;
  const allPdfs = manifest.sources.filter(({source_type: type}) => type === 'pdf').length;
  if (classifiedPdfs !== allPdfs)
    errors.push('source-manifest.yml: every PDF must be classified as current or historical.');
  const workspaceRoot = resolve(process.cwd());
  for (const source of manifest.sources) {
    if (JSON.stringify(source).toLocaleLowerCase('en').includes('benchmark'))
      errors.push(`source-manifest.yml: benchmark source forbidden (${source.source_id}).`);
    if (
      source.source_ref.startsWith('/') ||
      source.source_ref.split('/').includes('..') ||
      source.source_ref.includes('\\')
    ) {
      errors.push(`source-manifest.yml: non-portable source_ref for ${source.source_id}.`);
      continue;
    }
    const sourcePath = resolve(workspaceRoot, source.source_ref);
    if (!sourcePath.startsWith(`${workspaceRoot}${sep}`) || !statSafe(sourcePath)) {
      errors.push(`source-manifest.yml: missing source_ref for ${source.source_id}.`);
      continue;
    }
    const actualHash = createHash('sha256').update(readFileSync(sourcePath)).digest('hex');
    if (actualHash !== source.content_sha256)
      errors.push(`source-manifest.yml: content hash drift for ${source.source_id}.`);
    if (source.source_type === 'markdown') {
      const localDocument = byPath.get(portableRelative(root, sourcePath));
      if (!localDocument || localDocument.metadata.status !== 'ACTIVE')
        errors.push(
          `source-manifest.yml: ${source.source_id} does not resolve to ACTIVE Canon v3 Markdown.`,
        );
    }
  }
  return {errors, sourceIds, sourceCount: manifest.sources.length};
};
