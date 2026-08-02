import {createHash} from 'node:crypto';
import {readFileSync, realpathSync, statSync} from 'node:fs';
import {relative, resolve, sep} from 'node:path';

import {isScalar, parseDocument, visit} from 'yaml';

import {
  CanonicalContentDocumentV1Schema,
  CanonicalContentFrontmatterV1Schema,
  PlannedCapabilityIdV1Schema,
  SourceFreezeManifestV1Schema,
  type CanonicalClaimV1,
  type CanonicalContentBodyV1,
  type CanonicalContentDocumentV1,
  type SourceFreezeManifestV1,
} from '../../../core/contracts/creation-v3.ts';
import type {HashBoundReferenceV1} from '../../../core/contracts/content-v2.ts';
import {RelativePathSchema} from '../../../core/contracts/primitives.ts';
import {hashCanonical, sha256Text} from '../../../core/evidence/hash.ts';

const EXPECTED_H2 = [
  'Audiencia',
  'Problema',
  'Promesa',
  'Tesis',
  'Soportes',
  'Evidencia',
  'Recorrido editorial',
  'Dirección visual',
  'Acción',
  'Derechos y activos',
  'Accesibilidad',
  'Límites',
] as const;

const VISUAL_H3 = ['Idea central', 'Relaciones', 'Límites visuales', 'Accesibilidad'] as const;

const SNAKE_CASE_KEY = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/u;
const INLINE_HTML = /<\/?[A-Za-z][^>]*>/u;
const UNSAFE_URI = /\b(?:https?|file|data|javascript):/iu;
const IMAGE_SYNTAX = /!\[[^\]]*\]\(/u;
const FENCED_BLOCK = /^ {0,3}(?:```|~~~)/mu;
const ABSOLUTE_PATH = /(?:^|[\s("'`])(?:\/(?:[A-Za-z0-9._~-]+\/?)+|[A-Za-z]:\\[^\s)"'`]+)/u;

export class CanonicalContentParseError extends Error {
  public readonly code: string;

  public constructor(code: string, message: string) {
    super(`${code}: ${message}`);
    this.name = 'CanonicalContentParseError';
    this.code = code;
  }
}

const fail = (code: string, message: string): never => {
  throw new CanonicalContentParseError(code, message);
};

const sha256Bytes = (value: Uint8Array): string => createHash('sha256').update(value).digest('hex');

const stripCode = (value: string): string => {
  const trimmed = value.trim();
  if (trimmed.startsWith('`') && trimmed.endsWith('`') && trimmed.length >= 2) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
};

const normalizeInline = (value: string): string =>
  value
    .normalize('NFC')
    .trim()
    .replace(/[ \t]+/gu, ' ');

const camelizeKey = (key: string): string =>
  key.replace(/_([a-z0-9])/gu, (_, character: string) => character.toUpperCase());

const deepCamelize = (value: unknown, path: string[] = []): unknown => {
  if (Array.isArray(value)) {
    return value.map((item, index) => deepCamelize(item, [...path, String(index)]));
  }
  if (value === null || typeof value !== 'object') {
    return typeof value === 'string' ? value.normalize('NFC') : value;
  }

  const output: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    if (!SNAKE_CASE_KEY.test(key)) {
      fail('UNKNOWN_FIELD', `YAML key must use strict snake_case at ${[...path, key].join('.')}.`);
    }
    const camelKey = camelizeKey(key);
    if (Object.hasOwn(output, camelKey)) {
      fail('UNKNOWN_FIELD', `YAML keys collide after canonicalization at ${camelKey}.`);
    }
    output[camelKey] = deepCamelize(child, [...path, key]);
  }
  return output;
};

export const parseStrictSnakeCaseYaml = (source: string): unknown => {
  if (source.includes('\0')) fail('INVALID_YAML', 'NUL bytes are forbidden.');
  if (source.startsWith('\uFEFF')) fail('INVALID_YAML', 'UTF-8 BOM is forbidden.');

  const document = parseDocument(source, {
    strict: true,
    uniqueKeys: true,
    version: '1.2',
    schema: 'core',
    merge: false,
    customTags: null,
    stringKeys: true,
    prettyErrors: true,
  });
  const diagnostics = [...document.errors, ...document.warnings];
  if (diagnostics.length > 0) {
    fail('INVALID_YAML', diagnostics.map(({message}) => message).join('; '));
  }

  let forbiddenAstFeature: string | undefined;
  visit(document, {
    Alias: () => {
      forbiddenAstFeature ??= 'aliases';
    },
    Node: (_key, node) => {
      if (node.anchor !== undefined) forbiddenAstFeature ??= 'anchors';
      if (node.tag !== undefined) forbiddenAstFeature ??= 'custom tags';
    },
    Pair: (_key, pair) => {
      if (isScalar(pair.key) && pair.key.value === '<<') {
        forbiddenAstFeature ??= 'merge keys';
      }
    },
  });
  if (forbiddenAstFeature !== undefined) {
    fail('INVALID_YAML', `${forbiddenAstFeature} are forbidden in authored frontmatter.`);
  }

  return deepCamelize(document.toJS({maxAliasCount: 0}));
};

type FrontmatterParts = {
  frontmatterText: string;
  markdownText: string;
};

const splitFrontmatter = (raw: string): FrontmatterParts => {
  if (raw.startsWith('\uFEFF')) fail('INVALID_DOCUMENT', 'UTF-8 BOM is forbidden.');
  if (raw.includes('\0')) fail('INVALID_DOCUMENT', 'NUL bytes are forbidden.');
  const normalized = raw.replace(/\r\n?/gu, '\n');
  const lines = normalized.split('\n');
  if (lines[0] !== '---') {
    fail('INVALID_DOCUMENT', 'Frontmatter must be the first block in the file.');
  }
  const closingIndex = lines.findIndex((line, index) => index > 0 && line === '---');
  if (closingIndex < 2) {
    fail('INVALID_DOCUMENT', 'Frontmatter requires a closing delimiter.');
  }
  return {
    frontmatterText: lines.slice(1, closingIndex).join('\n'),
    markdownText: lines.slice(closingIndex + 1).join('\n'),
  };
};

const rejectUnsafeMarkdown = (markdown: string): void => {
  if (INLINE_HTML.test(markdown)) fail('UNSAFE_MARKDOWN', 'Inline HTML is forbidden.');
  if (UNSAFE_URI.test(markdown))
    fail('UNSAFE_MARKDOWN', 'Network and executable URIs are forbidden.');
  if (IMAGE_SYNTAX.test(markdown))
    fail('UNSAFE_MARKDOWN', 'Embedded Markdown images are forbidden.');
  if (FENCED_BLOCK.test(markdown)) fail('UNSAFE_MARKDOWN', 'Fenced blocks are outside H-01.');
  if (ABSOLUTE_PATH.test(markdown)) fail('UNSAFE_MARKDOWN', 'Absolute local paths are forbidden.');
};

type MarkdownSections = {
  title: string;
  sections: Map<(typeof EXPECTED_H2)[number], string[]>;
};

const splitMarkdownSections = (markdown: string): MarkdownSections => {
  rejectUnsafeMarkdown(markdown);
  const lines = markdown.split('\n');
  while (lines[0]?.trim() === '') lines.shift();
  const firstLine = lines.shift();
  if (firstLine === undefined) {
    return fail('INVALID_MARKDOWN', 'Exactly one H1 must open the Markdown body.');
  }
  if (!firstLine.startsWith('# ') || firstLine.startsWith('## ')) {
    return fail('INVALID_MARKDOWN', 'Exactly one H1 must open the Markdown body.');
  }
  const title = normalizeInline(firstLine.slice(2));
  const sections = new Map<(typeof EXPECTED_H2)[number], string[]>();
  let current: (typeof EXPECTED_H2)[number] | undefined;

  for (const line of lines) {
    const h1 = /^# (.+)$/u.exec(line);
    if (h1) fail('INVALID_MARKDOWN', 'A second H1 is forbidden.');
    const h2 = /^## (.+)$/u.exec(line);
    if (h2) {
      const heading = h2[1] as (typeof EXPECTED_H2)[number];
      if (!EXPECTED_H2.includes(heading)) {
        fail('UNKNOWN_SECTION', `Unknown H2 section: ${h2[1]}.`);
      }
      if (sections.has(heading)) fail('DUPLICATE_SECTION', `Duplicate H2 section: ${heading}.`);
      current = heading;
      sections.set(current, []);
      continue;
    }
    if (current === undefined) {
      if (line.trim() !== '') fail('INVALID_MARKDOWN', 'Text before the first H2 is forbidden.');
      continue;
    }
    sections.get(current)!.push(line);
  }

  const actual = [...sections.keys()];
  if (
    actual.length !== EXPECTED_H2.length ||
    actual.some((heading, index) => heading !== EXPECTED_H2[index])
  ) {
    fail('INVALID_SECTION_ORDER', `Expected H2 order: ${EXPECTED_H2.join(' → ')}.`);
  }
  return {title, sections};
};

const contentLines = (lines: readonly string[]): string[] => {
  const copy = [...lines];
  while (copy[0]?.trim() === '') copy.shift();
  while (copy.at(-1)?.trim() === '') copy.pop();
  return copy;
};

const parseSingleParagraph = (lines: readonly string[], label: string): string => {
  const normalized = contentLines(lines);
  if (normalized.length === 0) fail('INVALID_MARKDOWN', `${label} cannot be empty.`);
  if (normalized.some((line) => /^(?:#{1,6} |- |\d+\. )/u.test(line))) {
    fail('INVALID_MARKDOWN', `${label} must contain exactly one paragraph.`);
  }
  const paragraphs = normalized
    .join('\n')
    .split(/\n[ \t]*\n/gu)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  if (paragraphs.length !== 1) {
    fail('INVALID_MARKDOWN', `${label} must contain exactly one paragraph.`);
  }
  return normalizeInline(paragraphs[0]!.replace(/\n/gu, ' '));
};

const parseBulletList = (lines: readonly string[], label: string): string[] => {
  const normalized = contentLines(lines).filter((line) => line.trim() !== '');
  if (normalized.length === 0) fail('INVALID_MARKDOWN', `${label} requires at least one item.`);
  return normalized.map((line) => {
    if (!line.startsWith('- ')) fail('INVALID_MARKDOWN', `${label} accepts only flat bullets.`);
    return normalizeInline(line.slice(2));
  });
};

type H3Block = {heading: string; lines: string[]};

const splitH3 = (lines: readonly string[], label: string): H3Block[] => {
  const blocks: H3Block[] = [];
  let current: H3Block | undefined;
  for (const line of contentLines(lines)) {
    const match = /^### (.+)$/u.exec(line);
    if (match) {
      current = {heading: match[1]!, lines: []};
      blocks.push(current);
      continue;
    }
    if (current === undefined) {
      if (line.trim() !== '') fail('INVALID_MARKDOWN', `${label} requires H3 entries.`);
      continue;
    }
    if (/^#{1,2} |^####/u.test(line)) {
      fail('INVALID_MARKDOWN', `${label} contains an unsupported heading.`);
    }
    current.lines.push(line);
  }
  if (blocks.length === 0) fail('INVALID_MARKDOWN', `${label} requires H3 entries.`);
  if (new Set(blocks.map(({heading}) => heading)).size !== blocks.length) {
    fail('DUPLICATE_SECTION', `${label} contains duplicate H3 headings.`);
  }
  return blocks;
};

type ParagraphAndMetadata = {
  paragraph: string;
  metadata: Map<string, string>;
};

const parseParagraphAndMetadata = (
  lines: readonly string[],
  allowedKeys: readonly string[],
  label: string,
): ParagraphAndMetadata => {
  const normalized = contentLines(lines);
  const firstBullet = normalized.findIndex((line) => line.startsWith('- '));
  if (firstBullet < 1) fail('INVALID_MARKDOWN', `${label} requires a paragraph and metadata.`);
  const paragraph = parseSingleParagraph(normalized.slice(0, firstBullet), label);
  const metadata = new Map<string, string>();
  for (const line of normalized.slice(firstBullet)) {
    if (line.trim() === '') continue;
    const match = /^- ([A-Za-z][A-Za-z -]+): (.+)$/u.exec(line);
    if (match === null) {
      return fail('INVALID_MARKDOWN', `${label} has malformed metadata: ${line}.`);
    }
    const [, key, value] = match;
    if (!allowedKeys.includes(key!)) fail('UNKNOWN_FIELD', `${label} has unknown key ${key}.`);
    if (metadata.has(key!)) fail('DUPLICATE_FIELD', `${label} repeats key ${key}.`);
    metadata.set(key!, normalizeInline(value!));
  }
  for (const key of allowedKeys) {
    if (!metadata.has(key)) fail('MISSING_FIELD', `${label} requires key ${key}.`);
  }
  return {paragraph, metadata};
};

const parseCsv = (value: string): string[] => {
  const stripped = stripCode(value);
  if (stripped === 'none') return [];
  return value
    .split(',')
    .map((item) => stripCode(item))
    .map(normalizeInline)
    .filter(Boolean);
};

const parseLocator = (value: string): CanonicalClaimV1['locator'] => {
  const unwrapped = stripCode(value);
  const lineRange = /^lines:([1-9][0-9]*)-([1-9][0-9]*)$/u.exec(unwrapped);
  if (lineRange) {
    return {
      kind: 'line_range',
      startLine: Number(lineRange[1]),
      endLine: Number(lineRange[2]),
    };
  }
  if (unwrapped.startsWith('heading:')) {
    return {kind: 'heading', heading: unwrapped.slice('heading:'.length)};
  }
  if (unwrapped.startsWith('json_pointer:')) {
    return {kind: 'json_pointer', pointer: unwrapped.slice('json_pointer:'.length)};
  }
  if (unwrapped.startsWith('yaml_path:')) {
    return {kind: 'yaml_path', path: unwrapped.slice('yaml_path:'.length)};
  }
  return fail('INVALID_LOCATOR', `Unsupported evidence locator: ${value}.`);
};

const parseSupports = (lines: readonly string[]) =>
  splitH3(lines, 'Soportes').map(({heading, lines: blockLines}) => {
    const {paragraph, metadata} = parseParagraphAndMetadata(
      blockLines,
      ['Claims', 'Pillar'],
      `Support ${heading}`,
    );
    return {
      supportId: heading,
      statement: paragraph,
      claimIds: parseCsv(metadata.get('Claims')!),
      pillar: stripCode(metadata.get('Pillar')!) as 'P1' | 'P2' | 'P3',
    };
  });

const parseClaims = (lines: readonly string[]): CanonicalClaimV1[] =>
  splitH3(lines, 'Evidencia').map(({heading, lines: blockLines}) => {
    const baseKeys = ['Kind', 'Support', 'Authority', 'Evidence role', 'Locator', 'Limit'];
    const normalized = contentLines(blockLines);
    const performance = normalized.some((line) => line.startsWith('- Dataset:'));
    const allowedKeys = performance
      ? [...baseKeys, 'Dataset', 'Unit', 'Period', 'Denominator', 'Method']
      : baseKeys;
    const {paragraph, metadata} = parseParagraphAndMetadata(
      normalized,
      allowedKeys,
      `Claim ${heading}`,
    );
    const performanceEvidence = performance
      ? {
          datasetRef: JSON.parse(stripCode(metadata.get('Dataset')!)) as HashBoundReferenceV1,
          unit: stripCode(metadata.get('Unit')!),
          period: stripCode(metadata.get('Period')!),
          denominator: stripCode(metadata.get('Denominator')!),
          method: metadata.get('Method')!,
        }
      : undefined;
    return {
      claimId: heading,
      statement: paragraph,
      claimKind: stripCode(metadata.get('Kind')!) as CanonicalClaimV1['claimKind'],
      support: stripCode(metadata.get('Support')!) as CanonicalClaimV1['support'],
      authorityId: stripCode(metadata.get('Authority')!),
      evidenceRole: stripCode(metadata.get('Evidence role')!) as CanonicalClaimV1['evidenceRole'],
      locator: parseLocator(metadata.get('Locator')!),
      limitation: metadata.get('Limit')!,
      ...(performanceEvidence === undefined ? {} : {performanceEvidence}),
    };
  });

const parseNarrative = (lines: readonly string[]) =>
  splitH3(lines, 'Recorrido editorial').map(({heading, lines: blockLines}) => {
    const headingMatch = /^([1-9][0-9]*)\. (.+)$/u.exec(heading);
    if (headingMatch === null) {
      return fail('INVALID_MARKDOWN', `Narrative H3 must use "<position>. <label>": ${heading}.`);
    }
    const {paragraph, metadata} = parseParagraphAndMetadata(
      blockLines,
      ['Purpose', 'Claims', 'Capabilities', 'State'],
      `Narrative beat ${heading}`,
    );
    return {
      position: Number(headingMatch[1]),
      label: normalizeInline(headingMatch[2]!),
      purpose: stripCode(metadata.get('Purpose')!) as
        | 'thesis'
        | 'decision'
        | 'system'
        | 'workflow_matrix'
        | 'process'
        | 'visual_router'
        | 'boundary'
        | 'cta'
        | 'support',
      statement: paragraph,
      claimIds: parseCsv(metadata.get('Claims')!),
      plannedCapabilityIds: parseCsv(metadata.get('Capabilities')!).map((capabilityId) =>
        PlannedCapabilityIdV1Schema.parse(capabilityId),
      ),
      stateDisclosure: stripCode(metadata.get('State')!) as 'not_applicable' | 'planned_capability',
    };
  });

const parseVisualDirection = (lines: readonly string[]) => {
  const blocks = splitH3(lines, 'Dirección visual');
  const headings = blocks.map(({heading}) => heading);
  if (
    headings.length !== VISUAL_H3.length ||
    headings.some((heading, index) => heading !== VISUAL_H3[index])
  ) {
    fail('INVALID_SECTION_ORDER', `Expected visual H3 order: ${VISUAL_H3.join(' → ')}.`);
  }
  const byHeading = new Map(blocks.map((block) => [block.heading, block.lines]));
  const idea = parseParagraphAndMetadata(
    byHeading.get('Idea central')!,
    ['Evidence mode'],
    'Idea central',
  );

  const relations = parseBulletList(byHeading.get('Relaciones')!, 'Relaciones').map((line) => {
    const match = /^`([^`]+)` \| `([^`]+)` \| (.+?) \| (.+)$/u.exec(line);
    if (match === null) {
      return fail('INVALID_MARKDOWN', 'Visual relations require `id` | `kind` | refs | meaning.');
    }
    return {
      relationId: match[1]!,
      kind: match[2]! as
        | 'sequence'
        | 'dependency'
        | 'contrast'
        | 'hierarchy'
        | 'grouping'
        | 'comparison'
        | 'mapping'
        | 'boundary',
      refs: parseCsv(match[3]!),
      meaning: normalizeInline(match[4]!),
    };
  });

  const visualLimits = parseBulletList(byHeading.get('Límites visuales')!, 'Límites visuales');
  const mustPreserve: string[] = [];
  const mustNotImply: string[] = [];
  for (const item of visualLimits) {
    if (item.startsWith('Preserve: ')) {
      mustPreserve.push(item.slice('Preserve: '.length));
    } else if (item.startsWith('Prohibit: ')) {
      mustNotImply.push(item.slice('Prohibit: '.length));
    } else {
      fail('UNKNOWN_FIELD', 'Visual limits accept only Preserve or Prohibit.');
    }
  }

  const accessibilityLines = contentLines(byHeading.get('Accesibilidad')!).filter(
    (line) => line.trim() !== '',
  );
  const accessibility = new Map<string, string>();
  for (const line of accessibilityLines) {
    const match = /^- (Equivalent message|Reading order|Non-color cue): (.+)$/u.exec(line);
    if (match === null) {
      return fail('INVALID_MARKDOWN', `Malformed visual accessibility line: ${line}.`);
    }
    if (accessibility.has(match[1]!)) {
      fail('DUPLICATE_FIELD', `Visual accessibility repeats ${match[1]}.`);
    }
    accessibility.set(match[1]!, normalizeInline(match[2]!));
  }
  for (const key of ['Equivalent message', 'Reading order', 'Non-color cue']) {
    if (!accessibility.has(key)) fail('MISSING_FIELD', `Visual accessibility requires ${key}.`);
  }

  return {
    ideaCentral: idea.paragraph,
    evidenceMode: stripCode(idea.metadata.get('Evidence mode')!) as
      'conceptual' | 'categorical' | 'quantitative_claims',
    relations: relations.sort(({relationId: left}, {relationId: right}) =>
      left < right ? -1 : left > right ? 1 : 0,
    ),
    mustPreserve,
    mustNotImply,
    accessibility: {
      equivalentMessage: accessibility.get('Equivalent message')!,
      readingOrderRefs: accessibility
        .get('Reading order')!
        .split('>')
        .map((item) => stripCode(item))
        .map(normalizeInline),
      nonColorCue: accessibility.get('Non-color cue')!,
    },
  };
};

const parseBody = (markdown: string): CanonicalContentBodyV1 => {
  const {title, sections} = splitMarkdownSections(markdown);
  return {
    title,
    audience: parseSingleParagraph(sections.get('Audiencia')!, 'Audiencia'),
    problem: parseSingleParagraph(sections.get('Problema')!, 'Problema'),
    promise: parseSingleParagraph(sections.get('Promesa')!, 'Promesa'),
    thesis: parseSingleParagraph(sections.get('Tesis')!, 'Tesis'),
    supports: parseSupports(sections.get('Soportes')!),
    claims: parseClaims(sections.get('Evidencia')!),
    narrativeBeats: parseNarrative(sections.get('Recorrido editorial')!),
    visualDirection: parseVisualDirection(sections.get('Dirección visual')!),
    callToAction: parseSingleParagraph(sections.get('Acción')!, 'Acción'),
    rightsAndAssets: parseBulletList(sections.get('Derechos y activos')!, 'Derechos y activos'),
    accessibility: parseBulletList(sections.get('Accesibilidad')!, 'Accesibilidad'),
    limits: parseBulletList(sections.get('Límites')!, 'Límites'),
  };
};

export const parseCanonicalContentMarkdown = (raw: string): CanonicalContentDocumentV1 => {
  const rawSha256 = sha256Text(raw);
  const {frontmatterText, markdownText} = splitFrontmatter(raw);
  const frontmatter = CanonicalContentFrontmatterV1Schema.parse(
    parseStrictSnakeCaseYaml(frontmatterText),
  );
  const normalizedFrontmatter = {
    ...frontmatter,
    plannedCapabilities: [...frontmatter.plannedCapabilities].sort(
      ({capabilityId: left}, {capabilityId: right}) => (left < right ? -1 : left > right ? 1 : 0),
    ),
  };
  const body = parseBody(markdownText);
  const semanticPayload = {
    domain: 'canonical-content-document-v1:semantic:v1',
    frontmatter: normalizedFrontmatter,
    body,
  };
  return CanonicalContentDocumentV1Schema.parse({
    schemaVersion: 'canonical-content-document-v1',
    frontmatter: normalizedFrontmatter,
    body,
    rawSha256,
    semanticSha256: hashCanonical(semanticPayload),
  });
};

const resolveRootBoundFile = (root: string, ref: string): string => {
  const portableRef = RelativePathSchema.parse(ref);
  const rootReal = realpathSync(root);
  const candidate = resolve(rootReal, portableRef);
  const candidateReal = realpathSync(candidate);
  const relativePath = relative(rootReal, candidateReal);
  if (
    relativePath === '' ||
    relativePath.startsWith(`..${sep}`) ||
    relativePath === '..' ||
    resolve(rootReal, relativePath) !== candidateReal
  ) {
    fail('UNSAFE_PATH', `File ref escapes repository root: ${portableRef}.`);
  }
  if (!statSync(candidateReal).isFile()) {
    fail('UNSAFE_PATH', `File ref is not a regular file: ${portableRef}.`);
  }
  return candidateReal;
};

export const assertHashBoundFile = (root: string, reference: HashBoundReferenceV1): Buffer => {
  const candidateReal = resolveRootBoundFile(root, reference.ref);
  const bytes = readFileSync(candidateReal);
  const actual = sha256Bytes(bytes);
  if (actual !== reference.sha256) {
    fail('HASH_MISMATCH', `${reference.ref} expected ${reference.sha256}, received ${actual}.`);
  }
  return bytes;
};

export const loadSourceFreezeManifest = (
  root: string,
  reference: HashBoundReferenceV1,
): SourceFreezeManifestV1 => {
  const bytes = assertHashBoundFile(root, reference);
  const manifest = SourceFreezeManifestV1Schema.parse(
    parseStrictSnakeCaseYaml(bytes.toString('utf8')),
  );
  const sorted = [...manifest.readSet].sort(({materialRef: left}, {materialRef: right}) =>
    left.ref < right.ref ? -1 : left.ref > right.ref ? 1 : 0,
  );
  if (sorted.some((entry, index) => entry.bindingId !== manifest.readSet[index]?.bindingId)) {
    fail('NON_DETERMINISTIC_READ_SET', 'Source-freeze read set must be sorted by POSIX ref.');
  }
  for (const entry of manifest.readSet) assertHashBoundFile(root, entry.materialRef);
  return manifest;
};

const fragmentForLocator = (material: string, locator: CanonicalClaimV1['locator']): string => {
  if (locator.kind === 'line_range') {
    const lines = material.replace(/\r\n?/gu, '\n').split('\n');
    if (locator.startLine > lines.length || locator.endLine > lines.length) {
      fail('SOURCE_GAP', `Evidence line range exceeds source length ${lines.length}.`);
    }
    return `${lines.slice(locator.startLine - 1, locator.endLine).join('\n')}\n`;
  }
  if (locator.kind === 'heading') {
    const lines = material.replace(/\r\n?/gu, '\n').split('\n');
    const index = lines.findIndex((line) => line.replace(/^#{1,6} /u, '') === locator.heading);
    if (index < 0) fail('SOURCE_GAP', `Evidence heading not found: ${locator.heading}.`);
    const level = /^#+/u.exec(lines[index]!)?.[0].length ?? 0;
    let end = index + 1;
    while (end < lines.length) {
      const nextLevel = /^#+(?= )/u.exec(lines[end]!)?.[0].length;
      if (nextLevel !== undefined && nextLevel <= level) break;
      end += 1;
    }
    return `${lines.slice(index, end).join('\n').trimEnd()}\n`;
  }
  if (locator.kind === 'json_pointer') {
    let value: unknown = JSON.parse(material);
    for (const token of locator.pointer
      .slice(1)
      .split('/')
      .filter(Boolean)
      .map((part) => part.replaceAll('~1', '/').replaceAll('~0', '~'))) {
      if (value === null || typeof value !== 'object' || !(token in value)) {
        fail('SOURCE_GAP', `JSON pointer does not resolve: ${locator.pointer}.`);
      }
      value = (value as Record<string, unknown>)[token];
    }
    return JSON.stringify(value);
  }
  const parsed = parseStrictSnakeCaseYaml(material);
  let value: unknown = parsed;
  for (const token of locator.path.split('.')) {
    if (value === null || typeof value !== 'object' || !(token in value)) {
      fail('SOURCE_GAP', `YAML path does not resolve: ${locator.path}.`);
    }
    value = (value as Record<string, unknown>)[token];
  }
  return JSON.stringify(value);
};

export type LoadedCanonicalContentV1 = {
  document: CanonicalContentDocumentV1;
  manifest: SourceFreezeManifestV1;
  resolvedClaims: Array<{
    claim: CanonicalClaimV1;
    materialRef: HashBoundReferenceV1;
    fragmentSha256: string;
  }>;
};

export const loadCanonicalContent = (
  root: string,
  contentRef: string,
): LoadedCanonicalContentV1 => {
  const raw = readFileSync(resolveRootBoundFile(root, contentRef), 'utf8');
  const document = parseCanonicalContentMarkdown(raw);
  const manifest = loadSourceFreezeManifest(root, document.frontmatter.sourceFreezeManifest);
  if (manifest.contentId !== document.frontmatter.contentId) {
    fail('SOURCE_GAP', 'Source-freeze manifest content ID does not match content.md.');
  }

  for (const profile of ['brand', 'voice', 'channel', 'adaptation'] as const) {
    const authored = document.frontmatter.profiles[profile];
    const frozen = manifest.profileBindings[profile];
    if (authored.ref !== frozen.ref || authored.sha256 !== frozen.sha256) {
      fail('HASH_MISMATCH', `Profile ${profile} differs from source-freeze manifest.`);
    }
  }

  const readSetById = new Map(manifest.readSet.map((entry) => [entry.bindingId, entry]));
  const authorityById = new Map(
    manifest.authorities.map((authority) => [authority.authorityId, authority]),
  );
  const resolvedClaims = document.body.claims.map((claim) => {
    const authority = authorityById.get(claim.authorityId);
    if (authority === undefined) {
      return fail(
        'SOURCE_GAP',
        `Claim ${claim.claimId} uses unfrozen authority ${claim.authorityId}.`,
      );
    }
    if (claim.support === 'direct' && authority.lifecycleState === 'candidate') {
      fail('SOURCE_GAP', `Direct claim ${claim.claimId} cannot use candidate authority.`);
    }
    const readSetEntry = readSetById.get(authority.readSetBindingId);
    if (readSetEntry === undefined) {
      return fail('SOURCE_GAP', `Authority ${authority.authorityId} lacks a read-set entry.`);
    }
    const bytes = assertHashBoundFile(root, readSetEntry.materialRef);
    const fragment = fragmentForLocator(bytes.toString('utf8'), claim.locator);
    return {
      claim,
      materialRef: readSetEntry.materialRef,
      fragmentSha256: sha256Text(fragment),
    };
  });

  const readSetRefs = new Set(manifest.readSet.map(({materialRef}) => materialRef.ref));
  for (const capability of document.frontmatter.plannedCapabilities) {
    if (!readSetRefs.has(capability.requirementRef.ref)) {
      fail(
        'SOURCE_GAP',
        `Planned capability ${capability.capabilityId} requirement is outside the freeze.`,
      );
    }
  }

  return {document, manifest, resolvedClaims};
};

const flattenStrings = (value: unknown): string[] => {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(flattenStrings);
  if (value !== null && typeof value === 'object') {
    return Object.values(value).flatMap(flattenStrings);
  }
  return [];
};

export const assertPublicContentPolicy = (
  document: CanonicalContentDocumentV1,
  redList: readonly string[],
): void => {
  const publicCopy = flattenStrings(document.body).join('\n').normalize('NFKC');
  const normalized = publicCopy.toLocaleLowerCase('es');
  for (const term of redList) {
    if (normalized.includes(term.normalize('NFKC').toLocaleLowerCase('es'))) {
      fail('BRAND_DRIFT', `Public content includes red-list term: ${term}.`);
    }
  }
  const currentCapabilityAssertion =
    /(?:D3|Three\.js|Lottie|GSAP|Remotion)[^.\n]{0,100}?\b(?:instalad[oa]s?|disponibles?|validad[oa]s?|production[- ]ready|lista para producción)\b/giu;
  const explicitlyNegatedState =
    /\b(?:no|aún no|todavía no)\b[^.\n]{0,48}\b(?:instalad[oa]s?|disponibles?|validad[oa]s?|production[- ]ready|lista para producción)\b/iu;
  for (const match of publicCopy.matchAll(currentCapabilityAssertion)) {
    if (!explicitlyNegatedState.test(match[0])) {
      fail('RENDERER_UNAVAILABLE', 'A planned capability is presented as currently available.');
    }
  }
};
