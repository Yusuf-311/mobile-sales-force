/**
 * Tests for axiosClient interceptors.
 *
 * Strategy: instead of mocking the entire axios module (which causes
 * module-cache issues with vi.resetModules), we test the interceptor
 * functions directly by extracting them from the axios instance created
 * at module load time. We use a manual mock for axios.create that
 * captures the registered handler functions so we can invoke them.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Capture interceptor handlers during module evaluation
let capturedRequestHandler;
let capturedResponseFulfilled;
let capturedResponseRejected;

vi.mock('axios', () => {
  return {
    default: {
      create: vi.fn(() => ({
        interceptors: {
          request: {
            use: vi.fn((fn) => { capturedRequestHandler = fn; }),
          },
          response: {
            use: vi.fn((onFulfilled, onRejected) => {
              capturedResponseFulfilled = onFulfilled;
              capturedResponseRejected  = onRejected;
            }),
          },
        },
      })),
    },
  };
});

// Import AFTER mock is registered
await import('../api/axiosClient.js');

describe('axiosClient interceptors', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('request interceptor', () => {
    it('adds Authorization header when token exists in localStorage', async () => {
      localStorage.setItem('token', 'token-mr1');
      const config = { headers: {} };
      const result = capturedRequestHandler(config);
      expect(result.headers['Authorization']).toBe('Bearer token-mr1');
    });

    it('does not add Authorization header when no token in localStorage', async () => {
      const config = { headers: {} };
      const result = capturedRequestHandler(config);
      expect(result.headers['Authorization']).toBeUndefined();
    });
  });

  describe('response interceptor', () => {
    it('passes through successful responses unchanged', () => {
      const fakeResponse = { status: 200, data: { ok: true } };
      expect(capturedResponseFulfilled(fakeResponse)).toBe(fakeResponse);
    });

    it('clears localStorage and redirects to /login on 401', async () => {
      localStorage.setItem('token', 'token-mr1');
      localStorage.setItem('role', 'mr');

      // Replace window.location for the test
      delete window.location;
      window.location = { href: '' };

      const error = { response: { status: 401 } };
      await capturedResponseRejected(error).catch(() => {});

      expect(localStorage.getItem('token')).toBeNull();
      expect(window.location.href).toBe('/login');
    });

    it('re-throws non-401 errors without clearing localStorage', async () => {
      localStorage.setItem('token', 'token-mr1');
      const error = { response: { status: 500 } };
      await expect(capturedResponseRejected(error)).rejects.toEqual(error);
      expect(localStorage.getItem('token')).toBe('token-mr1');
    });
  });
});
