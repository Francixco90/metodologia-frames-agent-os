// Root-level versioned controls classified as code or build infrastructure. [CONFIG]
export const rootCodePaths = new Set([
  '.gitignore',
  '.npmrc',
  '.nvmrc',
  '.prettierrc.json',
  'eslint.config.js',
  'package.json',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'tsconfig.json',
  'vitest.config.ts',
]);
