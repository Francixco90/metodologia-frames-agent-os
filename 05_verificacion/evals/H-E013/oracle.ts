// H-E013 oracle — multimedia workflow P00 parses schemas + gate/chain consistent. [CÓDIGO]
import type {Oracle, OracleOutcome} from '../lib/eval-result-schema.ts';
import {runWorkflowOracle} from '../lib/workflow-oracle.ts';

export const oracle: Oracle = {
  hypothesis_id: 'H-E013',
  run: (): OracleOutcome => runWorkflowOracle('P00'),
};
