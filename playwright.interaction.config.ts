import baseConfig from './playwright.config';

export default {
  ...baseConfig,
  testMatch: 'interaction-execution.spec.mjs',
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
