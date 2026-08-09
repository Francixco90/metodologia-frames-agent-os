import {readFileSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

import {escapeHtml, safeJson, stableStringify} from './canonical.ts';
import {parseCareerBriefMarkdown} from './brief-model.ts';
import {renderMarkdownFragment} from './markup.ts';

const DEFAULT_TEMPLATE = fileURLToPath(new URL('../_assets/brief-template.html', import.meta.url));
const replace = (template: string, token: string, value: string): string =>
  template.replaceAll(`{{${token}}}`, value);

export const renderCareerBriefHtml = (
  markdown: string,
  template = readFileSync(DEFAULT_TEMPLATE, 'utf8'),
): string => {
  const brief = parseCareerBriefMarkdown(markdown);
  const navigation = brief.sections
    .map(({id}, index) => `<a href="#section-${index + 1}">${escapeHtml(id)}</a>`)
    .join('');
  const sections = brief.sections
    .map(
      ({id, markdown: body}, index) =>
        `<section id="section-${index + 1}"><span class="eyebrow">${String(index + 1).padStart(2, '0')}</span><h2>${escapeHtml(id)}</h2>${renderMarkdownFragment(body)}</section>`,
    )
    .join('\n');
  const values = {
    TITLE: escapeHtml(`Career brief · ${brief.frontmatter.brief_kind}`),
    DESCRIPTION: escapeHtml(brief.frontmatter.request),
    DOCUMENT_ID: brief.frontmatter.brief_id,
    STATE: brief.frontmatter.state,
    NEXT_GATE: brief.frontmatter.next_gate,
    CONTENT_HASH: brief.frontmatter.content_sha256,
    NAVIGATION: navigation,
    SECTIONS: sections,
    CANONICAL_JSON: safeJson(brief),
  };
  const rendered = Object.entries(values).reduce(
    (result, [token, value]) => replace(result, token, value),
    template,
  );
  const unresolved = rendered.match(/\{\{[A-Z0-9_]+\}\}/gu);
  if (unresolved) throw new Error(`Unresolved CareerBrief tokens: ${unresolved.join(', ')}`);
  return rendered.endsWith('\n') ? rendered : `${rendered}\n`;
};

export const verifyCareerBriefParity = (markdown: string, html: string): string[] => {
  const expected = renderCareerBriefHtml(markdown);
  const match =
    /<script id="career-brief-data" type="application\/json">([\s\S]*?)<\/script>/u.exec(html);
  const issues: string[] = [];
  if (!match?.[1]) issues.push('CANONICAL_MODEL_MISSING');
  else if (
    stableStringify(JSON.parse(match[1])) !== stableStringify(parseCareerBriefMarkdown(markdown))
  ) {
    issues.push('SEMANTIC_MODEL_MISMATCH');
  }
  if (html !== expected) issues.push('HTML_PROJECTION_NOT_DETERMINISTIC');
  return issues;
};

export const renderCareerBriefFile = (inputPath: string, outputPath: string): void => {
  writeFileSync(outputPath, renderCareerBriefHtml(readFileSync(inputPath, 'utf8')), 'utf8');
};
