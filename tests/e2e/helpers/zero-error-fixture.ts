import { test as baseTest, expect } from '@playwright/test';

export const test = baseTest.extend<{
  zeroError: {
    allowError: (pattern: string | RegExp) => void;
    allowFailedRequest: (pattern: string | RegExp) => void;
  };
}>({
  zeroError: [
    async ({ page }, use, testInfo) => {
      const consoleIssues: string[] = [];
      const uncaughtExceptions: string[] = [];
      const failedRequests: string[] = [];
      const allowedErrorPatterns: (string | RegExp)[] = [];
      const allowedRequestPatterns: (string | RegExp)[] = [];

      const isAllowed = (text: string, patterns: (string | RegExp)[]) => {
        return patterns.some((p) => (typeof p === 'string' ? text.includes(p) : p.test(text)));
      };

      page.on('console', (msg) => {
        const type = msg.type();
        const text = msg.text();
        if (type === 'error' || type === 'warn') {
          if (!isAllowed(text, allowedErrorPatterns)) {
            consoleIssues.push(`[console.${type}] ${text}`);
          }
        }
      });

      page.on('pageerror', (err) => {
        const text = err.message || String(err);
        const stack = err.stack || '';
        const url = page.url();
        if (!isAllowed(text, allowedErrorPatterns)) {
          uncaughtExceptions.push(`[uncaughtException @ ${url}] ${text}\n${stack}`);
        }
      });

      page.on('response', (resp) => {
        const status = resp.status();
        const url = resp.url();
        const method = resp.request().method();
        if (status >= 400) {
          const item = `${method} ${url} -> ${status}`;
          if (!isAllowed(url, allowedRequestPatterns) && !isAllowed(item, allowedRequestPatterns)) {
            failedRequests.push(item);
          }
        }
      });

      await use({
        allowError: (pattern) => allowedErrorPatterns.push(pattern),
        allowFailedRequest: (pattern) => allowedRequestPatterns.push(pattern),
      });

      const allErrors: string[] = [
        ...consoleIssues,
        ...uncaughtExceptions,
        ...failedRequests,
      ];

      if (allErrors.length > 0) {
        throw new Error(
          `ZeroError check failed in "${testInfo.title}":\n` +
            allErrors.map((e) => `  • ${e}`).join('\n')
        );
      }
    },
    { auto: true }, // Automatically enabled for all tests using this fixture
  ],
});

export { expect };
