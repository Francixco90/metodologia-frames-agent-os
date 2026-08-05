import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'eslint.config.js',
      '**/*.mjs',
      'node_modules/**',
      'dist/**',
      'coverage/**',
      'work/private/**',
      '03_artefactos/work/private/**',
      'tmp/**',
      'projects/**/web/dist/**',
      '03_artefactos/projects/**/web/dist/**',
      'projects/**/remotion/renders/**',
      '03_artefactos/projects/**/remotion/renders/**',
      'skills/**',
      '03_artefactos/skills/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      'no-console': ['error', {allow: ['info', 'warn', 'error']}],
    },
  },
);
