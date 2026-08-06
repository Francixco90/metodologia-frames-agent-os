import {runWorkflow} from '../_runner/run.ts';

try {
  runWorkflow('P03');
} catch (err) {
  console.error(err);
  process.exitCode = 1;
}
