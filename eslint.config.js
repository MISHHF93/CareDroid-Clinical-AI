import js from '@eslint/js';
import react from 'eslint-plugin-react';
import globals from 'globals';

const reactRecommended = react.configs.flat.recommended;

const vitestAndLegacyJestGlobals = Object.fromEntries(
  [
    'describe',
    'it',
    'test',
    'expect',
    'vi',
    'beforeEach',
    'afterEach',
    'beforeAll',
    'afterAll',
    'jest',
  ].map((name) => [name, 'readonly'])
);

export default [
  { ignores: ['dist/**', 'backend/**', 'node_modules/**', 'android/**', 'coverage/**', '.venv/**'] },
  js.configs.recommended,
  {
    files: ['src/**/*.{js,jsx}'],
    plugins: reactRecommended.plugins,
    languageOptions: {
      ...reactRecommended.languageOptions,
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      ...reactRecommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react/no-unescaped-entities': 'warn',
      'no-unused-vars': 'warn',
    },
    settings: { react: { version: 'detect' } },
  },
  {
    files: ['src/**/*.test.{js,jsx}', 'src/test/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...vitestAndLegacyJestGlobals,
      },
    },
  },
];
