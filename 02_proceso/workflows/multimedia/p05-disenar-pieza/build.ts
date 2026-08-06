import {runWorkflow} from '../_runner/run.ts';

try {
  runWorkflow('P05');
} catch (err) {
  console.error(err);
  process.exitCode = 1;
}
