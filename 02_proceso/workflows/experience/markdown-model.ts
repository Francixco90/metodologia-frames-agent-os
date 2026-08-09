import {parse} from 'yaml';

import {BlueprintModelSchema, type BlueprintModel} from './contracts.ts';

const SECTION = /^##\s+(\d{1,2})\.\s+(.+)$/u;

const splitFrontmatter = (markdown: string): {frontmatter: unknown; body: string} => {
  const normalized = markdown.replaceAll('\r\n', '\n');
  const match = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/u.exec(normalized);
  if (!match?.[1] || match[2] === undefined) {
    throw new Error('EXP-MD-FRONTMATTER: blueprint requires YAML frontmatter');
  }
  return {frontmatter: parse(match[1]) as unknown, body: match[2]};
};

export const parseBlueprintMarkdown = (markdown: string): BlueprintModel => {
  const {frontmatter, body} = splitFrontmatter(markdown);
  const meta = BlueprintModelSchema.omit({sections: true}).parse(frontmatter);
  const lines = body.split('\n');
  const sections: BlueprintModel['sections'] = [];
  let active: BlueprintModel['sections'][number] | undefined;
  for (const line of lines) {
    const heading = SECTION.exec(line);
    if (heading?.[1] && heading[2]) {
      if (active) sections.push({...active, markdown: active.markdown.trim()});
      const number = Number.parseInt(heading[1], 10);
      active = {id: `section-${String(number).padStart(2, '0')}`, title: heading[2], markdown: ''};
      continue;
    }
    if (active) active.markdown += `${line}\n`;
  }
  if (active) sections.push({...active, markdown: active.markdown.trim()});
  const expected = sections.map((_, index) => `section-${String(index + 1).padStart(2, '0')}`);
  if (sections.some((section, index) => section.id !== expected[index])) {
    throw new Error('EXP-MD-ORDER: sections must be contiguous and start at 1');
  }
  return BlueprintModelSchema.parse({...meta, sections});
};

export const extractEmbeddedModel = (html: string): BlueprintModel => {
  const match = /<script id="canonical-model" type="application\/json">([\s\S]*?)<\/script>/u.exec(
    html,
  );
  if (!match?.[1]) throw new Error('EXP-HTML-MODEL: canonical model is missing');
  return BlueprintModelSchema.parse(JSON.parse(match[1].replaceAll('\\u003c', '<')));
};
