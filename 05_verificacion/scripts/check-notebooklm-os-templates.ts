import {readdirSync} from 'node:fs';
import {basename, extname, resolve} from 'node:path';

import {PromptRegistryV1Schema} from '../../02_proceso/core/contracts/index.ts';
import {
  add,
  parseFrontMatter,
  read,
  root,
  templateRoot,
  unique,
  validateXmlSandwich,
} from './check-notebooklm-os-common.ts';
import {catalog} from './check-notebooklm-os-fixtures.ts';

const registryPath = `${templateRoot}/prompt-registry.json`;
const promptRegistry = PromptRegistryV1Schema.parse(JSON.parse(read(registryPath)) as unknown);
const expectedById = new Map(catalog.templates.map((entry) => [entry.template_id, entry.kind]));
add(promptRegistry.entries.length === 22, `${registryPath}: debe contener exactamente 22 entradas`);
add(
  unique(promptRegistry.entries.map(({template_id: id}) => id)),
  `${registryPath}: template_id duplicado`,
);
for (const [entryIndex, entry] of promptRegistry.entries.entries()) {
  add(
    expectedById.get(entry.template_id) === entry.kind,
    `${registryPath}: ${entry.template_id} no coincide con el catálogo`,
  );
  add(
    !entry.required_inputs.some((value) => /all[ -]?sources|todas las fuentes/iu.test(value)),
    `${registryPath}: ${entry.template_id} no puede requerir todas las fuentes`,
  );
  const relativeTemplate = `${templateRoot}/${basename(entry.file)}`;
  add(
    extname(relativeTemplate) === '.md',
    `${registryPath}: ${entry.template_id} no referencia Markdown`,
  );
  const raw = read(relativeTemplate);
  const metadata = parseFrontMatter(raw, relativeTemplate);
  if (metadata !== null) {
    add(metadata.schema === 'prompt-template-v1', `${relativeTemplate}: schema incorrecto`);
    add(metadata.template_id === entry.template_id, `${relativeTemplate}: template_id sin paridad`);
    add(metadata.kind === entry.kind, `${relativeTemplate}: kind sin paridad`);
    add(typeof metadata.version === 'string', `${relativeTemplate}: falta version`);
    add(
      metadata.status === 'candidate' || metadata.status === 'ACTIVE',
      `${relativeTemplate}: status debe ser candidate o ACTIVE`,
    );
  }
  const rawInputs = /<inputs>([^<]+)<\/inputs>/u.exec(raw)?.[1] ?? '';
  const markdownInputs = rawInputs
    .split(';')
    .map((value) => value.trim().toLowerCase().replaceAll(/\s+/gu, '_'))
    .filter(Boolean)
    .sort();
  add(
    JSON.stringify(markdownInputs) === JSON.stringify([...entry.required_inputs].sort()),
    `${relativeTemplate}: inputs sin paridad con el registro`,
  );
  add(
    entry.json_pointer === `#/entries/${entryIndex}`,
    `${relativeTemplate}: json_pointer sin paridad`,
  );
  validateXmlSandwich(raw, relativeTemplate);
}
const markdownTemplates = readdirSync(resolve(root, templateRoot))
  .filter((name) => name.endsWith('.md'))
  .sort();
add(markdownTemplates.length === 22, `${templateRoot}: se requieren exactamente 22 Markdown`);
add(
  expectedById.size === promptRegistry.entries.length &&
    [...expectedById.keys()].every((id) =>
      promptRegistry.entries.some((entry) => entry.template_id === id),
    ),
  `${registryPath}: faltan templates del catálogo`,
);
