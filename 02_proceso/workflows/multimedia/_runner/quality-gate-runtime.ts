import type {AddCheck, QualityGateContext} from './quality-gate-types.ts';

const TERMINAL_HUMAN_STATES = new Set(['HUMAN_APPROVED', 'READY', 'PUBLISHED']);
const MANUAL_GATES = new Set([
  'G13',
  'G14',
  'G15',
  'G16',
  'G17',
  'MW_BRIEF_APPROVED',
  'MW_DISTRIBUTION_AUTHORIZED',
]);

/** Handoff, state, evidence, manual-gate and material checks MW-Q06..MW-Q10. [CONFIG] */
export const evaluateRuntimeChecks = (ctx: QualityGateContext, add: AddCheck): void => {
  const rootWorkflow = ctx.workflowParsed.inputs.length === 0;
  const allInputsResolved =
    ctx.inputResolutions.length === ctx.workflowParsed.inputs.length &&
    ctx.inputResolutions.every((input) => input.exists);
  add(
    'MW-Q06',
    rootWorkflow || allInputsResolved,
    rootWorkflow
      ? 'root exempt (no prior inputs)'
      : allInputsResolved
        ? `${ctx.inputResolutions.length} input(s) resolved`
        : `missing input: ${
            ctx.inputResolutions
              .filter((input) => !input.exists)
              .map((input) => input.input)
              .join(', ') || 'count mismatch'
          }`,
  );

  const targetState = ctx.workflowParsed.work_product_state;
  const receiptTarget =
    typeof ctx.receiptPayload.work_product_state_to === 'string'
      ? ctx.receiptPayload.work_product_state_to
      : '';
  const notTerminal = !TERMINAL_HUMAN_STATES.has(targetState);
  const stateMatches = receiptTarget === targetState;
  add(
    'MW-Q07',
    notTerminal && stateMatches,
    !notTerminal
      ? `target=${targetState} is a terminal human state`
      : stateMatches
        ? `target=${targetState} (not terminal); receipt matches`
        : `receipt work_product_state_to=${receiptTarget} != workflow ${targetState}`,
  );

  const tags = ctx.receiptPayload.evidence_tags;
  const tagsPresent = Array.isArray(tags) && tags.length > 0;
  add('MW-Q08', tagsPresent, tagsPresent ? `${tags.length} tag(s)` : 'missing evidence_tags');

  const hasManualGate = ctx.workflowParsed.gates.some((gate) => MANUAL_GATES.has(gate));
  add(
    'MW-Q09',
    !hasManualGate || !ctx.autoAdvance,
    hasManualGate
      ? `manual gate present; autoAdvance=${ctx.autoAdvance}`
      : 'no manual gate in workflow',
  );

  const scope = ctx.receiptPayload.scope as Record<string, unknown> | undefined;
  const scopeMatches =
    scope?.workflow_id === ctx.workflowId &&
    typeof scope.mode === 'string' &&
    scope.effect_class === 'local_reversible';
  const outputsExist =
    ctx.outputResolutions.length === ctx.workflowParsed.outputs.length &&
    ctx.outputResolutions.every((output) => output.exists && /^[a-f0-9]{64}$/u.test(output.sha256));
  add(
    'MW-Q10',
    scopeMatches && outputsExist,
    `scope=${scopeMatches ? 'valid' : 'invalid'}; material_outputs=${ctx.outputResolutions.filter((output) => output.exists).length}/${ctx.workflowParsed.outputs.length}`,
  );
};
