// H-E017 oracle — multimedia workflow P04 parses schemas + gate/chain consistent. [CÓDIGO]
import type {Oracle, OracleOutcome} from '../lib/eval-result-schema.ts';
import {runWorkflowOracle} from '../lib/workflow-oracle.ts';

export const oracle: Oracle = {
  hypothesis_id: 'H-E017',
  run: (): OracleOutcome => runWorkflowOracle('P04'),
};
