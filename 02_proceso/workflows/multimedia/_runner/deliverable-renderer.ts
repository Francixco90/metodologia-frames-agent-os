import {readFileSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

import type {FramesDeliverableV1} from '../_schema/deliverable-v1.schema.ts';
import {stableStringify} from './brief-model.ts';
import {renderBriefSection, renderSectionNavigation} from './brief-markup.ts';
import {parseFramesDeliverableMarkdown} from './deliverable-model.ts';

const DEFAULT_TEMPLATE_PATH = fileURLToPath(
  new URL('../_assets/brief-document-template.html', import.meta.url),
);
const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
const safeJson = (value: unknown): string =>
  stableStringify(value).replaceAll('<', '\\u003c').replaceAll('&', '\\u0026');
const replace = (template: string, token: string, value: string): string =>
  template.replaceAll(`{{${token}}}`, value);

const renderFromModel = (document: FramesDeliverableV1, template: string): string => {
  const sections = document.sections
    .map((section, index) => renderBriefSection(section.id, section.markdown, index))
    .join('\n');
  const meta = document.frontmatter;
  const values: Record<string, string> = {
    TITLE: escapeHtml(meta.display_name),
    META_DESCRIPTION: escapeHtml(meta.purpose),
    META_DOCUMENT_TYPE: 'deliverable',
    META_SCHEMA_VERSION: meta.schema_version,
    META_MODEL_ID: meta.deliverable_id,
    META_WORKFLOW_ID: meta.workflow_id,
    META_SOURCE_COUNT: String(meta.sources.length),
    KICKER: 'MetodologIA · Entregable canónico',
    SKIP_LABEL: 'Saltar al entregable',
    DOCUMENT_ID: meta.instance_id,
    STATE: meta.state,
    NEXT_GATE: escapeHtml(meta.next_gate),
    CONTENT_ID: 'deliverable-content',
    CONTENT_HASH: meta.content_sha256,
    TOC: renderSectionNavigation(document.sections.map(({id}) => id)),
    SECTIONS: sections,
    CANONICAL_DATA_ID: 'frames-deliverable-data',
    CANONICAL_JSON: safeJson(document),
    PROJECTION_LABEL: 'Proyección determinista del entregable Markdown',
  };
  const rendered = Object.entries(values).reduce(
    (result, [token, value]) => replace(result, token, value),
    template,
  );
  const unresolved = rendered.match(/\{\{[A-Z0-9_]+\}\}/gu);
  if (unresolved)
    throw new Error(`Unresolved deliverable template tokens: ${unresolved.join(', ')}`);
  return rendered.endsWith('\n') ? rendered : `${rendered}\n`;
};

export const renderFramesDeliverableHtml = (
  markdown: string,
  template = readFileSync(DEFAULT_TEMPLATE_PATH, 'utf8'),
): string => renderFromModel(parseFramesDeliverableMarkdown(markdown), template);

export const renderFramesDeliverableFile = (inputPath: string, outputPath: string): void => {
  writeFileSync(outputPath, renderFramesDeliverableHtml(readFileSync(inputPath, 'utf8')), 'utf8');
};

const invokedPath = process.argv[1];
if (invokedPath && fileURLToPath(import.meta.url) === invokedPath) {
  const [, , inputPath, outputPath] = process.argv;
  if (!inputPath || !outputPath) {
    throw new Error('Usage: deliverable-renderer.ts <deliverable.md> <deliverable.html>');
  }
  renderFramesDeliverableFile(inputPath, outputPath);
}
