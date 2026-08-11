import {resolve, sep} from 'node:path';

import {parseCareerCv} from './document-model.ts';
import {CareerCvV2Schema} from '../_schema/document-v2.schema.ts';
import type {CvSpecV1} from '../_schema/cv-spec-v1.schema.ts';
import {stableStringify} from './canonical.ts';

export const resolvePrivateArtifact = (
  projectRoot: string,
  ref: string,
  allowedPrivateRoots = ['work/private', 'work/privado'],
): string => {
  const target = resolve(projectRoot, ref);
  const allowed = allowedPrivateRoots.map((root) => resolve(projectRoot, root));
  if (!allowed.some((root) => target === root || target.startsWith(`${root}${sep}`))) {
    throw new Error(`CV_PACKAGE_PRIVATE_ROOT_REQUIRED:${ref}`);
  }
  return target;
};

export const inspectHtml = (html: string, ats: boolean): string[] => {
  const issues: string[] = [];
  if (
    !/^<!doctype html>/iu.test(html) ||
    !/<main(?:\s|>)/u.test(html) ||
    !/<h1(?:\s|>)/u.test(html)
  ) {
    issues.push('HTML_SEMANTIC_STRUCTURE');
  }
  if (/<script(?![^>]*type="application\/json")[^>]*>/iu.test(html))
    issues.push('HTML_EXECUTABLE_SCRIPT');
  if (/<(?:script|img|link|iframe)[^>]+(?:src|href)="https?:/iu.test(html))
    issues.push('HTML_REMOTE_DEPENDENCY');
  if (!/<meta[^>]+name="viewport"/iu.test(html)) issues.push('HTML_VIEWPORT_MISSING');
  if (ats && /(?:display\s*:\s*none|visibility\s*:\s*hidden)/iu.test(html))
    issues.push('ATS_HIDDEN_CONTENT');
  return issues;
};

export const sourceText = (source: ReturnType<typeof parseCareerCv>): string[] => [
  source.name,
  source.headline,
  ...source.contact_lines,
  source.summary,
  ...source.experience.flatMap((item) => [
    item.organization,
    item.role,
    item.period,
    ...(item.location ? [item.location] : []),
    ...item.achievements.map(({text}) => text),
  ]),
  ...source.skills,
  ...source.education,
];

export const inspectHtmlParity = (
  html: string,
  source: ReturnType<typeof parseCareerCv>,
): string[] => {
  const match =
    /<script id="career-document-data" type="application\/json">([\s\S]*?)<\/script>/u.exec(html);
  if (!match?.[1]) return ['HTML_CANONICAL_MODEL_MISSING'];
  try {
    const embedded = parseCareerCv(JSON.parse(match[1]));
    return embedded.content_sha256 === source.content_sha256 ? [] : ['HTML_SOURCE_PARITY_MISMATCH'];
  } catch {
    return ['HTML_CANONICAL_MODEL_INVALID'];
  }
};

export const inspectVariantSourceBinding = (
  input: unknown,
  variant: CvSpecV1['variants'][number],
  spec: CvSpecV1,
): string[] => {
  const source = CareerCvV2Schema.parse(input);
  const expected = {
    spec_id: spec.spec_id,
    spec_sha256: spec.spec_sha256,
    output_intent: spec.intent,
    variant_id: variant.variant_id,
    language: variant.language,
    audience: variant.audience,
    design_profile: variant.design_profile,
    page_budget: variant.page_budget,
    section_order: spec.section_order,
    keyword_policy: spec.keyword_policy,
    deliberate_omissions: spec.deliberate_omissions,
    gaps: spec.gaps,
    attribution_limits: spec.attribution_limits,
  };
  const observed = Object.fromEntries(
    Object.keys(expected).map((key) => [key, source[key as keyof typeof source]]),
  );
  return stableStringify(observed) === stableStringify(expected)
    ? []
    : ['SOURCE_VARIANT_POLICY_MISMATCH'];
};
