import {readFileSync, readdirSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, it} from 'vitest';
import {parse} from 'yaml';

import {MultimediaWorkflowSchema} from 'workflows/multimedia/_schema/workflow-v1.schema.ts';
import {
  loadDeliverableDefinitions,
  validateCatalogCoverage,
  validateWorkflowDeliverables,
} from '../../../scripts/lib/multimedia-deliverables.ts';

const root = process.cwd();
const dir = join(root, '02_proceso/workflows/multimedia');
const definitions = loadDeliverableDefinitions(root);
const definitionMap = new Map(definitions.map((item) => [item.deliverable_id, item]));
const workflows = readdirSync(dir)
  .filter((name) => /^p0[0-9]-/u.test(name))
  .sort()
  .map((name) =>
    MultimediaWorkflowSchema.parse(parse(readFileSync(join(dir, name, 'workflow.yml'), 'utf8'))),
  );

describe('multimedia deliverable integrity', () => {
  it('binds all 39 definitions exactly once across P00-P09', () => {
    expect(workflows).toHaveLength(10);
    expect(definitions).toHaveLength(39);
    expect(validateCatalogCoverage(workflows, definitions)).toEqual([]);
    for (const workflow of workflows) {
      expect(validateWorkflowDeliverables(root, workflow, definitionMap)).toEqual([]);
    }
  });

  it('covers the named campaign, planning, prompt and measurement touchpoints', () => {
    expect(
      [
        'brand-charter-v1',
        'campaign-charter-v1',
        'executive-presentation-v1',
        'editorial-calendar-v1',
        'content-grid-v1',
        'universal-prompts-v1',
        'piece-family-spec-v1',
        'results-dashboard-v1',
      ].every((id) => definitionMap.has(id)),
    ).toBe(true);
    expect(definitionMap.get('universal-prompts-v1')?.piece_families).toEqual([
      'image',
      'miniclip',
      'graphic',
      'carousel',
      'story',
    ]);
  });

  it('blocks display, schema, catalog and optional-condition drift', () => {
    const p03 = workflows.find(({workflow_id}) => workflow_id === 'P03')!;
    const changed = structuredClone(p03);
    changed.outputs[0]!.artifact = 'Nombre divergente';
    changed.outputs[1]!.schema_ref = 'missing.schema.ts';
    changed.outputs[1]!.condition = undefined;
    changed.brief.deliverables = changed.brief.deliverables.slice(1);

    expect(validateWorkflowDeliverables(root, changed, definitionMap)).toEqual(
      expect.arrayContaining([
        'P03: outputs differ from brief.deliverables',
        'P03: display drift for brief-campaign-map-v1',
        'P03: schema unresolved for campaign-charter-v1',
        'P03: optional output lacks condition campaign-charter-v1',
      ]),
    );
  });
});
