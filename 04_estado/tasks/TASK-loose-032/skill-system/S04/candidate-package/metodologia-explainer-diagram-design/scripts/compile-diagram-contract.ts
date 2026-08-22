import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

import {
  assertDiagramContractInput,
  DiagramContractValidationError,
  readDiagramInput,
  sanitizedDiagramError,
} from './validate-diagram-contract.ts';

const compile = async (): Promise<void> => {
  try {
    if (process.argv.length > 2)
      throw new DiagramContractValidationError('DIAGRAM_COMPILE_ARGS_FORBIDDEN');
    const input = assertDiagramContractInput(await readDiagramInput([]));
    process.stdout.write(`${JSON.stringify(input.diagram)}\n`);
  } catch (error) {
    process.stderr.write(
      `${JSON.stringify({schema_version: 'diagram-contract-compile-result-v1', status: 'BLOCKED', error_code: sanitizedDiagramError(error)})}\n`,
    );
    process.exitCode = 2;
  }
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await compile();
