// H-E020 oracle — multimedia workflow P07 parses schemas + gate/chain consistent. [CÓDIGO]
import type {Oracle, OracleOutcome} from '../lib/eval-result-schema.ts';
import {runWorkflowOracle} from '../lib/workflow-oracle.ts';

export const oracle: Oracle = {
  hypothesis_id: 'H-E020',
  run: (): OracleOutcome => runWorkflowOracle('P07'),
};
