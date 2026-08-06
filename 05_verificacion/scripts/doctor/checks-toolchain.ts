// doctor/checks-toolchain.ts — node/pnpm vs env-manifest-v1.yml (single source).
// Full toolchain drift (remotion/ffmpeg/playwright/chromium) is gate G18
// (`pnpm check:env`). Doctor checks node/pnpm only, warn-level, against the
// env manifest; falls back to package.json engines if the manifest is absent.
// [CONFIG]
import {existsSync, readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {parse} from 'yaml';

import {pnpmVersion, readPackageJson, record, ROOT} from '../doctor/types.ts';

export const checkToolchain = (): void => {
  try {
    const envManifestPath = resolve(ROOT, '04_estado/registries/env/env-manifest-v1.yml');
    let expectedNode: string | undefined;
    let expectedPnpm: string | undefined;
    let source = 'package.json engines';
    if (existsSync(envManifestPath)) {
      const parsedEnv: unknown = parse(readFileSync(envManifestPath, 'utf8'));
      if (parsedEnv !== null && typeof parsedEnv === 'object') {
        const toolchain = (parsedEnv as Record<string, unknown>).toolchain as
          Record<string, string> | undefined;
        if (toolchain !== undefined) {
          expectedNode = toolchain.node;
          expectedPnpm = toolchain.pnpm;
          source = 'env-manifest-v1.yml';
        }
      }
    }
    if (expectedNode === undefined || expectedPnpm === undefined) {
      const pkg = readPackageJson();
      expectedNode = expectedNode ?? pkg.engines?.node;
      expectedPnpm = expectedPnpm ?? pkg.engines?.pnpm;
    }
    const issues: string[] = [];
    if (expectedNode !== undefined && process.version !== `v${expectedNode}`) {
      issues.push(`node esperado v${expectedNode}, observado ${process.version}`);
    }
    if (expectedPnpm !== undefined) {
      const observedPnpm = pnpmVersion();
      if (observedPnpm !== expectedPnpm) {
        issues.push(`pnpm esperado ${expectedPnpm}, observado ${observedPnpm}`);
      }
    }
    if (issues.length > 0) {
      record('toolchain', 'fail', `${source}: ${issues.join('; ')}`);
    } else {
      record(
        'toolchain',
        'pass',
        `node ${process.version}, pnpm ${expectedPnpm ?? '?'} (${source})`,
      );
    }
  } catch (err) {
    record('toolchain', 'fail', `no se pudo verificar: ${(err as Error).message}`);
  }
};
