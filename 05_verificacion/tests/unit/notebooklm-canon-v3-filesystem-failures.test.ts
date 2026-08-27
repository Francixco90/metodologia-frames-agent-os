import {readFileSync, rmSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {parse as parseYaml, stringify as stringifyYaml} from 'yaml';
import {afterEach, describe, expect, it} from 'vitest';

import {validateNotebookLmCanonV3} from '../../scripts/check-notebooklm-canon-v3.ts';
import {createValidFixture} from './notebooklm-canon-v3/fixture.ts';

describe('Canon v3 filesystem validator: fail-closed cases', () => {
  const temporaryRoots: string[] = [];
  afterEach(() => {
    for (const root of temporaryRoots.splice(0)) rmSync(root, {recursive: true, force: true});
  });

  it('rejects Studio in the materialization plan and unknown grounding sources', () => {
    const root = createValidFixture(temporaryRoots);
    const planPath = resolve(root, 'notebook-import-plan-v2.yml');
    const plan = parseYaml(readFileSync(planPath, 'utf8')) as {
      operations: Array<{action: string; requiredGate: string | null}>;
    };
    const curate = plan.operations.find(({action}) => action === 'curate')!;
    curate.action = 'studio';
    curate.requiredGate = 'NLM_STUDIO_GENERATION_APPROVED';
    writeFileSync(planPath, stringifyYaml(plan));

    const groundingPath = resolve(root, 'grounding-suite-v1.yml');
    const grounding = parseYaml(readFileSync(groundingPath, 'utf8')) as {
      tests: Array<{source_ids: string[]}>;
    };
    grounding.tests[0]!.source_ids[0] = 'NLS-UNKNOWN-SOURCE';
    writeFileSync(groundingPath, stringifyYaml(grounding));

    const report = validateNotebookLmCanonV3(root);
    expect(report.errors.some((error) => error.includes('studio is outside'))).toBe(true);
    expect(report.errors.some((error) => error.includes('uses unknown NLS-UNKNOWN-SOURCE'))).toBe(
      true,
    );
  });

  it('reports voseo and an oversized bootstrap without mutating the corpus', () => {
    const root = createValidFixture(temporaryRoots);
    const bootstrap = resolve(root, 'knowledge-base/00-control/control-3.md');
    const broken = readFileSync(bootstrap, 'utf8')
      .replace('language: en', 'language: es-419')
      .replace(
        '<identity>fixture identity</identity>',
        `<identity>${'podés '.repeat(5_000)}</identity>`,
      );
    writeFileSync(bootstrap, broken);
    const report = validateNotebookLmCanonV3(root);
    expect(report.errors.some((error) => error.includes('contains voseo'))).toBe(true);
    expect(
      report.errors.some((error) => error.includes('Bootstrap character budget exceeded')),
    ).toBe(true);
  });

  it('requires same-line source references for evidence claim tags', () => {
    const root = createValidFixture(temporaryRoots);
    const documentPath = resolve(root, 'knowledge-base/00-control/control-0.md');
    const broken = readFileSync(documentPath, 'utf8').replace(
      '<evidence>\n',
      '<evidence>\n- [METODOLOGIA] This strong claim has no citation.\n',
    );
    writeFileSync(documentPath, broken);
    const report = validateNotebookLmCanonV3(root);
    expect(
      report.errors.some((error) => error.includes('claim tag without same-line source_ref')),
    ).toBe(true);
  });
});
