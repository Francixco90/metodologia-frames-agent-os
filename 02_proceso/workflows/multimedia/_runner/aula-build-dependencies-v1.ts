import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {hashExperienceValue} from '../../../core/contracts/index.ts';
import {
  assertContainedInputFileV1,
  assertContainedWorkspaceV1,
} from '../../core/safe-local-path-v1.ts';
import {
  AulaBuildPlanV1Schema,
  aulaBuildBindingV1,
  type AulaBuildBindingV1,
} from '../_schema/aula-dependencies-v1.ts';

import {assertAulaEngineAuthorityV1} from './aula-engine-authority-v1.ts';

export const aulaEngineRefV1 = '03_artefactos/renderers/frames-aula';
const hash = (file: string) => createHash('sha256').update(readFileSync(file)).digest('hex');
export function aulaDependencyInputsV1(
  root: string,
  binding: AulaBuildBindingV1,
  inputRef?: string,
) {
  const inputs = (binding.buildDependencies ?? []).map((dep) => {
    const bank = dep.ref.startsWith('bank/');
    if (bank && !binding.bankRef) throw new Error('AULA_BANK_REQUIRED');
    const linked = dep.role === 'linked-piece' && dep.ref.startsWith('input/');
    if (linked && !inputRef) throw new Error('AULA_LINKED_INPUT_REQUIRED');
    if (!bank && !linked && !dep.ref.startsWith('assets/core/'))
      throw new Error('AULA_DEPENDENCY_REF_INVALID');
    if (binding.bankRef) assertContainedWorkspaceV1(root, binding.bankRef);
    const ref = bank
      ? `${binding.bankRef}/${dep.ref.slice(5)}`
      : linked
        ? `${dirname(inputRef!)}/${dep.ref.slice(6)}`
        : `${aulaEngineRefV1}/${dep.ref}`;
    const path = assertContainedInputFileV1(root, ref);
    if (hash(path) !== dep.sha256) throw new Error(`AULA_BUILD_DEPENDENCY_STALE: ${dep.ref}`);
    return {ref, sha256: dep.sha256};
  });
  if (binding.bankRef && inputs.some((dep) => dep.ref.startsWith(`${binding.bankRef}/`))) {
    for (const name of ['manifest.json', 'catalog.json'])
      if (!binding.buildDependencies?.some((dep) => dep.ref === `bank/${name}`))
        throw new Error('AULA_BANK_BINDING_INCOMPLETE');
  }
  return inputs;
}
export function planAulaBuildV1(input: {
  root: string;
  kind: string;
  edition: string;
  inputRef: string;
  outputDirectoryRef: string;
  bankRef?: string | undefined;
}) {
  if (input.bankRef) assertContainedWorkspaceV1(input.root, input.bankRef);
  const args = [
    '--kind',
    input.kind,
    '--edition',
    input.edition,
    '--input',
    assertContainedInputFileV1(input.root, input.inputRef),
    '--out',
    resolve(input.root, input.outputDirectoryRef),
    ...(input.bankRef ? ['--bank', assertContainedWorkspaceV1(input.root, input.bankRef)] : []),
  ];
  const runtime = assertContainedInputFileV1(input.root, `${aulaEngineRefV1}/runtime.py`);
  const options = {
    encoding: 'utf8' as const,
    timeout: 60_000,
    env: {...process.env, PYTHONDONTWRITEBYTECODE: '1'},
  };
  const authority = assertAulaEngineAuthorityV1(input.root);
  execFileSync('python3', [runtime, 'check', ...args], options);
  const plan = AulaBuildPlanV1Schema.parse(
    JSON.parse(execFileSync('python3', [runtime, 'plan', ...args], options)) as unknown,
  );
  const binding = aulaBuildBindingV1(plan, input.bankRef);
  if (binding.profile && binding.profile.id !== input.edition)
    throw new Error('AULA_PROFILE_EDITION_MISMATCH');
  const dependencies = aulaDependencyInputsV1(input.root, binding, input.inputRef);
  for (const dep of dependencies.filter((item) => item.ref.startsWith(`${aulaEngineRefV1}/`)))
    if (!authority.engineRefs.some((item) => item.ref === dep.ref && item.sha256 === dep.sha256))
      throw new Error('AULA_ENGINE_DEPENDENCY_NOT_AUTHORIZED');
  return {plan, binding, dependencies, runtime, args, options};
}
export function assertApprovedAulaBuildV1(
  spec: {buildBinding?: AulaBuildBindingV1 | undefined},
  binding: AulaBuildBindingV1,
) {
  if (hashExperienceValue(spec.buildBinding ?? {}) !== hashExperienceValue(binding))
    throw new Error('AULA_SPEC_DEPENDENCIES_STALE');
}
