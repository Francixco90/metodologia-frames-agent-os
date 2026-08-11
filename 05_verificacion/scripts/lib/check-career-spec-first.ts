import {existsSync, readFileSync} from 'node:fs';
import {resolve} from 'node:path';

type Workflow = {
  workflow_id: string;
  inputs: string[];
  deliverables: string[];
  execution_steps: Array<{step_id: string; gate: string}>;
  stop_rule: string;
};

/** Verifica el contrato CV Spec-First sin mezclarlo con la autoridad de requisitos Career OS. */
export const checkCareerCvSpecFirst = (
  root: string,
  workflows: Workflow[],
  errors: string[],
): void => {
  const cvWorkflow = workflows.find(({workflow_id}) => workflow_id === 'C06');
  if (
    !cvWorkflow ||
    cvWorkflow.execution_steps.map(({step_id}) => step_id).join(',') !== 'S00,S01,S02,S03,S04' ||
    cvWorkflow.execution_steps[1]?.gate !== 'CR_CV_DESIGN_APPROVED' ||
    cvWorkflow.execution_steps[2]?.gate !== 'CR_CV_SPEC_APPROVED' ||
    !cvWorkflow.deliverables.includes('cv-spec-v2') ||
    !cvWorkflow.deliverables.includes('cv-design-brief-v1') ||
    !cvWorkflow.deliverables.includes('cv-design-decision-v1') ||
    !cvWorkflow.deliverables.includes('cv-source-v2') ||
    !cvWorkflow.deliverables.includes('cv-ats-docx-v1') ||
    !cvWorkflow.deliverables.includes('cv-executive-html-v1') ||
    !/hash stale|hash.*invalida/iu.test(cvWorkflow.stop_rule)
  ) {
    errors.push(
      'CAREER-CV-SPEC-001 C06 must implement Spec > Design > Compile > Project fail-closed',
    );
  }
  if (
    cvWorkflow?.inputs.includes('application-brief-v1') ||
    cvWorkflow?.inputs.includes('requirement-evidence-matrix-v1')
  ) {
    errors.push('CAREER-CV-SPEC-002 general C06 route cannot require targeted-only inputs');
  }

  const packageQa = workflows.find(({workflow_id}) => workflow_id === 'C08');
  if (
    !packageQa ||
    !packageQa.inputs.includes('cv-spec-v2') ||
    !packageQa.inputs.includes('cv-source-v2') ||
    !packageQa.deliverables.includes('cv-package-v3') ||
    !/spec|hash stale/iu.test(packageQa.stop_rule)
  ) {
    errors.push('CAREER-CV-SPEC-003 C08 must verify the exact spec-and-design-bound v3 package');
  }

  for (const path of [
    '02_proceso/workflows/career/_schema/cv-spec-v1.schema.ts',
    '02_proceso/workflows/career/_schema/cv-spec-v2.schema.ts',
    '02_proceso/workflows/career/_schema/cv-package-v3.schema.ts',
    '02_proceso/workflows/career/_schema/cv-design-decision-v1.schema.ts',
    '02_proceso/workflows/career/_schema/document-v2.schema.ts',
    '02_proceso/workflows/career/_runner/cv-spec.ts',
    '02_proceso/workflows/career/_runner/cv-docx.ts',
    '02_proceso/workflows/career/_assets/ats-document-template.html',
  ]) {
    if (!existsSync(resolve(root, path))) errors.push(`CAREER-CV-SPEC-004 missing ${path}`);
  }

  const packageJson = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')) as {
    dependencies?: Record<string, string>;
  };
  if (packageJson.dependencies?.docx !== '9.7.1' || packageJson.dependencies.jszip !== '3.10.1') {
    errors.push('CAREER-CV-SPEC-005 DOCX runtime dependencies must be exact and pinned');
  }
  const cvSkill = readFileSync(
    resolve(root, '03_artefactos/skills/evidence-first-cv/SKILL.md'),
    'utf8',
  );
  if (/\b(?:9[0-9]|100)\s*%\s*(?:ATS|compatib)/iu.test(cvSkill)) {
    errors.push('CAREER-CV-SPEC-006 unsupported ATS percentage claim');
  }
};
