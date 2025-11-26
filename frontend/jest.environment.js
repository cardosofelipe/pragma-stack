/**
 * Custom Jest environment that suppresses jsdom VirtualConsole XMLHttpRequest errors
 *
 * These errors occur when jsdom tries to make network requests during tests
 * (e.g., XMLHttpRequest to localhost:8000) and they fail. They're harmless
 * noise that clutters test output.
 */

// This file is executed by Jest in a CommonJS context; using require() here is intentional.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const JSDOMEnvironment = require('jest-environment-jsdom').default;

class CustomJSDOMEnvironment extends JSDOMEnvironment {
  constructor(config, context) {
    // Customize virtualConsole options to suppress specific errors
    const customConfig = {
      ...config,
      projectConfig: {
        ...config.projectConfig,
        testEnvironmentOptions: {
          ...config.projectConfig?.testEnvironmentOptions,
          // Custom error handling via virtualConsole.sendTo
        },
      },
    };

    super(customConfig, context);
  }

  async setup() {
    await super.setup();

    // After setup, intercept console.error to filter XMLHttpRequest noise
    // This is called by jsdom's VirtualConsole when errors occur
    const originalConsoleError = this.global.console.error;
    this.global.console.error = (...args) => {
      const message = args[0]?.toString() || '';
      const errorType = args[0]?.type || '';

      // Filter out XMLHttpRequest/AggregateError noise from jsdom
      if (
        message.includes('AggregateError') ||
        message.includes('XMLHttpRequest') ||
        errorType === 'XMLHttpRequest'
      ) {
        return;
      }

      originalConsoleError.apply(this.global.console, args);
    };
  }
}

module.exports = CustomJSDOMEnvironment;
