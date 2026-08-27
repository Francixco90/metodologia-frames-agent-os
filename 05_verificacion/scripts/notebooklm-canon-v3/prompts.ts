import {readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';

import {
  PromptRegistryV1Schema,
  type PromptRegistryV1,
} from '../../../02_proceso/core/contracts/index.ts';
import {findSingleFile, portableRelative} from './io.ts';
import type {ParsedKnowledgeDocument} from './model.ts';

const resolveJsonPointer = (value: unknown, pointer: string): unknown => {
  let current = value;
  for (const encodedToken of pointer.slice(1).split('/')) {
    const token = encodedToken.replaceAll('~1', '/').replaceAll('~0', '~');
    if (Array.isArray(current)) {
      const index = Number(token);
      if (!Number.isInteger(index) || index < 0 || index >= current.length) return undefined;
      current = current[index];
    } else if (typeof current === 'object' && current !== null && token in current)
      current = (current as Record<string, unknown>)[token];
    else return undefined;
  }
  return current;
};

export const validatePromptRegistry = (
  root: string,
  active: ParsedKnowledgeDocument[],
  byPath: Map<string, ParsedKnowledgeDocument>,
): {errors: string[]; templateCount: number} => {
  const errors: string[] = [];
  const registryPath = findSingleFile(root, 'prompt-registry.json');
  const rawRegistry = JSON.parse(readFileSync(registryPath, 'utf8')) as unknown;
  const registry: PromptRegistryV1 = PromptRegistryV1Schema.parse(rawRegistry);
  for (const template of registry.templates) {
    const documentPath = resolve(dirname(registryPath), template.markdownRef);
    const document = byPath.get(portableRelative(root, documentPath));
    if (!document)
      errors.push(`${template.templateId}: missing prompt Markdown ${template.markdownRef}.`);
    else if (document.metadata.json_pointer !== template.jsonPointer)
      errors.push(
        `${template.templateId}: Markdown json_pointer does not match ${template.jsonPointer}.`,
      );
    else if (
      !document.metadata.json_registry_ref?.endsWith(`prompt-registry.json#${template.jsonPointer}`)
    )
      errors.push(`${template.templateId}: Markdown json_registry_ref does not match registry.`);
    const pointed = resolveJsonPointer(rawRegistry, template.jsonPointer);
    if (
      typeof pointed !== 'object' ||
      pointed === null ||
      (pointed as {templateId?: string}).templateId !== template.templateId
    )
      errors.push(`${template.templateId}: jsonPointer does not resolve to its registry entry.`);
  }
  const registeredPaths = new Set(
    registry.templates.map(({markdownRef}) =>
      portableRelative(root, resolve(dirname(registryPath), markdownRef)),
    ),
  );
  const promptDocuments = active.filter(({metadata}) => metadata.layer === '30 Templates');
  for (const document of promptDocuments)
    if (!registeredPaths.has(document.relativePath))
      errors.push(`${document.relativePath}: ACTIVE prompt document is absent from registry.`);
  if (promptDocuments.length !== 22)
    errors.push(
      `Expected exactly 22 ACTIVE prompt Markdown documents; found ${promptDocuments.length}.`,
    );
  return {errors, templateCount: registry.templates.length};
};
