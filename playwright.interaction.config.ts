import baseConfig from './playwright.config';

export default {
  ...baseConfig,
  // Both real-interaction specs: the generic click sweep and the keyboard
  // contract for dialogs.
  testMatch: /(interaction-execution|dialog-keyboard).spec.mjs/,
  timeout: 120_000,
  workers: 1,
  retries: 0,
  reporter: [
    ['list'],
    ['json', { outputFile: 'qa/playwright-interaction-execution-report.json' }],
  ],
  projects: [
    {
      name: 'chromium-interaction',
      use: {
        ...baseConfig.projects?.[0]?.use,
        browserName: 'chromium',
      },
    },
  ],
};
