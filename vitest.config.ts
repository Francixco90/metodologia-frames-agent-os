import {defineConfig} from 'vitest/config';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));

// Mirror tsconfig.json `paths` so vitest resolves the non-relative bucket
// imports (e.g. `core/contracts/index.ts`) the same way tsc does. tsc honours
// `paths` natively; vite/vitest does not unless wired here.
const alias = (bucket: string, prefix: string) => ({
  find: new RegExp(`^${prefix}/(.*)$`),
  replacement: `${root}${bucket}/$1`,
});

export default defineConfig({
  resolve: {
    alias: [
      alias('02_proceso/core', 'core'),
      alias('02_proceso/workflows', 'workflows'),
      alias('02_proceso/committees', 'committees'),
      alias('02_proceso/agents', 'agents'),
      alias('02_proceso/governance', 'governance'),
      alias('02_proceso/types', 'types'),
      alias('03_artefactos/networks', 'networks'),
      alias('03_artefactos/renderers', 'renderers'),
      alias('03_artefactos/adapters', 'adapters'),
      alias('03_artefactos/content', 'content'),
      alias('03_artefactos/brand', 'brand'),
      alias('03_artefactos/projects', 'projects'),
      alias('03_artefactos/skills', 'skills'),
      alias('03_artefactos/work', 'work'),
      alias('04_estado/registries', 'registries'),
      alias('04_estado/receipts', 'receipts'),
      alias('04_estado/approvals', 'approvals'),
      alias('05_verificacion/scripts', 'scripts'),
      alias('05_verificacion/tests', 'tests'),
      alias('05_verificacion/quality', 'quality'),
      alias('05_verificacion/guardian', 'guardian'),
      alias('00_inbox', 'inbox'),
      alias('01_intencion/docs', 'docs'),
    ],
  },
  test: {
    environment: 'node',
    globals: true,
    testTimeout: 10_000,
    // Each project declares its own include; a root include would be merged into both.
    // The case-longform family validates real media through ffprobe/ffmpeg on every test
    // (about 2 s each in isolation); under a full parallel run it needs a media-grade
    // timeout instead of the 10 s unit budget. No test is excluded by this split.
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['05_verificacion/tests/**/*.test.ts', '05_verificacion/tests/**/*.test.tsx'],
          exclude: [
            '**/node_modules/**',
            '05_verificacion/tests/unit/video-os-case-longform-*.test.ts',
          ],
        },
      },
      {
        extends: true,
        test: {
          name: 'media',
          include: ['05_verificacion/tests/unit/video-os-case-longform-*.test.ts'],
          testTimeout: 90_000,
        },
      },
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
  },
});
