import {escapeHtml} from '../../../scripts/lib/certificate-utils';

export const CERTIFICATION_STATEMENT_MARKER = 'renderer-0.4.1';

const CERTIFICATION_STATEMENT_SLOT = /<p class="certificate-statement">[\s\S]*?<\/p>/gu;

export function visibleCertificationStatementMarkup(statement: string): string {
  return `<p class="certificate-statement" data-certification-statement-bound="${CERTIFICATION_STATEMENT_MARKER}">${escapeHtml(statement)}</p>`;
}

export function bindVisibleCertificationStatement(html: string, statement: string): string {
  const slots = [...html.matchAll(CERTIFICATION_STATEMENT_SLOT)];
  if (slots.length !== 1) {
    throw new Error(
      `Template must contain exactly one certificate-statement slot; found ${slots.length}.`,
    );
  }
  return html.replace(CERTIFICATION_STATEMENT_SLOT, visibleCertificationStatementMarkup(statement));
}
