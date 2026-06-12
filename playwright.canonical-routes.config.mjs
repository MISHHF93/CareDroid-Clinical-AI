import baseConfig from './playwright.config.mjs';

export default {
  ...baseConfig,
  testMatch: 'canonical-route-verification.spec.mjs',
  projects: baseConfig.projects.map((project) => ({
    ...project,
    testMatch: 'canonical-route-verification.spec.mjs',
  })),
  reporter: [
    ['list'],
    ['json', { outputFile: 'qa/playwright-canonical-routes-report.json' }],
  ],
  retries: 0,
  workers: 1,
};
