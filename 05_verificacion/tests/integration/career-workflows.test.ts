import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, resolve} from 'node:path';

import {parse} from 'yaml';
import {describe, expect, it} from 'vitest';

import {CareerWorkflowIdSchema, CareerWorkflowV1Schema} from 'workflows/career/_schema/index.ts';
import {CareerDeliverableRegistryV1Schema} from 'workflows/career/_schema/registry-v1.schema.ts';
import {generateCareerWorkflowTemplates} from 'workflows/career/_runner/generate-workflow-templates.ts';
import {
  parseCareerWorkflowTemplate,
  verifyCareerWorkflowTemplateParity,
} from 'workflows/career/_runner/workflow-template-model.ts';

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
const deliverableRegistry = CareerDeliverableRegistryV1Schema.parse(
  parse(readFileSync(resolve(CAREER_ROOT, '_assets/deliverable-registry.yml'), 'utf8')),
);

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
      const consumed = new Set([
        ...workflow.execution_steps.map(({gate}) => gate),
        ...(workflow.preconditions ?? []),
      ]);
      expect(workflow.gates.every((gate) => consumed.has(gate))).toBe(true);
      expect((workflow.preconditions ?? []).every((gate) => workflow.gates.includes(gate))).toBe(
        true,
      );
    }
  });

  it('accepts only declared preconditions and rejects orphan gates', () => {
    const base = structuredClone(workflows[0]!.workflow);
    const gate = 'CR_PACKAGE_APPROVED' as const;
    expect(
      CareerWorkflowV1Schema.safeParse({
        ...base,
        gates: [...base.gates, gate],
        preconditions: [gate],
      }).success,
    ).toBe(true);
    expect(
      CareerWorkflowV1Schema.safeParse({...base, preconditions: ['CR_PACKAGE_APPROVED']}).success,
    ).toBe(false);
    expect(
      CareerWorkflowV1Schema.safeParse({...base, gates: [...base.gates, 'CR_PACKAGE_APPROVED']})
        .success,
    ).toBe(false);
    expect(
      CareerWorkflowV1Schema.safeParse({...base, preconditions: [base.gates[0]!]}).success,
    ).toBe(false);
  });

  it('blocks Career consumers on evidence readiness without replacing output gates', () => {
    const byId = new Map(workflows.map(({workflow}) => [workflow.workflow_id, workflow]));
    const expectedOutputGates = {
      C02: ['G13', 'CR_BRIEF_APPROVED'],
      C06: [
        'CR_BRIEF_APPROVED',
        'CR_CV_DESIGN_APPROVED',
        'CR_CV_SPEC_APPROVED',
        'G13',
        'CR_PACKAGE_APPROVED',
      ],
      C08: ['G14', 'CR_PACKAGE_APPROVED'],
    } as const;
    for (const [workflowId, gates] of Object.entries(expectedOutputGates)) {
      const workflow = byId.get(workflowId as 'C02' | 'C06' | 'C08')!;
      expect(workflow.preconditions).toEqual(['CR_CAREER_EVIDENCE_READY']);
      expect(workflow.inputs).toContain('career-evidence-readiness-v1');
      expect(workflow.execution_steps.flatMap(({gate}) => gate)).toEqual(gates);
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

  it('reproduces all C00-C09 HTML from twelve-section Markdown with complete controls', () => {
    expect(generateCareerWorkflowTemplates({check: true})).toMatchObject({
      status: 'PASS',
      mode: 'check',
    });
    for (const {workflow} of workflows) {
      const markdown = readFileSync(resolve(ROOT, workflow.template_ref), 'utf8');
      const html = readFileSync(
        resolve(ROOT, workflow.template_ref.replace(/\.template\.md$/u, '.template.html')),
        'utf8',
      );
      const model = parseCareerWorkflowTemplate(markdown);
      const embedded =
        /<script id="career-workflow-template-data" type="application\/json">([\s\S]*?)<\/script>/u.exec(
          html,
        );

      expect(model.sections).toHaveLength(12);
      expect(model.sections.map(({number}) => number)).toEqual(
        Array.from({length: 12}, (_, index) => index + 1),
      );
      expect(JSON.parse(embedded?.[1] ?? '{}')).toEqual(model);
      expect(verifyCareerWorkflowTemplateParity(markdown, html)).toEqual([]);
      expect(html).toContain(`name="template-id" content="${model.template_id}"`);
      expect(html).toContain(`name="workflow-id" content="${model.workflow_id}"`);
      expect(html).toContain(`name="content-sha256" content="${model.content_sha256}"`);
      expect(html).toContain('Content-Security-Policy');
      expect(html).toMatch(/@media\s*print/u);
      expect(html).toMatch(/prefers-reduced-motion\s*:\s*reduce/u);
    }
  });

  it('materializes additive v2/v3 templates while the A1 workflow migration remains blocked', () => {
    const generation = generateCareerWorkflowTemplates({check: true});
    expect(generation.entries.map(({source}) => source)).toEqual(
      expect.arrayContaining([
        'c06-cv/templates/cv-source-v2.template.md',
        'c08-package-qa/templates/cv-package-v3.template.md',
      ]),
    );

    const byId = new Map(workflows.map(({workflow}) => [workflow.workflow_id, workflow]));
    expect(byId.get('C06')?.template_ref).toMatch(/cv-source-v1\.template\.md$/u);
    expect(byId.get('C07')?.inputs).toContain('cv-source-v1');
    expect(byId.get('C08')?.template_ref).toMatch(/application-package-v1\.template\.md$/u);
    expect(byId.get('C09')?.inputs).toContain('application-package-v1');
    expect(
      readFileSync(resolve(ROOT, '01_intencion/career/career-os-operating-contract-v2.md'), 'utf8'),
    ).toContain('coverage_gap: A1_MATERIAL_MIGRATION_REQUIRED');

    const lifecycle = new Map(
      deliverableRegistry.versioned_contract_lifecycle.map((entry) => [
        entry.deliverable_id,
        entry,
      ]),
    );
    expect(lifecycle.get('cv-source-v2')).toMatchObject({
      state: 'active',
      allowed_for_new_runs: true,
    });
    expect(lifecycle.get('cv-source-v1')).toMatchObject({
      state: 'compatibility-only',
      successor_id: 'cv-source-v2',
      allowed_for_new_runs: false,
    });

    const compatibilityIds = new Set(
      deliverableRegistry.versioned_contract_lifecycle
        .filter(({state}) => state === 'compatibility-only')
        .map(({deliverable_id}) => deliverable_id),
    );
    const legacyNames = new Set(
      deliverableRegistry.definitions
        .filter(({deliverable_id}) => compatibilityIds.has(deliverable_id))
        .map(({template_ref}) => template_ref.split('/').at(-1)),
    );
    for (const definition of deliverableRegistry.definitions) {
      if (!compatibilityIds.has(definition.deliverable_id)) {
        expect(legacyNames.has(definition.template_ref.split('/').at(-1))).toBe(false);
      }
    }

    const hostile = structuredClone(deliverableRegistry);
    hostile.definitions.find(
      ({deliverable_id}) => deliverable_id === 'cv-package-v3',
    )!.template_ref = 'alias/application-package-v1.template.md';
    expect(CareerDeliverableRegistryV1Schema.safeParse(hostile).success).toBe(false);
  });

  it('exposes a black-box --check CLI that reports current outputs without mutation', () => {
    const script = resolve(CAREER_ROOT, '_runner/generate-workflow-templates.ts');
    const result = spawnSync(resolve(ROOT, 'node_modules/.bin/tsx'), [script, '--check'], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    expect(result.status, result.stderr).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({
      status: 'PASS',
      mode: 'check',
      entries: Array.from({length: 10}, () => ({status: 'CURRENT'})),
    });
  });

  it('detects drift without writing and replays generated bytes identically', () => {
    const temporary = mkdtempSync(resolve(tmpdir(), 'frames-career-templates-'));
    try {
      cpSync(CAREER_ROOT, temporary, {recursive: true});
      const first = generateCareerWorkflowTemplates({root: temporary});
      const outputs = first.entries.map(({output}) => resolve(temporary, output));
      const baseline = outputs.map((path) => readFileSync(path));

      expect(generateCareerWorkflowTemplates({root: temporary, check: true}).status).toBe('PASS');
      generateCareerWorkflowTemplates({root: temporary});
      expect(outputs.map((path) => readFileSync(path))).toEqual(baseline);

      const driftPath = outputs[0]!;
      const drift = `${readFileSync(driftPath, 'utf8')}<!-- drift -->\n`;
      writeFileSync(driftPath, drift, 'utf8');
      expect(() => generateCareerWorkflowTemplates({root: temporary, check: true})).toThrow(
        /CAREER-TEMPLATE-DRIFT/u,
      );
      expect(readFileSync(driftPath, 'utf8')).toBe(drift);
    } finally {
      rmSync(temporary, {recursive: true, force: true});
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
