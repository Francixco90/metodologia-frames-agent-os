import {parse} from 'yaml';
import {z} from 'zod';

import {CareerGateIdSchema, CareerWorkflowIdSchema} from '../_schema/primitives-v1.schema.ts';
import {escapeHtml, safeJson, sha256Text, stableStringify} from './canonical.ts';
import {renderMarkdownFragment} from './markup.ts';

const FrontmatterSchema = z.strictObject({
  schema_version: z.literal('career-template-v1'),
  template_id: z.string().regex(/^TPL-C[0-9]{2}-[A-Z0-9-]{3,70}$/u),
  workflow_id: CareerWorkflowIdSchema,
  state: z.enum(['DRAFT', 'BRIEF_DRAFT']),
  next_gate: CareerGateIdSchema,
});

export type CareerWorkflowTemplateModel = {
  schema_version: 'career-template-projection-v1';
  template_id: string;
  workflow_id: z.infer<typeof CareerWorkflowIdSchema>;
  state: 'DRAFT' | 'BRIEF_DRAFT';
  next_gate: string;
  title: string;
  source_markdown_sha256: string;
  sections: readonly {number: number; heading: string; markdown: string}[];
  content_sha256: string;
};

export const parseCareerWorkflowTemplate = (source: string): CareerWorkflowTemplateModel => {
  const normalized = source.normalize('NFC').replaceAll('\r\n', '\n');
  const match = /^---\n([\s\S]*?)\n---\n\n# ([^\n]+)\n([\s\S]*)$/u.exec(normalized);
  if (!match?.[1] || !match[2] || match[3] === undefined) {
    throw new Error('CAREER-TEMPLATE-001 frontmatter and one H1 required');
  }
  const sections: Array<{number: number; heading: string; markdown: string}> = [];
  const parts = match[3].split(/^## ([0-9]{1,2})\. ([^\n]+)\n/gmu);
  if (parts.shift()?.trim()) throw new Error('CAREER-TEMPLATE-002 content before first H2');
  while (parts.length > 0) {
    const number = Number(parts.shift());
    const heading = parts.shift()?.trim() ?? '';
    const markdown = parts.shift()?.trim() ?? '';
    sections.push({number, heading, markdown});
  }
  if (sections.length !== 12 || sections.some(({number}, index) => number !== index + 1)) {
    throw new Error('CAREER-TEMPLATE-003 exactly 12 ordered sections required');
  }
  if (sections.some(({heading, markdown}) => !heading || !markdown)) {
    throw new Error('CAREER-TEMPLATE-004 empty section');
  }
  const frontmatter = FrontmatterSchema.parse(parse(match[1]));
  const payload = {
    schema_version: 'career-template-projection-v1' as const,
    template_id: frontmatter.template_id,
    workflow_id: frontmatter.workflow_id,
    state: frontmatter.state,
    next_gate: frontmatter.next_gate,
    title: match[2].trim(),
    source_markdown_sha256: sha256Text(normalized),
    sections,
  };
  return {...payload, content_sha256: sha256Text(stableStringify(payload))};
};

export const renderCareerWorkflowTemplateHtml = (source: string): string => {
  const model = parseCareerWorkflowTemplate(source);
  const sections = model.sections
    .map(
      ({number, heading, markdown}) =>
        `<section id="section-${number}"><p class="eyebrow">${String(number).padStart(2, '0')}</p><h2>${escapeHtml(heading)}</h2>${renderMarkdownFragment(markdown)}</section>`,
    )
    .join('\n');
  return `<!doctype html>
<!-- prettier-ignore -->
<html lang="es" data-schema="career-template-projection-v1">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="generator" content="MetodologIA Frames Career OS"><meta name="template-id" content="${model.template_id}">
<meta name="workflow-id" content="${model.workflow_id}"><meta name="content-sha256" content="${model.content_sha256}">
<meta name="source-markdown-sha256" content="${model.source_markdown_sha256}">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:">
<title>${escapeHtml(model.title)} · ${model.workflow_id}</title>
<style>:root{color-scheme:light;--navy:#122562;--blue:#137dc5;--gold:#ffd700;--ink:#17223b;--soft:#eef6ff}*{box-sizing:border-box}body{margin:0;color:var(--ink);font:16px/1.6 Montserrat,Arial,sans-serif}header{padding:3rem max(1.5rem,6vw);background:var(--navy);color:#fff}h1,h2{font-family:Poppins,Arial,sans-serif;font-weight:700}main{max-width:70rem;margin:auto;padding:2rem}section{padding:1.5rem 0;border-bottom:1px solid #cfdded}.eyebrow{color:#765f00;font-weight:700}a:focus-visible{outline:3px solid var(--blue);outline-offset:3px}@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;animation:none!important}}@media print{header{padding:0;background:#fff;color:var(--navy)}main{padding:0}section{break-inside:avoid}}</style>
</head><body><header><p>${model.workflow_id} · ${model.state}</p><h1>${escapeHtml(model.title)}</h1><p>Siguiente gate: ${model.next_gate}</p></header><main>${sections}</main>
<script id="career-workflow-template-data" type="application/json">${safeJson(model)}</script></body></html>
`;
};

export const verifyCareerWorkflowTemplateParity = (source: string, html: string): string[] => {
  const issues: string[] = [];
  const match =
    /<script id="career-workflow-template-data" type="application\/json">([\s\S]*?)<\/script>/u.exec(
      html,
    );
  if (!match?.[1]) issues.push('CANONICAL_MODEL_MISSING');
  else if (
    stableStringify(JSON.parse(match[1])) !== stableStringify(parseCareerWorkflowTemplate(source))
  ) {
    issues.push('SEMANTIC_MODEL_MISMATCH');
  }
  if (html !== renderCareerWorkflowTemplateHtml(source)) issues.push('HTML_PROJECTION_DRIFT');
  return issues;
};
