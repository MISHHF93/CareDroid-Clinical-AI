import js from '@eslint/js';
import react from 'eslint-plugin-react';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import type { Linter } from 'eslint';

const reactRecommended = react.configs.flat.recommended as Linter.Config;

const vitestAndLegacyJestGlobals = Object.fromEntries(
  ['describe', 'it', 'test', 'expect', 'vi', 'beforeEach', 'afterEach', 'beforeAll', 'afterAll', 'jest'].map(
    (name) => [name, 'readonly' as const],
  ),
);

const config: Linter.Config[] = [
  { ignores: ['dist/**', 'backend/**', 'node_modules/**', 'android/**', 'coverage/**', '.venv/**'] },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx,mjs,cjs,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.serviceworker,
        ...vitestAndLegacyJestGlobals,
      },
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { '@typescript-eslint': tseslint.plugin },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
    },
    rules: {
      'no-undef': 'off',
      'no-unused-vars': 'off',
    },
  },
  {
    files: ['src/**/*.{js,jsx,ts,tsx}'],
    plugins: reactRecommended.plugins,
    languageOptions: {
      ...(reactRecommended.languageOptions ?? {}),
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      ...(reactRecommended.rules ?? {}),
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react/no-unescaped-entities': 'off',
      'no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
    settings: { react: { version: 'detect' } },
  },
  {
    files: ['src/**/*.test.{js,jsx,ts,tsx}', 'src/test/**/*.{js,ts}'],
    languageOptions: {
      globals: { ...globals.browser, ...vitestAndLegacyJestGlobals },
    },
  },
  {
    files: ['**/*.{js,jsx,mjs,cjs,ts,tsx}'],
    rules: { 'no-redeclare': 'off', 'no-unused-vars': 'off' },
  },
];

export default config;
