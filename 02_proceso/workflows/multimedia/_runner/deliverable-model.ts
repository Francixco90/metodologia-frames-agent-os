import {parse, stringify} from 'yaml';

import {
  FRAMES_DELIVERABLE_SECTIONS,
  FramesDeliverableFrontmatterV1Schema,
  FramesDeliverableV1Schema,
  type FramesDeliverableFrontmatterV1,
  type FramesDeliverableV1,
} from '../_schema/deliverable-v1.schema.ts';
import {sha256Text, stableStringify} from './brief-model.ts';

export type FramesDeliverableDraftV1 = Omit<FramesDeliverableFrontmatterV1, 'content_sha256'>;

export const deliverableHashPayload = (document: FramesDeliverableV1): unknown => ({
  frontmatter: Object.fromEntries(
    Object.entries(document.frontmatter).filter(([key]) => key !== 'content_sha256'),
  ),
  sections: document.sections,
});

export const calculateDeliverableContentHash = (document: FramesDeliverableV1): string =>
  sha256Text(stableStringify(deliverableHashPayload(document)));

const splitSections = (body: string): FramesDeliverableV1['sections'] => {
  const chunks: Array<{id: string; lines: string[]}> = [];
  let current: {id: string; lines: string[]} | undefined;
  let fenced = false;
  for (const line of body.replaceAll('\r\n', '\n').split('\n')) {
    if (/^```/u.test(line.trim())) fenced = !fenced;
    const heading = !fenced ? /^##\s+(.+?)\s*$/u.exec(line) : null;
    if (heading?.[1]) {
      current = {id: heading[1], lines: []};
      chunks.push(current);
    } else if (current) current.lines.push(line);
    else if (line.trim()) throw new Error('FramesDeliverableV1 forbids content before first H2');
  }
  const sections = chunks.map(({id, lines}) => ({id, markdown: lines.join('\n').trim()}));
  if (sections.length !== FRAMES_DELIVERABLE_SECTIONS.length) {
    throw new Error(`FramesDeliverableV1 requires ${FRAMES_DELIVERABLE_SECTIONS.length} sections`);
  }
  sections.forEach((section, index) => {
    if (section.id !== FRAMES_DELIVERABLE_SECTIONS[index]) {
      throw new Error(`Expected section ${index + 1}: ${FRAMES_DELIVERABLE_SECTIONS[index]}`);
    }
  });
  return FramesDeliverableV1Schema.shape.sections.parse(sections);
};

export const parseFramesDeliverableMarkdown = (markdown: string): FramesDeliverableV1 => {
  const match = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/u.exec(markdown.replaceAll('\r\n', '\n'));
  if (!match?.[1] || match[2] === undefined) {
    throw new Error('FramesDeliverableV1 requires YAML frontmatter delimited by ---');
  }
  const frontmatter = FramesDeliverableFrontmatterV1Schema.parse(parse(match[1]));
  const document = FramesDeliverableV1Schema.parse({
    frontmatter,
    sections: splitSections(match[2]),
  });
  const actualHash = calculateDeliverableContentHash(document);
  if (actualHash !== frontmatter.content_sha256) {
    throw new Error(`FramesDeliverableV1 content_sha256 mismatch: expected ${actualHash}`);
  }
  return document;
};

export const createFramesDeliverableMarkdown = (
  draft: FramesDeliverableDraftV1,
  sections: FramesDeliverableV1['sections'],
): string => {
  const provisional = FramesDeliverableV1Schema.parse({
    frontmatter: {...draft, content_sha256: '0'.repeat(64)},
    sections,
  });
  const frontmatter = {...draft, content_sha256: calculateDeliverableContentHash(provisional)};
  const body = sections.map(({id, markdown}) => `## ${id}\n\n${markdown.trim()}`).join('\n\n');
  return `---\n${stringify(frontmatter, {lineWidth: 0}).trim()}\n---\n\n${body}\n`;
};
