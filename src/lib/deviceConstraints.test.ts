import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { canPrecompute } from './deviceConstraints';

describe('deviceConstraints', () => {
  describe('canPrecompute', () => {
    // Store original values to restore after each test
    const originalMemory = Object.getOwnPropertyDescriptor(performance, 'memory');
    const originalConnection = Object.getOwnPropertyDescriptor(navigator, 'connection');
    const originalHardwareConcurrency = Object.getOwnPropertyDescriptor(navigator, 'hardwareConcurrency');
    const originalGetBattery = Object.getOwnPropertyDescriptor(navigator, 'getBattery');

    beforeEach(() => {
      vi.clearAllMocks();
    });

    afterEach(() => {
      // Restore original values or delete properties after each test
      if (originalMemory) {
        Object.defineProperty(performance, 'memory', originalMemory);
      } else {
        delete (performance as any).memory;
      }

      if (originalConnection) {
        Object.defineProperty(navigator, 'connection', originalConnection);
      } else {
        delete (navigator as any).connection;
      }

      if (originalHardwareConcurrency) {
        Object.defineProperty(navigator, 'hardwareConcurrency', originalHardwareConcurrency);
      } else {
        delete (navigator as any).hardwareConcurrency;
      }

      if (originalGetBattery) {
        Object.defineProperty(navigator, 'getBattery', originalGetBattery);
      } else {
        delete (navigator as any).getBattery;
      }
    });

    it('should return true when all constraints are met', async () => {
      // Mock optimal conditions
      Object.defineProperty(performance, 'memory', {
        configurable: true,
        value: {
          usedJSHeapSize: 50_000_000, // 50 MB
          jsHeapSizeLimit: 100_000_000, // 100 MB (50% usage)
        },
      });

      Object.defineProperty(navigator, 'hardwareConcurrency', {
        configurable: true,
        value: 8,
      });

      Object.defineProperty(navigator, 'connection', {
        configurable: true,
        value: {
          saveData: false,
          effectiveType: '4g',
        },
      });

      const result = await canPrecompute();
      expect(result).toBe(true);
    });

    it('should return false when memory usage exceeds 90%', async () => {
      Object.defineProperty(performance, 'memory', {
        configurable: true,
        value: {
          usedJSHeapSize: 95_000_000, // 95 MB
          jsHeapSizeLimit: 100_000_000, // 100 MB (95% usage)
        },
      });

      Object.defineProperty(navigator, 'hardwareConcurrency', {
        configurable: true,
        value: 8,
      });

      const result = await canPrecompute();
      expect(result).toBe(false);
    });

    it('should return false when data saver mode is enabled', async () => {
      Object.defineProperty(performance, 'memory', {
        configurable: true,
        value: {
          usedJSHeapSize: 50_000_000,
          jsHeapSizeLimit: 100_000_000,
        },
      });

      Object.defineProperty(navigator, 'connection', {
        configurable: true,
        value: {
          saveData: true,
          effectiveType: '4g',
        },
      });

      Object.defineProperty(navigator, 'hardwareConcurrency', {
        configurable: true,
        value: 8,
      });

      const result = await canPrecompute();
      expect(result).toBe(false);
    });

    it('should return false on slow-2g connection', async () => {
      Object.defineProperty(performance, 'memory', {
        configurable: true,
        value: {
          usedJSHeapSize: 50_000_000,
          jsHeapSizeLimit: 100_000_000,
        },
      });

      Object.defineProperty(navigator, 'connection', {
        configurable: true,
        value: {
          saveData: false,
          effectiveType: 'slow-2g',
        },
      });

      Object.defineProperty(navigator, 'hardwareConcurrency', {
        configurable: true,
        value: 8,
      });

      const result = await canPrecompute();
      expect(result).toBe(false);
    });

    it('should return false when CPU cores are less than 4', async () => {
      Object.defineProperty(performance, 'memory', {
        configurable: true,
        value: {
          usedJSHeapSize: 50_000_000,
          jsHeapSizeLimit: 100_000_000,
        },
      });

      Object.defineProperty(navigator, 'hardwareConcurrency', {
        configurable: true,
        value: 2,
      });

      const result = await canPrecompute();
      expect(result).toBe(false);
    });

    it('should return false when battery is low and not charging', async () => {
      Object.defineProperty(performance, 'memory', {
        configurable: true,
        value: {
          usedJSHeapSize: 50_000_000,
          jsHeapSizeLimit: 100_000_000,
        },
      });

      Object.defineProperty(navigator, 'hardwareConcurrency', {
        configurable: true,
        value: 8,
      });

      Object.defineProperty(navigator, 'getBattery', {
        configurable: true,
        value: () =>
          Promise.resolve({
            charging: false,
            level: 0.15, // 15% battery
          }),
      });

      const result = await canPrecompute();
      expect(result).toBe(false);
    });

    it('should return true when battery is low but charging', async () => {
      Object.defineProperty(performance, 'memory', {
        configurable: true,
        value: {
          usedJSHeapSize: 50_000_000,
          jsHeapSizeLimit: 100_000_000,
        },
      });

      Object.defineProperty(navigator, 'hardwareConcurrency', {
        configurable: true,
        value: 8,
      });

      Object.defineProperty(navigator, 'getBattery', {
        configurable: true,
        value: () =>
          Promise.resolve({
            charging: true,
            level: 0.15, // 15% battery but charging
          }),
      });

      const result = await canPrecompute();
      expect(result).toBe(true);
    });

    it('should return true when battery API is unavailable', async () => {
      Object.defineProperty(performance, 'memory', {
        configurable: true,
        value: {
          usedJSHeapSize: 50_000_000,
          jsHeapSizeLimit: 100_000_000,
        },
      });

      Object.defineProperty(navigator, 'hardwareConcurrency', {
        configurable: true,
        value: 8,
      });

      // No getBattery available
      Object.defineProperty(navigator, 'getBattery', {
        configurable: true,
        value: undefined,
      });

      const result = await canPrecompute();
      expect(result).toBe(true);
    });

    it('should return true and not throw when memory API is unavailable', async () => {
      Object.defineProperty(performance, 'memory', {
        configurable: true,
        value: undefined,
      });

      Object.defineProperty(navigator, 'hardwareConcurrency', {
        configurable: true,
        value: 8,
      });

      const result = await canPrecompute();
      expect(result).toBe(true);
    });

    it('should fail-open (return true) when errors occur', async () => {
      // Simulate an error by making hardwareConcurrency throw
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        configurable: true,
        get() {
          throw new Error('Test error');
        },
      });

      const result = await canPrecompute();
      expect(result).toBe(true); // Fail-open for compatibility
    });
  });
});
