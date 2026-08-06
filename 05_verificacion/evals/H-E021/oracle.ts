// H-E021 oracle — multimedia workflow P08 parses schemas + gate/chain consistent. [CÓDIGO]
import type {Oracle, OracleOutcome} from '../lib/eval-result-schema.ts';
import {runWorkflowOracle} from '../lib/workflow-oracle.ts';

export const oracle: Oracle = {
  hypothesis_id: 'H-E021',
  run: (): OracleOutcome => runWorkflowOracle('P08'),
};
