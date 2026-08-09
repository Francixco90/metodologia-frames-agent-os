import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

import {canonicalize} from '../../core/evidence/canonical-json.ts';
import {ProjectionManifestSchema, type ParityResult} from './contracts.ts';
import {extractEmbeddedModel, parseBlueprintMarkdown} from './markdown-model.ts';
import {renderBlueprintArtifacts} from './render-blueprint.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = resolve(HERE, '../../..');
const hash = (value: string): string => createHash('sha256').update(value, 'utf8').digest('hex');

export const checkBlueprintParity = (root = DEFAULT_ROOT): ParityResult => {
  const contentDir = resolve(root, '03_artefactos/content/experience');
  const markdown = readFileSync(resolve(contentDir, 'frames-experience-blueprint.md'), 'utf8');
  const html = readFileSync(resolve(contentDir, 'frames-experience-blueprint.html'), 'utf8');
  const manifest = ProjectionManifestSchema.parse(
    JSON.parse(readFileSync(resolve(contentDir, 'projection-manifest.json'), 'utf8')),
  );
  const expected = renderBlueprintArtifacts(root);
  const sourceModel = parseBlueprintMarkdown(markdown);
  const projectedModel = extractEmbeddedModel(html);
  const digest = hash(canonicalize(sourceModel));
  const errors: string[] = [];
  if (canonicalize(sourceModel) !== canonicalize(projectedModel))
    errors.push('semantic-model-drift');
  if (digest !== manifest.content_sha256) errors.push('content-hash-drift');
  if (hash(markdown) !== manifest.source_sha256) errors.push('source-hash-drift');
  if (!html.includes(`content="${digest}"`)) errors.push('html-meta-hash-drift');
  if (!html.includes('id="projection-manifest"')) errors.push('manifest-not-visible');
  if (!html.includes('Content-Security-Policy')) errors.push('csp-missing');
  if (!html.includes('@media(prefers-reduced-motion:reduce)'))
    errors.push('reduced-motion-missing');
  if (!html.includes('@media print')) errors.push('print-style-missing');
  if (/https?:\/\//u.test(html)) errors.push('remote-reference');
  if (html !== expected.html) errors.push('projection-byte-drift');
  if (
    readFileSync(resolve(contentDir, 'projection-manifest.json'), 'utf8') !== expected.manifestJson
  ) {
    errors.push('manifest-byte-drift');
  }
  for (const {id} of sourceModel.sections) {
    if (!html.includes(`id="${id}"`)) errors.push(`section-missing:${id}`);
  }
  return {
    ok: errors.length === 0,
    contentSha256: digest,
    sectionCount: sourceModel.sections.length,
    errors,
  };
};

const invoked = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  const result = checkBlueprintParity(process.argv[2] ? resolve(process.argv[2]) : DEFAULT_ROOT);
  console.info(JSON.stringify(result));
  if (!result.ok) process.exitCode = 1;
}
