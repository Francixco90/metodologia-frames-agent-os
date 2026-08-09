import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {dirname, relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

import {parse} from 'yaml';

import {canonicalize} from '../../core/evidence/canonical-json.ts';
import {ProjectionManifestSchema, type ProjectionManifest} from './contracts.ts';
import {renderExperienceHtml} from './html-shell.ts';
import {parseBlueprintMarkdown} from './markdown-model.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = resolve(HERE, '../../..');
const portable = (value: string): string => value.replaceAll('\\', '/');
const hash = (value: string): string => createHash('sha256').update(value, 'utf8').digest('hex');

export const renderBlueprint = (root = DEFAULT_ROOT): ProjectionManifest => {
  const artifacts = renderBlueprintArtifacts(root);
  writeFileSync(artifacts.outputPath, artifacts.html, 'utf8');
  writeFileSync(artifacts.manifestPath, artifacts.manifestJson, 'utf8');
  return artifacts.manifest;
};

export const renderBlueprintArtifacts = (root = DEFAULT_ROOT) => {
  const contentDir = resolve(root, '03_artefactos/content/experience');
  const sourcePath = resolve(contentDir, 'frames-experience-blueprint.md');
  const outputPath = resolve(contentDir, 'frames-experience-blueprint.html');
  const manifestPath = resolve(contentDir, 'projection-manifest.json');
  const source = readFileSync(sourcePath, 'utf8');
  const model = parseBlueprintMarkdown(source);
  const manifest = ProjectionManifestSchema.parse({
    schema_version: 'experience-projection-manifest-v1',
    blueprint_id: model.blueprint_id,
    source_ref: portable(relative(root, sourcePath)),
    projection_ref: portable(relative(root, outputPath)),
    source_sha256: hash(source),
    content_sha256: hash(canonicalize(model)),
    section_count: model.sections.length,
    section_order: model.sections.map(({id}) => id),
    design_profile: 'metodologia-experience-v1',
    typography_status: 'system-fallback',
    offline: true,
    semantic_parity: true,
    state: model.state,
    next_gate: model.next_gate,
  });
  const registry = parse(readFileSync(resolve(HERE, 'component-registry.yml'), 'utf8')) as {
    components: {id: string; purpose: string}[];
  };
  const service = parse(readFileSync(resolve(HERE, 'service-blueprint.yml'), 'utf8')) as {
    stages: {moment: string; frontstage: string; backstage: string; evidence: string}[];
  };
  if (registry.components.length !== 11) {
    throw new Error(`EXP-COMPONENT-COUNT: expected 11, found ${registry.components.length}`);
  }
  return {
    html: renderExperienceHtml(model, manifest, registry, service),
    manifest,
    manifestJson: `${JSON.stringify(manifest, null, 2)}\n`,
    manifestPath,
    outputPath,
  };
};

const invoked = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  const manifest = renderBlueprint(process.argv[2] ? resolve(process.argv[2]) : DEFAULT_ROOT);
  console.info(`OK ${manifest.projection_ref} ${manifest.content_sha256}`);
}
