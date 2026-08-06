// H-E015 oracle — multimedia workflow P02 parses schemas + gate/chain consistent. [CÓDIGO]
import type {Oracle, OracleOutcome} from '../lib/eval-result-schema.ts';
import {runWorkflowOracle} from '../lib/workflow-oracle.ts';

export const oracle: Oracle = {
  hypothesis_id: 'H-E015',
  run: (): OracleOutcome => runWorkflowOracle('P02'),
};
