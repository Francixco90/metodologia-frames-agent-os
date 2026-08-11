type Workflow = {
  workflow_id: string;
  execution_steps: Array<{
    step_id: string;
    conditional_inputs?: Array<{inputs: string[]}> | undefined;
  }>;
};

export const reportCareerCheck = (
  errors: string[],
  workflowCount: number,
  definitionCount: number,
) => {
  if (errors.length) {
    console.error(errors.join('\n'));
    process.exitCode = 1;
  } else {
    console.info(`PASS CAREER OS: ${workflowCount}/${definitionCount}; C09 STOP.`);
  }
};

/** [CONFIG] Liga los inputs targeted de C06 a las salidas registradas de C04/C05. */
export const checkCareerTargetedInputs = (
  workflows: Workflow[],
  definitions: Map<string, {workflow_id: string}>,
  errors: string[],
): void => {
  const inputs =
    workflows
      .find(({workflow_id}) => workflow_id === 'C06')
      ?.execution_steps.find(({step_id}) => step_id === 'S00')
      ?.conditional_inputs?.flatMap(({inputs: values}) => values) ?? [];
  for (const [deliverableId, workflowId] of [
    ['fit-scorecard-v1', 'C04'],
    ['immutable-job-snapshot-v1', 'C04'],
    ['application-brief-v1', 'C05'],
    ['requirement-evidence-matrix-v1', 'C05'],
    ['application-decision-record-v1', 'C05'],
  ] as const) {
    if (
      !inputs.includes(deliverableId) ||
      definitions.get(deliverableId)?.workflow_id !== workflowId
    )
      errors.push(`CAREER-CV-TARGETED-001 C06 missing ${workflowId}/${deliverableId}`);
  }
};
