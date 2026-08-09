import {describe, expect, it} from 'vitest';

import {buildDocumentationOutputs} from 'workflows/documentation/generate.ts';
import {loadWorkflowDocumentation} from 'workflows/documentation/workflow-source.ts';

const root = process.cwd();

describe('documentation as code generator', () => {
  it('projects every discovered workflow into Markdown, HTML and coverage', async () => {
    const workflows = await loadWorkflowDocumentation(root);
    const outputs = await buildDocumentationOutputs({repoRoot: root});
    expect(workflows.length).toBeGreaterThanOrEqual(33);
    expect(new Set(workflows.map(({family}) => family))).toEqual(
      new Set(['content', 'career', 'local-extension', 'maintenance']),
    );
    for (const workflow of workflows) {
      const slug = workflow.id.toLowerCase();
      const markdown = outputs.get(`01_intencion/reference/workflows/${slug}.md`);
      const html = outputs.get(`03_artefactos/content/documentation/workflows/${slug}.html`);
      expect(markdown, `${workflow.id} Markdown`).toContain('```mermaid');
      expect(markdown, `${workflow.id} textual sequence`).toContain('### Alternativa textual');
      expect(html, `${workflow.id} HTML`).toContain(
        `<meta name="frames:workflow" content="${workflow.id}"`,
      );
      expect(html, `${workflow.id} accessible SVG`).toContain('<desc id="seq-desc">');
    }
    const coverage = JSON.parse(
      outputs.get('03_artefactos/content/documentation/documentation-coverage-v1.json') ?? 'null',
    ) as Array<{workflowId: string; referencesResolvable: boolean; unresolvedReferences: string[]}>;
    expect(coverage).toHaveLength(workflows.length);
    expect(coverage.map(({workflowId}) => workflowId)).toEqual(workflows.map(({id}) => id));
    expect(coverage.every(({referencesResolvable}) => referencesResolvable)).toBe(true);
    expect(coverage.every(({unresolvedReferences}) => unresolvedReferences.length === 0)).toBe(
      true,
    );
  });

  it('is byte-deterministic and keeps the portal offline and searchable', async () => {
    const first = await buildDocumentationOutputs({repoRoot: root});
    const second = await buildDocumentationOutputs({repoRoot: root});
    expect([...first]).toEqual([...second]);
    const portal = first.get('03_artefactos/content/documentation/index.html') ?? '';
    expect(portal).toContain('id="q"');
    expect(portal).toContain('data-search=');
    expect(portal).toContain("default-src 'none'");
    expect(portal).not.toMatch(/https?:\/\//u);
  });
});
