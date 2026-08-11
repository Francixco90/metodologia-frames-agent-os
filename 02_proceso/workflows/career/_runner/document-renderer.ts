import {readFileSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

import type {CareerCvV1, CareerLetterV1} from '../_schema/document-v1.schema.ts';
import type {CareerCvV2} from '../_schema/document-v2.schema.ts';
import {escapeHtml, safeJson} from './canonical.ts';
import {parseCareerCv, parseCareerLetter} from './document-model.ts';
import {assertCareerEvidence} from './evidence-gate.ts';

const TEMPLATE = fileURLToPath(new URL('../_assets/document-template.html', import.meta.url));
const ATS_TEMPLATE = fileURLToPath(
  new URL('../_assets/ats-document-template.html', import.meta.url),
);
const li = (values: readonly string[]): string =>
  values.map((value) => `<li>${escapeHtml(value)}</li>`).join('');
const replace = (template: string, values: Record<string, string>): string =>
  Object.entries(values).reduce(
    (result, [token, value]) => result.replaceAll(`{{${token}}}`, value),
    template,
  );

const renderShell = (
  document: CareerCvV1 | CareerCvV2 | CareerLetterV1,
  title: string,
  subtitle: string,
  body: string,
  kind: 'cv' | 'letter',
  template: string,
): string => {
  const profile = document.design_profile;
  const visibleFooter =
    profile === 'candidate-neutral-ats'
      ? ''
      : profile === 'metodologia-career'
        ? 'Generado metodológicamente por MetodologIA · RENDERED_DRAFT'
        : `Identidad autorizada: ${document.authorized_brand?.label ?? 'BLOCKED'}`;
  const output = replace(template, {
    LANG: document.language,
    TITLE: escapeHtml(title),
    DESCRIPTION: escapeHtml(subtitle),
    DOCUMENT_ID: document.document_id,
    CONTENT_HASH: document.content_sha256,
    SPEC_HASH: document.schema_version === 'career-cv-v2' ? document.spec_sha256 : '',
    KIND: kind,
    PROFILE: profile,
    SUBTITLE: escapeHtml(subtitle),
    BODY: body,
    VISIBLE_FOOTER: escapeHtml(visibleFooter),
    CANONICAL_JSON: safeJson(document),
  });
  const unresolved = output.match(/\{\{[A-Z0-9_]+\}\}/gu);
  if (unresolved) throw new Error(`Unresolved career document tokens: ${unresolved.join(', ')}`);
  return output.endsWith('\n') ? output : `${output}\n`;
};

export const renderCareerCvHtml = (
  input: unknown,
  evidenceBank: unknown,
  template = readFileSync(TEMPLATE, 'utf8'),
): string => {
  const cv = parseCareerCv(input);
  assertCareerEvidence(cv, evidenceBank);
  const labels =
    cv.language === 'es'
      ? {
          summary: 'Perfil',
          experience: 'Experiencia',
          skills: 'Capacidades',
          education: 'Formación',
        }
      : cv.language === 'pt'
        ? {
            summary: 'Perfil',
            experience: 'Experiência',
            skills: 'Competências',
            education: 'Formação',
          }
        : {
            summary: 'Profile',
            experience: 'Experience',
            skills: 'Capabilities',
            education: 'Education',
          };
  const experience = cv.experience
    .map(
      (item) =>
        `<article><header><h2>${escapeHtml(item.role)}</h2><p><strong>${escapeHtml(item.organization)}</strong> · ${escapeHtml(item.period)}${item.location ? ` · ${escapeHtml(item.location)}` : ''}</p></header><ul>${item.achievements.map((claim) => `<li data-claim-id="${claim.claim_id}">${escapeHtml(claim.text)}</li>`).join('')}</ul></article>`,
    )
    .join('');
  const sections = {
    summary: `<section aria-labelledby="summary"><h2 id="summary">${labels.summary}</h2><p>${escapeHtml(cv.summary)}</p></section>`,
    experience: `<section aria-labelledby="experience"><h2 id="experience">${labels.experience}</h2>${experience}</section>`,
    skills: `<section aria-labelledby="skills"><h2 id="skills">${labels.skills}</h2><ul class="tags">${li(cv.skills)}</ul></section>`,
    education: cv.education.length
      ? `<section aria-labelledby="education"><h2 id="education">${labels.education}</h2><ul>${li(cv.education)}</ul></section>`
      : '',
  };
  const order =
    cv.schema_version === 'career-cv-v2'
      ? cv.section_order
      : (['summary', 'experience', 'skills', 'education'] as const);
  const body = order.map((section) => sections[section]).join('');
  return renderShell(
    cv,
    cv.name,
    `${cv.headline} · ${cv.contact_lines.join(' · ')}`,
    body,
    'cv',
    template,
  );
};

export const renderCareerCvAtsHtml = (
  input: unknown,
  evidenceBank: unknown,
  template = readFileSync(ATS_TEMPLATE, 'utf8'),
): string => {
  const cv = parseCareerCv(input);
  if (cv.design_profile !== 'candidate-neutral-ats') {
    throw new Error('ATS_HTML_REQUIRES_CANDIDATE_NEUTRAL_PROFILE');
  }
  return renderCareerCvHtml(cv, evidenceBank, template);
};

export const renderCareerCvExecutiveHtml = (
  input: unknown,
  evidenceBank: unknown,
  template = readFileSync(TEMPLATE, 'utf8'),
): string => {
  const cv = parseCareerCv(input);
  if (cv.design_profile === 'candidate-neutral-ats') {
    throw new Error('EXECUTIVE_HTML_REQUIRES_PRESENTATION_PROFILE');
  }
  return renderCareerCvHtml(cv, evidenceBank, template);
};

export const renderCareerLetterHtml = (
  input: unknown,
  evidenceBank: unknown,
  template = readFileSync(TEMPLATE, 'utf8'),
): string => {
  const letter = parseCareerLetter(input);
  assertCareerEvidence(letter, evidenceBank);
  const body = `<section class="letter"><p class="addressee">${escapeHtml(letter.addressee)}</p>${letter.paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('')}</section>`;
  return renderShell(
    letter,
    letter.subject ?? 'Carta de presentación',
    `${letter.channel} · ${letter.application_id}`,
    body,
    'letter',
    template,
  );
};

export const verifyCareerDocumentParity = (
  input: unknown,
  evidenceBank: unknown,
  html: string,
): string[] => {
  const record = input as {schema_version?: string};
  const expected =
    record.schema_version === 'career-cv-v1' || record.schema_version === 'career-cv-v2'
      ? renderCareerCvHtml(input, evidenceBank)
      : renderCareerLetterHtml(input, evidenceBank);
  const match =
    /<script id="career-document-data" type="application\/json">([\s\S]*?)<\/script>/u.exec(html);
  const issues: string[] = [];
  if (!match?.[1]) issues.push('CANONICAL_MODEL_MISSING');
  else if (stable(match[1]) !== stable(safeJson(input))) issues.push('SEMANTIC_MODEL_MISMATCH');
  if (html !== expected) issues.push('HTML_PROJECTION_NOT_DETERMINISTIC');
  return issues;
};
const stable = (value: string): string => JSON.stringify(JSON.parse(value));

export const renderCareerDocumentFile = (
  inputPath: string,
  evidenceBankPath: string,
  outputPath: string,
): void => {
  const value = JSON.parse(readFileSync(inputPath, 'utf8')) as {schema_version?: string};
  const evidenceBank: unknown = JSON.parse(readFileSync(evidenceBankPath, 'utf8'));
  const html =
    value.schema_version === 'career-cv-v1' || value.schema_version === 'career-cv-v2'
      ? renderCareerCvHtml(value, evidenceBank)
      : renderCareerLetterHtml(value, evidenceBank);
  writeFileSync(outputPath, html, 'utf8');
};
