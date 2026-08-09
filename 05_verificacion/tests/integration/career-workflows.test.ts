import {createHash} from 'node:crypto';
import {existsSync, readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';

import {parse} from 'yaml';
import {describe, expect, it} from 'vitest';

import {CareerWorkflowIdSchema, CareerWorkflowV1Schema} from 'workflows/career/_schema/index.ts';

const ROOT = process.cwd();
const CAREER_ROOT = resolve(ROOT, '02_proceso/workflows/career');
const directories = [
  'c00-intake',
  'c01-evidence',
  'c02-positioning',
  'c03-discovery',
  'c04-scoring',
  'c05-application-design',
  'c06-cv',
  'c07-cover-letter',
  'c08-package-qa',
  'c09-submission',
] as const;
const workflows = directories.map((directory) => {
  const path = resolve(CAREER_ROOT, directory, 'workflow.yml');
  return {
    directory,
    path,
    workflow: CareerWorkflowV1Schema.parse(parse(readFileSync(path, 'utf8'))),
  };
});

describe('Career C00-C09 workflow family', () => {
  it('declares exactly one ordered workflow for every canonical Career id', () => {
    const ids = workflows.map(({workflow}) => workflow.workflow_id);
    expect(ids).toEqual(CareerWorkflowIdSchema.options);
    expect(new Set(ids).size).toBe(10);
  });

  it('forms one deterministic C00-C09 successor chain', () => {
    workflows.forEach(({workflow}, index) => {
      expect(workflow.next_workflow).toBe(
        index === 9 ? null : `C${String(index + 1).padStart(2, '0')}`,
      );
    });
  });

  it('keeps steps atomic, budgeted and resolvable to declared capabilities and deliverables', () => {
    for (const {workflow} of workflows) {
      const stepIds = workflow.execution_steps.map(({step_id}) => step_id);
      expect(new Set(stepIds).size).toBe(stepIds.length);
      for (const step of workflow.execution_steps) {
        expect(workflow.capability_map).toContain(step.primary_skill);
        expect(step.optional_skills.every((skill) => workflow.capability_map.includes(skill))).toBe(
          true,
        );
        expect(step.outputs.every((output) => workflow.deliverables.includes(output))).toBe(true);
        expect(workflow.gates).toContain(step.gate);
        expect(step.context_budget.target_files).toBeLessThanOrEqual(step.context_budget.max_files);
        expect(step.context_budget.max_files).toBeLessThanOrEqual(20);
        expect(step.context_budget.target_tokens).toBeLessThanOrEqual(
          step.context_budget.max_tokens,
        );
        expect(step.context_budget.max_tokens).toBeLessThanOrEqual(28_000);
      }
    }
  });

  it('resolves every primary Markdown template and its HTML projection', () => {
    for (const {path, workflow} of workflows) {
      const markdown = resolve(ROOT, workflow.template_ref);
      const html = markdown.replace(/\.md$/u, '.html');
      expect(existsSync(markdown), `${workflow.workflow_id} Markdown template`).toBe(true);
      expect(existsSync(html), `${workflow.workflow_id} HTML template`).toBe(true);
      expect(dirname(markdown)).toBe(resolve(dirname(path), 'templates'));
    }
  });

  it('resolves each skill to a first-party package and keeps RT-09/RT-11 distinct', () => {
    const skills = new Set(workflows.flatMap(({workflow}) => workflow.capability_map));
    for (const skill of skills) {
      expect(existsSync(resolve(ROOT, '03_artefactos/skills', skill, 'SKILL.md')), skill).toBe(
        true,
      );
    }
    const qa = workflows.find(({workflow}) => workflow.workflow_id === 'C08')!.workflow;
    expect(qa.execution_steps.map(({verifier}) => verifier)).toEqual(['RT-09', 'RT-11']);
  });

  it('keeps every workflow in local evaluation with no publication authority', () => {
    for (const {workflow} of workflows) {
      expect(workflow.metadata).toEqual({
        status: 'candidate',
        execution_scope: 'local-evaluation',
        publication_authority: false,
      });
    }
  });

  it('binds the first-party projection to the registry with exact ids and hashes', () => {
    const registry = parse(
      readFileSync(
        resolve(ROOT, '04_estado/registries/sources/career-requirements-registry.yml'),
        'utf8',
      ),
    ) as {
      projection_ref: string;
      projection_sha256: string;
      ordered_bundle_sha256: string;
      requirements: Array<{requirement_id: string; raw_sha256: string}>;
    };
    const projectionPath = resolve(ROOT, registry.projection_ref);
    const projectionBytes = readFileSync(projectionPath);
    const projection = parse(projectionBytes.toString('utf8')) as {
      source_bundle_sha256: string;
      documents: Array<{requirement_id: string; raw_sha256: string}>;
    };

    expect(createHash('sha256').update(projectionBytes).digest('hex')).toBe(
      registry.projection_sha256,
    );
    expect(projection.source_bundle_sha256).toBe(registry.ordered_bundle_sha256);
    expect(
      projection.documents.map(({requirement_id, raw_sha256}) => ({requirement_id, raw_sha256})),
    ).toEqual(registry.requirements);
  });

  it('makes C09 prepare-and-stop and never emits a submission receipt as executed output', () => {
    const c09 = workflows.find(({workflow}) => workflow.workflow_id === 'C09')!.workflow;
    const executionOutputs = c09.execution_steps.flatMap(({outputs}) => outputs);
    expect(c09.gates).toContain('CR_SUBMISSION_AUTHORIZED');
    expect(c09.stop_rule).toMatch(/PREPARED_STOP/u);
    expect(executionOutputs).not.toContain('submission-receipt-v1');
    expect(c09.metadata.publication_authority).toBe(false);
  });
});
