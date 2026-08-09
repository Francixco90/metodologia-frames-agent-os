import type {AddCheck, QualityGateContext} from './quality-gate-types.ts';
import {inspectMaterialEvidence, inspectOutputIntegrity} from './material-integrity.ts';

const CANDIDATE_STATE = 'RENDERED_DRAFT';
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

  const receiptTarget =
    typeof ctx.receiptPayload.work_product_state_to === 'string'
      ? ctx.receiptPayload.work_product_state_to
      : '';
  const candidateOnly =
    receiptTarget === CANDIDATE_STATE && ctx.receiptPayload.human_approved === false;
  add(
    'MW-Q07',
    candidateOnly,
    candidateOnly
      ? `candidate=${CANDIDATE_STATE}; declared target=${ctx.workflowParsed.work_product_state} not promoted`
      : `receipt target=${receiptTarget}; only ${CANDIDATE_STATE} is allowed without governed transition evidence`,
  );

  const evidence = inspectMaterialEvidence(ctx);
  add('MW-Q08', evidence.passed, evidence.detail);

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
  const integrity = inspectOutputIntegrity(ctx);
  add(
    'MW-Q10',
    scopeMatches && integrity.passed,
    `scope=${scopeMatches ? 'valid' : 'invalid'}; ${integrity.detail}`,
  );
};
