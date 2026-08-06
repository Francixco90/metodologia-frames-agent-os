import {runWorkflow} from '../_runner/run.ts';

try {
  runWorkflow('P07');
} catch (err) {
  console.error(err);
  process.exitCode = 1;
}
