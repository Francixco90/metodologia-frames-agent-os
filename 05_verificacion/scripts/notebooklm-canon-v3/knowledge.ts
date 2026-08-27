import {readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';

import {KnowledgeDocumentMetadataV1Schema} from '../../../02_proceso/core/contracts/index.ts';
import {errorDetail, portableRelative, splitFrontMatter, statSafe} from './io.ts';
import type {ParsedKnowledgeDocument} from './model.ts';

const REQUIRED_XML_SECTIONS = [
  'abstract',
  'navigation',
  'routing',
  'knowledge',
  'evidence',
  'decisions',
  'assumptions',
  'limits',
  'edge_cases',
  'acceptance',
  'related_documents',
  'change_log',
] as const;

const extractXml = (path: string, body: string): string => {
  const opening = /<kb_document(?:\s[^>]*)?>/u.exec(body);
  const closingOffset = body.lastIndexOf('</kb_document>');
  if (!opening || closingOffset <= opening.index)
    throw new Error(`${path}: missing one balanced <kb_document> root.`);
  const xml = body.slice(opening.index, closingOffset + '</kb_document>'.length);
  const outside = `${body.slice(0, opening.index)}${body.slice(
    closingOffset + '</kb_document>'.length,
  )}`.trim();
  if (outside.length > 0) throw new Error(`${path}: content outside <kb_document> is forbidden.`);
  const structural = xml.replace(/```[\s\S]*?```/gu, '').replace(/`[^`\r\n]+`/gu, '');
  let previousOffset = -1;
  for (const section of REQUIRED_XML_SECTIONS) {
    const openings = [...structural.matchAll(new RegExp(`<${section}(?:\\s[^>]*)?>`, 'gu'))];
    const closings = [...structural.matchAll(new RegExp(`</${section}>`, 'gu'))];
    if (openings.length !== 1 || closings.length !== 1)
      throw new Error(`${path}: <${section}> must occur exactly once and be balanced.`);
    const openOffset = openings[0]!.index;
    if (openOffset <= previousOffset || closings[0]!.index <= openOffset)
      throw new Error(`${path}: <${section}> is out of order or unbalanced.`);
    previousOffset = openOffset;
  }
  return xml;
};

export const parseKnowledgeDocument = (
  root: string,
  absolutePath: string,
): ParsedKnowledgeDocument => {
  const relativePath = portableRelative(root, absolutePath);
  const {metadata: rawMetadata, body} = splitFrontMatter(
    relativePath,
    readFileSync(absolutePath, 'utf8'),
  );
  const parsed = KnowledgeDocumentMetadataV1Schema.safeParse(rawMetadata);
  if (!parsed.success)
    throw new Error(`${relativePath}: front matter ${errorDetail(parsed.error)}`);
  return {
    absolutePath,
    relativePath,
    metadata: parsed.data,
    body,
    xml: extractXml(relativePath, body),
  };
};

export const normalizedTokens = (body: string): string[] =>
  body
    .replace(/<!--[\s\S]*?-->/gu, ' ')
    .replace(/<\/?[a-z_][^>]*>/giu, ' ')
    .replace(/^#{1,6}\s+.*$/gmu, ' ')
    .replace(/\[[A-Z_]+\]/gu, ' ')
    .replace(/https?:\/\/\S+/gu, ' ')
    .toLocaleLowerCase('en')
    .match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu) ?? [];

export const extractCompiledBootstrap = (path: string, body: string): string => {
  const openings = [...body.matchAll(/<notebook_bootstrap(?:\s[^>]*)?>/gu)];
  const closings = [...body.matchAll(/<\/notebook_bootstrap>/gu)];
  if (openings.length !== 1 || closings.length !== 1)
    throw new Error(`${path}: expected exactly one <notebook_bootstrap> block.`);
  const openingOffset = openings[0]!.index;
  const closingOffset = closings[0]!.index;
  if (closingOffset <= openingOffset) throw new Error(`${path}: notebook_bootstrap is unbalanced.`);
  const fragment = body.slice(openingOffset, closingOffset + '</notebook_bootstrap>'.length);
  const stack: string[] = [];
  for (const match of fragment.matchAll(/<\s*(\/)?\s*([A-Za-z_][\w:.-]*)\b[^>]*>/gu)) {
    const fullTag = match[0];
    const closing = match[1] === '/';
    const name = match[2]!;
    if (fullTag.endsWith('/>')) continue;
    if (!closing) stack.push(name);
    else if (stack.pop() !== name) throw new Error(`${path}: malformed XML near </${name}>.`);
  }
  if (stack.length > 0)
    throw new Error(`${path}: unclosed XML tag <${stack.at(-1)}> in bootstrap.`);
  return fragment;
};

const voseoPattern =
  /\b(?:vos|sos|tenés|podés|querés|hacés|decís|sabés|venís|elegís|creás|usá|mirá|vení|elegí|creá|hacé|decí|poné|seguí|probá)\b/giu;

const es419Content = (document: ParsedKnowledgeDocument): string[] => {
  const chunks: string[] =
    document.metadata.language.toLowerCase() === 'es-419' ? [document.body] : [];
  for (const match of document.body.matchAll(
    /<([a-z_][\w:-]*)\b[^>]*\blocale=["']es-419["'][^>]*>([\s\S]*?)<\/\1>/giu,
  ))
    chunks.push(match[2]!);
  return chunks;
};

const evidenceLineErrors = (document: ParsedKnowledgeDocument): string[] => {
  const evidence = /<evidence(?:\s[^>]*)?>([\s\S]*?)<\/evidence>/u.exec(document.body)?.[1];
  if (evidence === undefined) return [];
  const errors: string[] = [];
  let inFence = false;
  for (const [index, line] of evidence.split(/\r?\n/u).entries()) {
    if (/^\s*```/u.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (
      inFence ||
      /^\s*-\s*`\[(?:METODOLOGIA|NEUROCIENCIA|PEDAGOGIA|INFERENCIA)\]`\s*:/u.test(line)
    )
      continue;
    if (
      /\[(?:METODOLOGIA|NEUROCIENCIA|PEDAGOGIA|INFERENCIA)\]/u.test(line) &&
      !/\[source_ref:[^\]]+\]/u.test(line)
    )
      errors.push(
        `${document.relativePath}: evidence line ${index + 1} uses a claim tag without same-line source_ref.`,
      );
  }
  return errors;
};

const headingAnchors = (body: string): Set<string> =>
  new Set(
    [...body.matchAll(/^#{1,6}\s+(.+)$/gmu)].map((match) =>
      match[1]!
        .trim()
        .toLocaleLowerCase('en')
        .replace(/[^\p{L}\p{N}\s-]/gu, '')
        .replace(/\s+/gu, '-'),
    ),
  );

export const validateKnowledgeDocument = (
  root: string,
  document: ParsedKnowledgeDocument,
  documentsByPath: Map<string, ParsedKnowledgeDocument>,
): string[] => {
  const errors = evidenceLineErrors(document);
  for (const chunk of es419Content(document)) {
    const matches = [...chunk.matchAll(voseoPattern)].map(([match]) => match);
    if (matches.length > 0)
      errors.push(
        `${document.relativePath}: es-419 content contains voseo (${[...new Set(matches)].join(', ')}).`,
      );
  }
  const links = [
    ...document.body.matchAll(/\[[^\]]+\]\((?!https?:|mailto:)([^\s)#]+)?(?:#([^\s)]+))?\)/gu),
  ];
  for (const match of links) {
    const target = match[1] ?? '';
    const anchor = match[2] ?? null;
    const targetPath = target
      ? portableRelative(root, resolve(dirname(document.absolutePath), target))
      : document.relativePath;
    const targetDocument = documentsByPath.get(targetPath);
    if (!targetDocument && !statSafe(resolve(root, targetPath)))
      errors.push(
        `${document.relativePath}: broken relative link ${target}${anchor ? `#${anchor}` : ''}.`,
      );
    else if (anchor && targetDocument && !headingAnchors(targetDocument.body).has(anchor))
      errors.push(`${document.relativePath}: missing anchor #${anchor} in ${targetPath}.`);
  }
  return errors;
};
