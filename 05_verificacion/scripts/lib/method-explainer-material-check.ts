import {mkdirSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, resolve} from 'node:path';

import {
  METHOD_EXPLAINER_OUTPUT_REFS,
  assertMethodExplainerMaterialBundle,
} from '../../../02_proceso/workflows/video-os/index.ts';
import {makeMethodExplainerFixture} from './method-explainer-contract-fixture.ts';

type Check = (condition: boolean, message: string) => void;

export const checkMethodExplainerMaterial = async (check: Check, errors: string[]) => {
  const materialRoot = mkdtempSync(resolve(tmpdir(), 'video-os-method-smoke-'));
  try {
    const fixture = makeMethodExplainerFixture();
    const build = fixture.bundle.build_manifest;
    const write = (ref: string, bytes: string): void => {
      const path = resolve(materialRoot, ref);
      mkdirSync(dirname(path), {recursive: true});
      writeFileSync(path, bytes);
    };
    write(fixture.authority.ref, 'synthetic-authority');
    write(build.assets[0]!.ref, 'synthetic-host');
    write(build.components[0]!.ref, 'synthetic-component');
    for (const output of Object.values(build.required_outputs)) {
      write(output.ref, fixture.outputs.get(output.ref) ?? `smoke:${output.ref}`);
    }
    write(METHOD_EXPLAINER_OUTPUT_REFS.unattended_run_state, fixture.unattendedRunBytes);
    for (const stage of fixture.stages) write(stage.checkpoint.ref, stage.stage);
    await assertMethodExplainerMaterialBundle(fixture.bundle, materialRoot);
    check(true, 'VIDEO-OS-METHOD-MATERIAL-001 material smoke');
  } catch (error) {
    errors.push(`VIDEO-OS-METHOD-MATERIAL-001 ${String(error)}`);
  } finally {
    rmSync(materialRoot, {recursive: true, force: true});
  }
};
