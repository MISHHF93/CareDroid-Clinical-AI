import js from '@eslint/js';
import react from 'eslint-plugin-react';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import type { Linter } from 'eslint';

const reactRecommended = react.configs.flat.recommended as Linter.Config;
const jsxA11yRecommended = jsxA11y.flatConfigs.recommended as Linter.Config;

const vitestAndLegacyJestGlobals = Object.fromEntries(
  ['describe', 'it', 'test', 'expect', 'vi', 'beforeEach', 'afterEach', 'beforeAll', 'afterAll', 'jest'].map(
    (name) => [name, 'readonly' as const],
  ),
);

const config: Linter.Config[] = [
  {
    linterOptions: { reportUnusedDisableDirectives: 'error' },
  },
  {
    ignores: [
      'dist/**',
      'backend/**',
      'node_modules/**',
      'android/**',
      'coverage/**',
      '.venv/**',
      'agent-tools/**',
      '**/tool-results/**',
      '**/scratchpad/**',
      'artifact-*.html',
      'caredroid-scorecard*.html',
      'qa/**',
      '.claude/**',
    ],
  },
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
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-ignore': true,
          'ts-nocheck': true,
          'ts-check': false,
          'ts-expect-error': 'allow-with-description',
          minimumDescriptionLength: 10,
        },
      ],
    },
  },
  {
    files: ['src/**/*.{js,jsx,ts,tsx}'],
    plugins: { ...reactRecommended.plugins, ...jsxA11yRecommended.plugins },
    languageOptions: {
      ...(reactRecommended.languageOptions ?? {}),
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      ...(reactRecommended.rules ?? {}),
      ...(jsxA11yRecommended.rules ?? {}),
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
    // This block's own broader glob (src/**/*.{js,jsx,ts,tsx}, above) re-enables
    // the plain `no-unused-vars` for .ts/.tsx too, silently undoing the .ts/.tsx-
    // only block's deliberate `'no-unused-vars': 'off'` (it's meant to be replaced
    // by the TS-aware version below, not left off entirely) -- the plain rule
    // doesn't understand TypeScript interface/type method signatures and flags
    // every descriptive parameter name in them as "unused" (hundreds of false
    // positives, e.g. every method in emergencyStore.ts's store interface).
    files: ['src/**/*.{ts,tsx}'],
    plugins: { '@typescript-eslint': tseslint.plugin },
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['src/**/*.test.{js,jsx,ts,tsx}', 'src/test/**/*.{js,ts}'],
    languageOptions: {
      globals: { ...globals.browser, ...vitestAndLegacyJestGlobals },
    },
  },
  {
    files: ['**/*.{js,jsx,mjs,cjs,ts,tsx}'],
    rules: { 'no-redeclare': 'off' },
  },
];

export default config;
