import { describe, it, expect } from 'vitest';
import React from 'react';
import { benchmarkComponentRender, calculateRenderImprovement, trainToyModel } from './performanceTester';

// Mock the LoadingSpinner for testing
const MockLoadingSpinner = ({ size = 'md', message = 'Loading...' }: any) => (
  React.createElement('div', { 
    'data-testid': 'loading-spinner',
    'data-size': size 
  }, message)
);

describe('performanceTester', () => {
  it('completes toy workload under threshold', () => {
    const { avg, timeMs } = trainToyModel(10000);
    // Basic sanity check on result and crude perf threshold
    expect(Number.isFinite(avg)).toBe(true);

    // CI threshold gate: fail if slower than 1500ms
    const THRESHOLD_MS = Number(process.env.CI_PERF_THRESHOLD_MS || 1500);
    expect(timeMs).toBeLessThan(THRESHOLD_MS);
  });

  describe('Component Render Benchmarks', () => {
    it('benchmarks LoadingSpinner render performance', async () => {
      const result = await benchmarkComponentRender(
        'LoadingSpinner',
        () => React.createElement(MockLoadingSpinner, { size: 'md', message: 'Test' }),
        { iterations: 50, timeoutMs: 3000 }
      );

      expect(result.componentName).toBe('LoadingSpinner');
      expect(result.averageRenderTime).toBeGreaterThan(0);
      expect(result.totalRenders).toBe(50);
      expect(result.minRenderTime).toBeLessThanOrEqual(result.averageRenderTime);
      expect(result.maxRenderTime).toBeGreaterThanOrEqual(result.averageRenderTime);

      // Performance threshold: average render should be under 10ms
      expect(result.averageRenderTime).toBeLessThan(10);
    });

    it('tests rerender performance with prop variations', async () => {
      const propVariations = [
        { size: 'sm', message: 'Small' },
        { size: 'lg', message: 'Large' },
        { size: 'md', message: 'Medium' }
      ];

      const result = await benchmarkComponentRender(
        'LoadingSpinner-Rerenders',
        () => React.createElement(MockLoadingSpinner, { size: 'md', message: 'Initial' }),
        { 
          iterations: 30, 
          testRerenders: true, 
          propVariations,
          timeoutMs: 3000
        }
      );

      expect(result.rerenderCount).toBe(30);
      expect(result.totalRenders).toBeGreaterThan(30); // Initial renders + rerenders
    });

    it('calculates render improvement correctly', () => {
      const before = {
        componentName: 'TestComponent',
        averageRenderTime: 10,
        minRenderTime: 8,
        maxRenderTime: 15,
        totalRenders: 100
      };

      const after = {
        componentName: 'TestComponent',
        averageRenderTime: 6,
        minRenderTime: 5,
        maxRenderTime: 9,
        totalRenders: 100
      };

      const improvement = calculateRenderImprovement(before, after);
      
      expect(improvement.avgRenderTimeReduction).toBe(4);
      expect(improvement.improvementPercentage).toBe(40);
      expect(improvement.significant).toBe(true);
    });

    it('identifies non-significant improvements', () => {
      const before = {
        componentName: 'TestComponent',
        averageRenderTime: 10,
        minRenderTime: 8,
        maxRenderTime: 15,
        totalRenders: 100
      };

      const after = {
        componentName: 'TestComponent',
        averageRenderTime: 9.5,
        minRenderTime: 8,
        maxRenderTime: 14,
        totalRenders: 100
      };

      const improvement = calculateRenderImprovement(before, after);
      
      expect(improvement.improvementPercentage).toBe(5);
      expect(improvement.significant).toBe(false);
    });
  });
});
