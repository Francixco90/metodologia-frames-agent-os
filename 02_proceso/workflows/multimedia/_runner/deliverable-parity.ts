import type {FramesDeliverableV1} from '../_schema/deliverable-v1.schema.ts';
import {stableStringify} from './brief-model.ts';
import {parseFramesDeliverableMarkdown} from './deliverable-model.ts';
import {renderFramesDeliverableHtml} from './deliverable-renderer.ts';

export type DeliverableParityResult = {
  status: 'PASS' | 'FAIL';
  content_sha256: string;
  issues: string[];
};

const embeddedDocument = (html: string): FramesDeliverableV1 | undefined => {
  const match =
    /<script id="frames-deliverable-data" type="application\/json">([\s\S]*?)<\/script>/u.exec(
      html,
    );
  if (!match?.[1]) return undefined;
  return JSON.parse(match[1]) as FramesDeliverableV1;
};

export const verifyDeliverableParity = (
  markdown: string,
  html: string,
): DeliverableParityResult => {
  const document = parseFramesDeliverableMarkdown(markdown);
  const issues: string[] = [];
  let embedded: FramesDeliverableV1 | undefined;
  try {
    embedded = embeddedDocument(html);
  } catch {
    issues.push('HTML_CANONICAL_JSON_INVALID');
  }
  if (!embedded) issues.push('HTML_CANONICAL_JSON_MISSING');
  else if (stableStringify(embedded) !== stableStringify(document)) {
    issues.push('HTML_CANONICAL_MODEL_MISMATCH');
  }
  if (!html.includes(`data-content-sha256="${document.frontmatter.content_sha256}"`)) {
    issues.push('HTML_CONTENT_HASH_MISMATCH');
  }
  if (html !== renderFramesDeliverableHtml(markdown)) {
    issues.push('HTML_PROJECTION_NOT_DETERMINISTIC');
  }
  return {
    status: issues.length === 0 ? 'PASS' : 'FAIL',
    content_sha256: document.frontmatter.content_sha256,
    issues,
  };
};
