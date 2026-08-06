// H-E014 oracle — multimedia workflow P01 parses schemas + gate/chain consistent. [CÓDIGO]
import type {Oracle, OracleOutcome} from '../lib/eval-result-schema.ts';
import {runWorkflowOracle} from '../lib/workflow-oracle.ts';

export const oracle: Oracle = {
  hypothesis_id: 'H-E014',
  run: (): OracleOutcome => runWorkflowOracle('P01'),
};
