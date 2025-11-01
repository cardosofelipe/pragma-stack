// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'
import 'whatwg-fetch'; // Polyfill fetch API
import { Crypto } from '@peculiar/webcrypto';

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
