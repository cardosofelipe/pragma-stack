// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';
import 'whatwg-fetch'; // Polyfill fetch API
import { Crypto } from '@peculiar/webcrypto';

// Mock environment variables for tests
process.env.NEXT_PUBLIC_SITE_URL = 'http://localhost:3000';
process.env.NEXT_PUBLIC_API_BASE_URL = 'http://localhost:8000';

// Polyfill TransformStream for nock/msw
if (typeof global.TransformStream === 'undefined') {
  const { TransformStream } = require('node:stream/web');
  global.TransformStream = TransformStream;
}

// Mock window object
global.window = global.window || {};

// Mock BroadcastChannel for MSW
global.BroadcastChannel = class BroadcastChannel {
  constructor(name) {
    this.name = name;
  }
  postMessage() {}
  close() {}
  addEventListener() {}
  removeEventListener() {}
};

// Mock IntersectionObserver for components that use viewport detection
global.IntersectionObserver = class IntersectionObserver {
  constructor(callback) {
    this.callback = callback;
  }
  observe() {
    // Immediately trigger the callback with isIntersecting: true for tests
    this.callback([{ isIntersecting: true }]);
  }
  unobserve() {}
  disconnect() {}
};

// Use real Web Crypto API polyfill for Node environment
const cryptoPolyfill = new Crypto();

// Store references before assignment
const subtleRef = cryptoPolyfill.subtle;
const getRandomValuesRef = cryptoPolyfill.getRandomValues.bind(cryptoPolyfill);

// Use Object.defineProperty to ensure properties aren't overridden
if (!global.crypto) {
  global.crypto = {};
}

Object.defineProperty(global.crypto, 'subtle', {
  value: subtleRef,
  writable: false,
  configurable: true,
  enumerable: true,
});

Object.defineProperty(global.crypto, 'getRandomValues', {
  value: getRandomValuesRef,
  writable: false,
  configurable: true,
  enumerable: true,
});

// Mock TextEncoder/TextDecoder if not available
if (typeof TextEncoder === 'undefined') {
  global.TextEncoder = class TextEncoder {
    encode(str) {
      const buf = Buffer.from(str, 'utf-8');
      return new Uint8Array(buf);
    }
  };
}

if (typeof TextDecoder === 'undefined') {
  global.TextDecoder = class TextDecoder {
    decode(arr) {
      return Buffer.from(arr).toString('utf-8');
    }
  };
}

// Mock localStorage (must be on global to satisfy typeof checks)
global.localStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};

// Mock sessionStorage (must be on global to satisfy typeof checks)
global.sessionStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};

// Suppress console logs during tests (unless VERBOSE=true)
const VERBOSE = process.env.VERBOSE === 'true';

if (!VERBOSE) {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
}

// Mock next-intl/server for server-side translations
jest.mock('next-intl/server', () => ({
  getTranslations: jest.fn(async ({ locale: _locale, namespace: _namespace }) => {
    return (key) => key;
  }),
  getMessages: jest.fn(async () => ({})),
}));

// Mock next-intl for all tests
jest.mock('next-intl', () => ({
  useTranslations: (namespace) => {
    // Return actual English translations for tests
    const translations = {
      auth: {
        login: {
          emailLabel: 'Email',
          emailPlaceholder: 'Enter your email',
          passwordLabel: 'Password',
          passwordPlaceholder: 'Enter your password',
          loginButton: 'Sign in',
          loginButtonLoading: 'Signing in...',
          forgotPassword: 'Forgot password?',
          noAccount: "Don't have an account?",
          registerLink: 'Sign up',
          successMessage: 'Login successful',
        },
        register: {
          firstNameLabel: 'First Name',
          firstNamePlaceholder: 'Enter your first name',
          lastNameLabel: 'Last Name',
          lastNamePlaceholder: 'Enter your last name',
          emailLabel: 'Email',
          emailPlaceholder: 'Enter your email',
          passwordLabel: 'Password',
          passwordPlaceholder: 'Enter your password',
          confirmPasswordLabel: 'Confirm Password',
          confirmPasswordPlaceholder: 'Confirm your password',
          registerButton: 'Create account',
          registerButtonLoading: 'Creating account...',
          hasAccount: 'Already have an account?',
          loginLink: 'Sign in',
          required: '*',
          firstNameRequired: 'First name is required',
          firstNameMinLength: 'First name must be at least 2 characters',
          firstNameMaxLength: 'First name must not exceed 50 characters',
          lastNameMaxLength: 'Last name must not exceed 50 characters',
          passwordRequired: 'Password is required',
          passwordMinLength: 'Password must be at least 8 characters',
          passwordNumber: 'Password must contain at least one number',
          passwordUppercase: 'Password must contain at least one uppercase letter',
          confirmPasswordRequired: 'Please confirm your password',
          passwordMismatch: 'Passwords do not match',
          unexpectedError: 'An unexpected error occurred. Please try again.',
          passwordRequirements: {
            minLength: 'At least 8 characters',
            hasNumber: 'Contains a number',
            hasUppercase: 'Contains an uppercase letter',
          },
        },
        passwordReset: {
          emailLabel: 'Email',
          emailPlaceholder: 'Enter your email',
          sendResetLinkButton: 'Send reset link',
          sendResetLinkButtonLoading: 'Sending...',
          instructions:
            'Enter your email address and we will send you a link to reset your password.',
          successMessage:
            'If an account exists with that email, you will receive a password reset link.',
          unexpectedError: 'An unexpected error occurred. Please try again.',
          backToLogin: 'Back to login',
          rememberPassword: 'Remember your password?',
        },
        passwordResetConfirm: {
          newPasswordLabel: 'New Password',
          newPasswordPlaceholder: 'Enter your new password',
          confirmPasswordLabel: 'Confirm Password',
          confirmPasswordPlaceholder: 'Confirm your new password',
          resetButton: 'Reset password',
          resetButtonLoading: 'Resetting...',
          instructions: 'Enter your new password below.',
          successMessage: 'Your password has been successfully reset.',
          backToLogin: 'Back to login',
          rememberPassword: 'Remember your password?',
          required: '*',
          newPasswordRequired: 'New password is required',
          newPasswordMinLength: 'Password must be at least 8 characters',
          newPasswordNumber: 'Password must contain at least one number',
          newPasswordUppercase: 'Password must contain at least one uppercase letter',
          confirmPasswordRequired: 'Please confirm your password',
          passwordMismatch: 'Passwords do not match',
          unexpectedError: 'An unexpected error occurred. Please try again.',
          passwordRequirements: {
            minLength: 'At least 8 characters',
            hasNumber: 'Contains a number',
            hasUppercase: 'Contains an uppercase letter',
          },
        },
      },
      settings: {
        password: {
          title: 'Change Password',
          subtitle: 'Update your password to keep your account secure',
          currentPasswordLabel: 'Current Password',
          currentPasswordPlaceholder: 'Enter your current password',
          newPasswordLabel: 'New Password',
          newPasswordPlaceholder: 'Enter your new password',
          confirmPasswordLabel: 'Confirm New Password',
          confirmPasswordPlaceholder: 'Confirm your new password',
          updateButton: 'Update password',
          updateButtonLoading: 'Updating...',
          currentPasswordRequired: 'Current password is required',
          newPasswordRequired: 'New password is required',
          newPasswordMinLength: 'Password must be at least 8 characters',
          newPasswordNumber: 'Password must contain at least one number',
          newPasswordUppercase: 'Password must contain at least one uppercase letter',
          newPasswordLowercase: 'Password must contain at least one lowercase letter',
          newPasswordSpecial: 'Password must contain at least one special character',
          confirmPasswordRequired: 'Please confirm your new password',
          passwordMismatch: 'Passwords do not match',
          unexpectedError: 'An unexpected error occurred. Please try again.',
          passwordRequirements: {
            minLength: 'At least 8 characters',
            hasNumber: 'Contains a number',
            hasUppercase: 'Contains an uppercase letter',
            hasLowercase: 'Contains a lowercase letter',
            hasSpecial: 'Contains a special character',
          },
        },
        profile: {
          title: 'Profile Settings',
          subtitle: 'Manage your personal information',
          firstNameLabel: 'First Name',
          firstNamePlaceholder: 'Enter your first name',
          lastNameLabel: 'Last Name',
          lastNamePlaceholder: 'Enter your last name',
          emailLabel: 'Email',
          emailDescription: 'Email cannot be changed. Contact support if you need to update it.',
          updateButton: 'Save changes',
          updateButtonLoading: 'Saving...',
          resetButton: 'Cancel',
          firstNameRequired: 'First name is required',
          firstNameMinLength: 'First name must be at least 2 characters',
          firstNameMaxLength: 'First name must not exceed 50 characters',
          lastNameMaxLength: 'Last name must not exceed 50 characters',
          emailInvalid: 'Please enter a valid email address',
          unexpectedError: 'An unexpected error occurred. Please try again.',
        },
      },
      navigation: {
        dashboard: 'Dashboard',
        settings: 'Settings',
        admin: 'Admin',
        logout: 'Logout',
        profile: 'Profile',
        password: 'Password',
        sessions: 'Sessions',
      },
      validation: {
        required: 'This field is required',
        email: 'Please enter a valid email address',
        minLength: 'Must be at least 8 characters',
      },
      errors: {
        validation: {
          required: 'This field is required',
          email: 'Please enter a valid email address',
          passwordWeak: 'Password must contain at least one number and one uppercase letter',
        },
      },
    };

    // Helper to get nested value from object by dot notation
    const get = (obj, path) => {
      return path.split('.').reduce((acc, part) => acc?.[part], obj);
    };

    return (key) => {
      const fullKey = namespace ? `${namespace}.${key}` : key;
      return get(translations, fullKey) || key;
    };
  },
  useLocale: () => 'en', // Default to English locale for tests
}));

// Reset storage mocks before each test
beforeEach(() => {
  // Don't use clearAllMocks - it breaks the mocks
  // Instead reset individual storage mock return values
  if (global.localStorage && typeof global.localStorage.getItem.mockReset === 'function') {
    global.localStorage.getItem.mockReset().mockReturnValue(null);
    global.localStorage.setItem.mockReset();
    global.localStorage.removeItem.mockReset();
  }
  if (global.sessionStorage && typeof global.sessionStorage.getItem.mockReset === 'function') {
    global.sessionStorage.getItem.mockReset().mockReturnValue(null);
    global.sessionStorage.setItem.mockReset();
    global.sessionStorage.removeItem.mockReset();
  }
});
