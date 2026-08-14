import {glob, mkdir, readFile, rename, rm, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {format, resolveConfig} from 'prettier';
import type {DocumentationCoverageV1, DocumentationManifestV1} from './contracts.ts';
import {assessWorkflowCoverage} from './coverage.ts';
import {renderPortalHtml, renderWorkflowHtml, renderWorkflowMarkdown} from './render.ts';
import {buildSequenceModel, loadWorkflowDocumentation} from './workflow-source.ts';

const defaultRepoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const generatedPatterns = [
  /^01_intencion\/reference\/workflows\/(?:index|[pclms]\d{2})\.md$/u,
  /^03_artefactos\/content\/documentation\/(?:index\.html|documentation-(?:manifest|coverage)-v1\.json)$/u,
  /^03_artefactos\/content\/documentation\/workflows\/[pclms]\d{2}\.html$/u,
] as const;

export type DocumentationBuildOptions = {repoRoot?: string; allowUnresolved?: boolean};

const stableJson = (value: unknown, space = 2): string => `${JSON.stringify(value, null, space)}\n`;

export const buildDocumentationOutputs = async (
  options: DocumentationBuildOptions = {},
): Promise<Map<string, string>> => {
  const repoRoot = path.resolve(options.repoRoot ?? defaultRepoRoot);
  const workflows = await loadWorkflowDocumentation(repoRoot);
  const outputs = new Map<string, string>();
  const coverage: DocumentationCoverageV1[] = [];
  for (const workflow of workflows) {
    const sequence = buildSequenceModel(workflow);
    const slug = workflow.id.toLowerCase();
    outputs.set(
      `01_intencion/reference/workflows/${slug}.md`,
      renderWorkflowMarkdown(workflow, sequence),
    );
    outputs.set(
      `03_artefactos/content/documentation/workflows/${slug}.html`,
      renderWorkflowHtml(workflow, sequence),
    );
    coverage.push(await assessWorkflowCoverage(repoRoot, workflow, workflows, sequence));
  }
  const manifest: DocumentationManifestV1 = {
    schemaVersion: 'documentation-manifest-v1',
    generatedFrom: workflows.map((item) => item.source),
    audiences: ['person', 'operator', 'maintainer'],
    workflows,
  };
  outputs.set('01_intencion/reference/workflows/index.md', renderMarkdownIndex(workflows));
  outputs.set('03_artefactos/content/documentation/index.html', renderPortalHtml(workflows));
  outputs.set(
    '03_artefactos/content/documentation/documentation-manifest-v1.json',
    stableJson(manifest, 0),
  );
  outputs.set(
    '03_artefactos/content/documentation/documentation-coverage-v1.json',
    stableJson(coverage),
  );
  const unresolved = coverage.filter((item) => !item.referencesResolvable || !item.hasSequence);
  if (unresolved.length && !options.allowUnresolved) {
    throw new Error(
      `Documentation coverage BLOCKED:\n${unresolved.map((item) => `${item.workflowId}: ${item.unresolvedReferences.join(', ')}`).join('\n')}`,
    );
  }
  const prettierConfig = (await resolveConfig(path.join(repoRoot, 'package.json'))) ?? {};
  return new Map(
    await Promise.all(
      [...outputs].map(async ([outputPath, content]) => {
        if (outputPath.endsWith('documentation-manifest-v1.json')) {
          return [outputPath, content] as const;
        }
        const parser = outputPath.endsWith('.md')
          ? 'markdown'
          : outputPath.endsWith('.html')
            ? 'html'
            : 'json';
        return [
          outputPath,
          await format(content, {...prettierConfig, parser, filepath: outputPath}),
        ] as const;
      }),
    ),
  );
};

const section = (
  title: string,
  workflows: Awaited<ReturnType<typeof loadWorkflowDocumentation>>,
): string =>
  `## ${title}\n\n${workflows.map((item) => `- [${item.id} · ${item.title}](${item.id.toLowerCase()}.md): ${item.purpose}`).join('\n') || '- Aún no hay workflows ejecutables en esta familia.'}`;

const renderMarkdownIndex = (
  workflows: Awaited<ReturnType<typeof loadWorkflowDocumentation>>,
): string => `---
title: Recorridos de Frames
type: workflow_reference_index
status: generated
audience: [person, operator, maintainer]
---

# Recorridos de Frames

Esta referencia se genera desde los workflows canónicos. Empieza por el resultado que buscas; cada página explica qué obtendrás, cómo avanza Frames y dónde pide aprobación.

${section(
  'Contenido y multimedia',
  workflows.filter((item) => item.family === 'content'),
)}

${section(
  'Carrera profesional',
  workflows.filter((item) => item.family === 'career'),
)}

${section(
  'Extensiones locales',
  workflows.filter((item) => item.family === 'local-extension'),
)}

${section(
  'Mantenimiento del harness',
  workflows.filter((item) => item.family === 'maintenance'),
)}

## Cómo ampliar esta referencia

1. Añade o modifica el workflow canónico y sus pasos.
2. Ejecuta el generador documental.
3. Ejecuta el checker sin escritura.
4. Revisa Markdown, HTML, secuencia y alternativa textual como un mismo candidate.
`;

export const writeDocumentationOutputs = async (
  outputs: Map<string, string>,
  repoRoot = defaultRepoRoot,
): Promise<void> => {
  const unowned = [...outputs.keys()].filter(
    (relativePath) => !generatedPatterns.some((pattern) => pattern.test(relativePath)),
  );
  if (unowned.length) throw new Error(`Unowned outputs:\n${unowned.join('\n')}`);
  const staged: Array<{temporary: string; output: string}> = [];
  try {
    for (const [relativePath, content] of outputs) {
      const output = path.join(repoRoot, relativePath);
      const temporary = `${output}.frames-docs-${process.pid}.tmp`;
      await mkdir(path.dirname(output), {recursive: true});
      await writeFile(temporary, content, 'utf8');
      staged.push({temporary, output});
    }
    for (const item of staged) await rename(item.temporary, item.output);
  } catch (error) {
    await Promise.all(staged.map(({temporary}) => rm(temporary, {force: true})));
    throw error;
  }
  for (const stale of await findStaleOutputs(repoRoot, outputs)) {
    await rm(path.join(repoRoot, stale));
  }
};

export const checkDocumentationOutputs = async (
  outputs: Map<string, string>,
  repoRoot = defaultRepoRoot,
): Promise<void> => {
  const drift: string[] = [];
  for (const [relativePath, expected] of outputs) {
    const actual = await readFile(path.join(repoRoot, relativePath), 'utf8').catch(() => '');
    if (actual !== expected) drift.push(relativePath);
  }
  drift.push(...(await findStaleOutputs(repoRoot, outputs)).map((item) => `stale:${item}`));
  if (drift.length) throw new Error(`Documentation drift:\n${drift.join('\n')}`);
};

const findStaleOutputs = async (
  repoRoot: string,
  outputs: Map<string, string>,
): Promise<string[]> => {
  const candidates: string[] = [];
  for (const pattern of [
    '01_intencion/reference/workflows/*.md',
    '03_artefactos/content/documentation/*.html',
    '03_artefactos/content/documentation/*.json',
    '03_artefactos/content/documentation/workflows/*.html',
  ]) {
    for await (const candidate of glob(pattern, {cwd: repoRoot})) candidates.push(candidate);
  }
  return candidates
    .filter((candidate) => generatedPatterns.some((pattern) => pattern.test(candidate)))
    .filter((candidate) => !outputs.has(candidate))
    .sort();
};

const main = async (): Promise<void> => {
  const outputs = await buildDocumentationOutputs();
  if (process.argv.includes('--write')) await writeDocumentationOutputs(outputs);
  else await checkDocumentationOutputs(outputs);
  process.stdout.write(
    `PASS documentation workflows=${(outputs.size - 4) / 2} outputs=${outputs.size}\n`,
  );
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  await main();
