import type {RefinementCtx} from 'zod';

type PromotableDeliverable = {
  frontmatter: {
    state: string;
    fields: Array<{value: string | string[]}>;
  };
  sections: Array<{markdown: string}>;
};

const MARKERS =
  '(?:UNKNOWN|UNRESOLVED|TBD|TODO|PENDING|PENDIENTE|POR\\s+(?:DEFINIR|COMPLETAR)|NO\\s+DETERMINADO|N\\/?A)';
const MARKER_TAIL = `${MARKERS}(?:(?:\\s*(?::|_|-|–|—)\\s*|\\s+DE\\s+)[^\\n]*)?[.!]?`;
const bracketedPlaceholder = new RegExp(
  `(?:⟦|\\[\\[?|\\{\\{?|<)\\s*${MARKERS}(?:\\s*[:_-][^⟧\\]}>]*)?\\s*(?:⟧|\\]\\]?|\\}\\}?|>)`,
  'iu',
);
const lineItemPlaceholder = new RegExp(
  `(?:^|\\n)\\s*(?:[-*+]\\s+)?${MARKER_TAIL}\\s*(?=\\n|$)`,
  'iu',
);
const structuredPlaceholder = new RegExp(
  `(?:^|\\n)\\s*(?:[-*+]\\s+)?[^:\\n]{1,100}:\\s*${MARKER_TAIL}\\s*(?=\\n|$)`,
  'iu',
);

export const containsUnresolvedPlaceholder = (value: string | string[]): boolean =>
  (Array.isArray(value) ? value : [value]).some(
    (item) =>
      bracketedPlaceholder.test(item) ||
      lineItemPlaceholder.test(item) ||
      structuredPlaceholder.test(item),
  );

export const rejectPromotedDeliverablePlaceholders = (
  document: PromotableDeliverable,
  context: RefinementCtx,
): void => {
  if (['DRAFT', 'BLOCKED'].includes(document.frontmatter.state)) return;
  document.frontmatter.fields.forEach(({value}, index) => {
    if (containsUnresolvedPlaceholder(value)) {
      context.addIssue({
        code: 'custom',
        path: ['frontmatter', 'fields', index, 'value'],
        message: `MW-PLACEHOLDER001 state ${document.frontmatter.state} forbids unresolved placeholder values`,
      });
    }
  });
  document.sections.forEach(({markdown}, index) => {
    if (containsUnresolvedPlaceholder(markdown)) {
      context.addIssue({
        code: 'custom',
        path: ['sections', index, 'markdown'],
        message: `MW-PLACEHOLDER001 state ${document.frontmatter.state} forbids unresolved placeholders in body`,
      });
    }
  });
};
