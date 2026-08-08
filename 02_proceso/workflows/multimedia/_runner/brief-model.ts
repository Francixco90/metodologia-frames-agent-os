import {createHash} from 'node:crypto';

import {parse, stringify} from 'yaml';

import {
  FRAMES_BRIEF_SECTIONS,
  FramesBriefFrontmatterV1Schema,
  FramesBriefV1Schema,
  type FramesBriefFrontmatterV1,
  type FramesBriefV1,
} from '../_schema/brief-v1.schema.ts';

export type FramesBriefDraftV1 = Omit<FramesBriefFrontmatterV1, 'content_sha256'>;

const normalized = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(normalized);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
        .map(([key, item]) => [key, normalized(item)]),
    );
  }
  return value;
};

export const stableStringify = (value: unknown): string => JSON.stringify(normalized(value));
export const sha256Text = (value: string): string =>
  createHash('sha256').update(value, 'utf8').digest('hex');

export const briefHashPayload = (brief: FramesBriefV1): unknown => {
  const frontmatter = Object.fromEntries(
    Object.entries(brief.frontmatter).filter(([key]) => key !== 'content_sha256'),
  );
  return {frontmatter, sections: brief.sections};
};

export const calculateBriefContentHash = (brief: FramesBriefV1): string =>
  sha256Text(stableStringify(briefHashPayload(brief)));

const splitSections = (body: string): FramesBriefV1['sections'] => {
  const chunks: Array<{id: string; lines: string[]}> = [];
  let current: {id: string; lines: string[]} | undefined;
  let fenced = false;

  for (const line of body.replaceAll('\r\n', '\n').split('\n')) {
    if (/^```/u.test(line.trim())) fenced = !fenced;
    const heading = !fenced ? /^##\s+(.+?)\s*$/u.exec(line) : null;
    if (heading?.[1]) {
      current = {id: heading[1], lines: []};
      chunks.push(current);
    } else if (current) {
      current.lines.push(line);
    } else if (line.trim() !== '') {
      throw new Error('FramesBriefV1 does not allow content before the first H2 section');
    }
  }

  const sections = chunks.map(({id, lines}) => ({id, markdown: lines.join('\n').trim()}));
  if (sections.length !== FRAMES_BRIEF_SECTIONS.length) {
    throw new Error(`FramesBriefV1 requires ${FRAMES_BRIEF_SECTIONS.length} ordered sections`);
  }
  sections.forEach((section, index) => {
    if (section.id !== FRAMES_BRIEF_SECTIONS[index]) {
      throw new Error(`Expected section ${index + 1}: ${FRAMES_BRIEF_SECTIONS[index]}`);
    }
  });
  return FramesBriefV1Schema.shape.sections.parse(sections);
};

export const parseFramesBriefMarkdown = (markdown: string): FramesBriefV1 => {
  const normalizedMarkdown = markdown.replaceAll('\r\n', '\n');
  const match = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/u.exec(normalizedMarkdown);
  if (!match?.[1] || match[2] === undefined) {
    throw new Error('FramesBriefV1 requires YAML frontmatter delimited by ---');
  }
  const frontmatter = FramesBriefFrontmatterV1Schema.parse(parse(match[1]));
  const brief = FramesBriefV1Schema.parse({frontmatter, sections: splitSections(match[2])});
  const actualHash = calculateBriefContentHash(brief);
  if (actualHash !== frontmatter.content_sha256) {
    throw new Error(`FramesBriefV1 content_sha256 mismatch: expected ${actualHash}`);
  }
  return brief;
};

export const createFramesBriefMarkdown = (
  draft: FramesBriefDraftV1,
  sections: FramesBriefV1['sections'],
): string => {
  const provisional = FramesBriefV1Schema.parse({
    frontmatter: {...draft, content_sha256: '0'.repeat(64)},
    sections,
  });
  const content_sha256 = calculateBriefContentHash(provisional);
  const frontmatter = {...draft, content_sha256};
  const body = sections.map(({id, markdown}) => `## ${id}\n\n${markdown.trim()}`).join('\n\n');
  return `---\n${stringify(frontmatter, {lineWidth: 0}).trim()}\n---\n\n${body}\n`;
};
