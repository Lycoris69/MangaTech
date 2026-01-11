// Jest setup file for additional configuration
import '@testing-library/jest-dom'

// Add setImmediate polyfill for Node.js compatibility
if (typeof setImmediate === 'undefined') {
  global.setImmediate = (callback: (...args: any[]) => void, ...args: any[]) => {
    return setTimeout(callback, 0, ...args) as any;
  };
}

// Mock fetch for testing
global.fetch = jest.fn(() =>
  Promise.reject(new Error('fetch is not available in test environment'))
) as jest.Mock;

// Mock cheerio for testing
jest.mock('cheerio', () => ({
  load: jest.fn(() => ({
    find: jest.fn(() => ({
      length: 0,
      each: jest.fn(),
      text: jest.fn(() => ''),
      attr: jest.fn(() => ''),
    })),
    text: jest.fn(() => ''),
    attr: jest.fn(() => ''),
  })),
}));

// Mock Electron API for testing
Object.defineProperty(window, 'electronAPI', {
  value: {
    getVersion: jest.fn().mockResolvedValue('1.0.0'),
    getPlatform: jest.fn().mockResolvedValue('test'),
  },
  writable: true,
});

// Suppress console errors during tests unless explicitly needed
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is deprecated')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});