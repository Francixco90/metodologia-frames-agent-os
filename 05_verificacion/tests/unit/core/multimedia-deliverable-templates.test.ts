import {existsSync, mkdtempSync, rmSync, unlinkSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, isAbsolute, join, resolve} from 'node:path';

import {afterEach, describe, expect, it} from 'vitest';

import {
  FRAMES_DELIVERABLE_SECTIONS,
  type DeliverableDefinitionV1,
} from 'workflows/multimedia/_schema/deliverable-v1.schema.ts';
import {
  generateDeliverableTemplates,
  loadDeliverableTemplateCatalog,
} from 'workflows/multimedia/_runner/deliverable-template-generator.ts';
import {parseFramesDeliverableMarkdown} from 'workflows/multimedia/_runner/deliverable-model.ts';
import {verifyDeliverableParity} from 'workflows/multimedia/_runner/deliverable-parity.ts';
import {
  parseDeliverableTemplateArgs,
  runDeliverableTemplateGeneration,
} from 'workflows/multimedia/_runner/generate-deliverable-templates.ts';

const root = process.cwd();
const temporaryRoots: string[] = [];
const temporaryRoot = (): string => {
  const path = mkdtempSync(join(tmpdir(), 'frames-deliverable-templates-'));
  temporaryRoots.push(path);
  return path;
};

afterEach(() => {
  temporaryRoots.splice(0).forEach((path) => rmSync(path, {recursive: true, force: true}));
});

const expectPortable = (path: string): void => {
  expect(isAbsolute(path), path).toBe(false);
  expect(path.includes('\\'), path).toBe(false);
  expect(path.split('/'), path).not.toContain('..');
};

const definitionMap = (
  definitions: readonly DeliverableDefinitionV1[],
): ReadonlyMap<string, DeliverableDefinitionV1> =>
  new Map(definitions.map((definition) => [definition.deliverable_id, definition]));

describe('registry-driven multimedia deliverable templates', () => {
  it('generates 39 deterministic Markdown/HTML pairs with exact DRAFT contracts', () => {
    const catalog = loadDeliverableTemplateCatalog(root);
    const definitions = definitionMap(catalog.definitions);
    const first = generateDeliverableTemplates(root);
    const second = generateDeliverableTemplates(root);

    expect(catalog.definitions).toHaveLength(39);
    expect(first).toHaveLength(39);
    expect(second).toEqual(first);
    expect(
      new Set(first.flatMap(({markdownPath, htmlPath}) => [markdownPath, htmlPath])).size,
    ).toBe(78);

    for (const generated of first) {
      const definition = definitions.get(generated.deliverableId);
      expect(definition, generated.deliverableId).toBeDefined();
      expectPortable(generated.markdownPath);
      expectPortable(generated.htmlPath);
      expect(generated.markdownPath).toMatch(
        new RegExp(`/p[0-9]{2}-[^/]+/templates/${generated.deliverableId}\\.template\\.md$`, 'u'),
      );
      expect(generated.htmlPath).toBe(generated.markdownPath.replace(/\.md$/u, '.html'));

      const document = parseFramesDeliverableMarkdown(generated.markdown);
      expect(document.frontmatter).toMatchObject({
        deliverable_id: generated.deliverableId,
        workflow_id: generated.workflowId,
        state: 'DRAFT',
        next_gate: definition?.acceptance_gate,
      });
      expect(document.sections.map(({id}) => id)).toEqual(FRAMES_DELIVERABLE_SECTIONS);
      expect(document.frontmatter.fields.map(({field_id}) => field_id)).toEqual(
        definition?.required_fields,
      );
      expect(
        document.frontmatter.fields.every(
          ({field_id, status, value, source_refs}) =>
            status === 'unknown' && value === `⟦UNKNOWN:${field_id}⟧` && source_refs.length === 0,
        ),
      ).toBe(true);
      for (const source of document.frontmatter.sources) {
        expectPortable(source.ref);
        expect(source).toMatchObject({authority: 'verified', rights: 'cleared'});
        expect(source.sha256).toMatch(/^[a-f0-9]{64}$/u);
      }
      expect(verifyDeliverableParity(generated.markdown, generated.html)).toMatchObject({
        status: 'PASS',
        issues: [],
      });
    }
  });

  it('projects MetodologIA metadata, offline design controls and no state promotion', () => {
    const generated = generateDeliverableTemplates(root);
    for (const {deliverableId, workflowId, html} of generated) {
      expect(html, deliverableId).toContain('content="deliverable"');
      expect(html, deliverableId).toContain('content="frames-deliverable-v1"');
      expect(html, deliverableId).toContain(`content="${deliverableId}"`);
      expect(html, deliverableId).toContain(`content="${workflowId}"`);
      expect(html, deliverableId).toContain('name="frames:state" content="DRAFT"');
      expect(html, deliverableId).toContain("default-src 'none'");
      expect(html, deliverableId).toContain("connect-src 'none'");
      expect(html, deliverableId).toContain('Frames · MetodologIA');
      expect(html, deliverableId).toContain('#122562');
      expect(html, deliverableId).toContain('#ffd700');
      expect(html, deliverableId).toContain('#137dc5');
      expect(html, deliverableId).toContain("'Poppins'");
      expect(html, deliverableId).toContain("'Montserrat'");
      expect(html, deliverableId).toContain("'Trebuchet MS'");
      expect(html, deliverableId).toContain('@media (min-width: 768px)');
      expect(html, deliverableId).toContain('@media (min-width: 1280px)');
      expect(html, deliverableId).toContain('@media (prefers-reduced-motion: reduce)');
      expect(html, deliverableId).toContain('@media print');
      expect(html, deliverableId).toContain('RENDERED_DRAFT ≠ HUMAN_APPROVED ≠ READY ≠ PUBLISHED');
      expect(html, deliverableId).not.toContain('name="frames:state" content="HUMAN_APPROVED"');
      expect(html, deliverableId).not.toMatch(/(?:src|href)="https?:/u);
      expect(html, deliverableId).not.toContain('fetch(');
    }
  });

  it('isolates --stage and fail-closes on missing, drift and extra projections', () => {
    const outputRoot = temporaryRoot();
    const options = parseDeliverableTemplateArgs([
      '--root',
      root,
      '--output-root',
      outputRoot,
      '--stage',
      'P03',
      '--write',
    ]);
    const written = runDeliverableTemplateGeneration(options);

    expect(written).toMatchObject({mode: 'write', selected: 5});
    expect(written.written).toHaveLength(10);
    expect(written.written.every((path) => path.includes('/p03-crear-brief/templates/'))).toBe(
      true,
    );
    expect(written.written.every((path) => existsSync(resolve(outputRoot, path)))).toBe(true);
    expect(runDeliverableTemplateGeneration({...options, write: false})).toMatchObject({
      mode: 'check',
      selected: 5,
      missing: [],
      drift: [],
      extra: [],
    });

    const missingPath = written.written[0]!;
    unlinkSync(resolve(outputRoot, missingPath));
    expect(() => runDeliverableTemplateGeneration({...options, write: false})).toThrow(
      /missing=1 drift=0/u,
    );
    runDeliverableTemplateGeneration({...options, write: true});

    const driftPath = written.written[1]!;
    writeFileSync(resolve(outputRoot, driftPath), 'drift\n', 'utf8');
    expect(() => runDeliverableTemplateGeneration({...options, write: false})).toThrow(
      /missing=0 drift=1/u,
    );
    runDeliverableTemplateGeneration({...options, write: true});

    const extraPath = resolve(outputRoot, dirname(missingPath), 'extra.template.md');
    writeFileSync(extraPath, 'extra\n', 'utf8');
    expect(() => runDeliverableTemplateGeneration({...options, write: false})).toThrow(
      /Extra generated templates/u,
    );
  });
});
