import {parse, stringify} from 'yaml';

import {
  CAREER_BRIEF_SECTIONS,
  CareerBriefFrontmatterV1Schema,
  CareerBriefV1Schema,
  type CareerBriefFrontmatterV1,
  type CareerBriefV1,
} from '../_schema/brief-v1.schema.ts';
import {sha256Text, stableStringify} from './canonical.ts';

export type CareerBriefDraftV1 = Omit<CareerBriefFrontmatterV1, 'content_sha256'>;

const hashPayload = (brief: CareerBriefV1): unknown => ({
  frontmatter: Object.fromEntries(
    Object.entries(brief.frontmatter).filter(([key]) => key !== 'content_sha256'),
  ),
  sections: brief.sections,
});

export const calculateCareerBriefHash = (brief: CareerBriefV1): string =>
  sha256Text(stableStringify(hashPayload(brief)));

const parseSections = (body: string): CareerBriefV1['sections'] => {
  const sections: Array<{id: string; markdown: string}> = [];
  let id: string | undefined;
  let lines: string[] = [];
  const flush = (): void => {
    if (id) sections.push({id, markdown: lines.join('\n').trim()});
  };
  for (const line of body.replaceAll('\r\n', '\n').split('\n')) {
    const heading = /^##\s+(.+?)\s*$/u.exec(line);
    if (heading?.[1]) {
      flush();
      id = heading[1];
      lines = [];
    } else if (id) lines.push(line);
    else if (line.trim()) throw new Error('CareerBrief forbids content before the first H2');
  }
  flush();
  return CareerBriefV1Schema.shape.sections.parse(sections);
};

export const parseCareerBriefMarkdown = (markdown: string): CareerBriefV1 => {
  const match = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/u.exec(markdown.replaceAll('\r\n', '\n'));
  if (!match?.[1] || match[2] === undefined) throw new Error('CareerBrief requires frontmatter');
  const brief = CareerBriefV1Schema.parse({
    frontmatter: CareerBriefFrontmatterV1Schema.parse(parse(match[1])),
    sections: parseSections(match[2]),
  });
  if (calculateCareerBriefHash(brief) !== brief.frontmatter.content_sha256) {
    throw new Error('CareerBrief content_sha256 mismatch');
  }
  return brief;
};

export const createCareerBriefMarkdown = (
  draft: CareerBriefDraftV1,
  content: Readonly<Record<(typeof CAREER_BRIEF_SECTIONS)[number], string>>,
): string => {
  const sections = CAREER_BRIEF_SECTIONS.map((id) => ({id, markdown: content[id]}));
  const provisional = CareerBriefV1Schema.parse({
    frontmatter: {...draft, content_sha256: '0'.repeat(64)},
    sections,
  });
  const frontmatter = {...draft, content_sha256: calculateCareerBriefHash(provisional)};
  const body = sections.map(({id, markdown}) => `## ${id}\n\n${markdown.trim()}`).join('\n\n');
  return `---\n${stringify(frontmatter, {lineWidth: 0}).trim()}\n---\n\n${body}\n`;
};
