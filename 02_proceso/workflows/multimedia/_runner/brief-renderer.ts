import {readFileSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

import type {FramesBriefV1} from '../_schema/brief-v1.schema.ts';
import {parseFramesBriefMarkdown, stableStringify} from './brief-model.ts';
import {renderBriefSection, renderSectionNavigation} from './brief-markup.ts';

const DEFAULT_TEMPLATE_PATH = fileURLToPath(
  new URL('../_assets/brief-document-template.html', import.meta.url),
);

const htmlSafeJson = (value: unknown): string =>
  stableStringify(value).replaceAll('<', '\\u003c').replaceAll('&', '\\u0026');

const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const replaceToken = (template: string, token: string, value: string): string =>
  template.replaceAll(`{{${token}}}`, value);

const renderFromModel = (brief: FramesBriefV1, template: string): string => {
  const sections = brief.sections
    .map((section, index) => renderBriefSection(section.id, section.markdown, index))
    .join('\n');
  const values: Record<string, string> = {
    TITLE: escapeHtml(`Brief · ${brief.frontmatter.intent.content_class}`),
    META_DESCRIPTION: escapeHtml(brief.frontmatter.objective),
    META_DOCUMENT_TYPE: 'brief',
    META_SCHEMA_VERSION: brief.frontmatter.schema_version,
    META_MODEL_ID: brief.frontmatter.brief_id,
    META_WORKFLOW_ID: brief.frontmatter.workflow_selected.join(','),
    META_SOURCE_COUNT: String(brief.frontmatter.sources.length),
    KICKER: 'MetodologIA · Brief canónico',
    SKIP_LABEL: 'Saltar al brief',
    DOCUMENT_ID: brief.frontmatter.brief_id,
    STATE: brief.frontmatter.state,
    NEXT_GATE: escapeHtml(brief.frontmatter.next_gate),
    CONTENT_ID: 'brief-content',
    CONTENT_HASH: brief.frontmatter.content_sha256,
    TOC: renderSectionNavigation(brief.sections.map(({id}) => id)),
    SECTIONS: sections,
    CANONICAL_DATA_ID: 'frames-brief-data',
    CANONICAL_JSON: htmlSafeJson(brief),
    PROJECTION_LABEL: 'Proyección determinista del brief Markdown',
  };
  const rendered = Object.entries(values).reduce(
    (result, [token, value]) => replaceToken(result, token, value),
    template,
  );
  const unresolved = rendered.match(/\{\{[A-Z0-9_]+\}\}/gu);
  if (unresolved) throw new Error(`Unresolved brief template tokens: ${unresolved.join(', ')}`);
  return rendered.endsWith('\n') ? rendered : `${rendered}\n`;
};

export const renderFramesBriefHtml = (
  markdown: string,
  template = readFileSync(DEFAULT_TEMPLATE_PATH, 'utf8'),
): string => renderFromModel(parseFramesBriefMarkdown(markdown), template);

export const renderFramesBriefFile = (inputPath: string, outputPath: string): void => {
  const markdown = readFileSync(inputPath, 'utf8');
  writeFileSync(outputPath, renderFramesBriefHtml(markdown), 'utf8');
};

const invokedPath = process.argv[1];
if (invokedPath && fileURLToPath(import.meta.url) === invokedPath) {
  const [, , inputPath, outputPath] = process.argv;
  if (!inputPath || !outputPath) {
    throw new Error('Usage: brief-renderer.ts <brief.md> <brief.html>');
  }
  renderFramesBriefFile(inputPath, outputPath);
}
