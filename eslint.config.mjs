import path from 'node:path';
import { fileURLToPath } from 'node:url';

import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import nextPlugin from '@next/eslint-plugin-next';
import prettierPlugin from 'eslint-plugin-prettier';
import eslintConfigPrettier from 'eslint-config-prettier';

const tsconfigRootDir = path.dirname(fileURLToPath(import.meta.url));

const typeAwareConfigs = tseslint.configs.strictTypeChecked.map(config => ({
  ...config,
  files: ['**/*.{ts,tsx}'],
  languageOptions: {
    ...config.languageOptions,
    parserOptions: {
      ...config.languageOptions?.parserOptions,
      projectService: true,
      tsconfigRootDir,
    },
  },
}));

export default tseslint.config(
  {
    ignores: ['.next/**', 'node_modules/**'],
  },
  js.configs.recommended,
  ...typeAwareConfigs,
  {
    ...nextPlugin.configs['flat/core-web-vitals'],
    files: ['src/**/*.{js,jsx,ts,tsx}'],
  },
  {
    ...eslintConfigPrettier,
  },
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      'prettier/prettier': [
        'error',
        {
          semi: true, // 确保与 .prettierrc 的 semi 配置一致
          singleQuote: true,
          tabWidth: 2,
          printWidth: 100,
          trailingComma: 'all',
          arrowParens: 'avoid',
          bracketSpacing: true,
          endOfLine: 'lf', // 确保行尾符一致
        },
      ],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-restricted-imports': [
        'error',
        {
          name: 'lodash',
          message: 'Import from lodash-es or specific lodash modules to keep bundles small.',
        },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/explicit-function-return-type': [
        'warn',
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
        },
      ],
    },
  },
);
