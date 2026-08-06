import {runWorkflow} from '../_runner/run.ts';

try {
  runWorkflow('P04');
} catch (err) {
  console.error(err);
  process.exitCode = 1;
}
