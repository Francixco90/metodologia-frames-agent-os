#!/usr/bin/env node
import {readFileSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {MaterialSkillAdapterV1} from '../../02_proceso/workflows/core/material-skill-adapter-v1.ts';
import {
  assertContainedInputFileV1,
  prepareContainedDirectoryV1,
} from '../../02_proceso/workflows/core/safe-local-path-v1.ts';
import {selectAulaCapabilityV1} from '../../02_proceso/workflows/multimedia/_runner/aula-capability-v1.ts';
import {createAulaMaterialHandlerV1} from '../../02_proceso/workflows/multimedia/_runner/aula-material-handler-v1.ts';

// JSON via stdin; shell interpolation and implicit authorizations are never used.
const input = JSON.parse(readFileSync(0, 'utf8'));
const capability = selectAulaCapabilityV1(input.request, input.edition);
if (!process.argv.includes('--apply')) {
  process.stdout.write(`${JSON.stringify({capability, materialized: false}, null, 2)}\n`);
} else {
  if (!capability) throw new Error('AULA_CAPABILITY_UNRESOLVED');
  const root = process.cwd();
  const order = JSON.parse(
    readFileSync(assertContainedInputFileV1(root, input.workOrderRef), 'utf8'),
  );
  const receiptRef = `${input.outputDirectoryRef}/invocation-receipt.json`;
  if (
    !order.writeSet.includes(receiptRef) &&
    !order.writeSet.includes(`${input.outputDirectoryRef}/**`)
  ) {
    throw new Error('AULA_RECEIPT_WRITE_UNAUTHORIZED');
  }
  const handler = createAulaMaterialHandlerV1({...input, root});
  const receipt = await new MaterialSkillAdapterV1(root, {[capability.skillId]: handler}).invoke({
    invocationId: input.invocationId,
    workOrder: order,
    startedAt: input.startedAt,
    completedAt: input.completedAt,
  });
  if (receipt.status === 'PASS') {
    const directory = prepareContainedDirectoryV1(root, input.outputDirectoryRef);
    // Receipt is an explicitly declared additional write, outside the renderer output plan.
    const receiptRef = `${input.outputDirectoryRef}/invocation-receipt.json`;
    if (
      !order.writeSet.includes(receiptRef) &&
      !order.writeSet.includes(`${input.outputDirectoryRef}/**`)
    ) {
      throw new Error('AULA_RECEIPT_WRITE_UNAUTHORIZED');
    }
    writeFileSync(
      resolve(directory, 'invocation-receipt.json'),
      `${JSON.stringify(receipt, null, 2)}\n`,
    );
  }
  process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
  if (receipt.status !== 'PASS') process.exitCode = 1;
}
