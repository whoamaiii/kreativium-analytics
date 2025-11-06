/**
 * JSDOM and browser API shims to reduce animation/portal noise in tests
 */
import { vi } from 'vitest';

// Prefer reduced motion in tests to minimize animations/transitions
if (!('matchMedia' in window)) {
  // @ts-expect-error jsdom shim
  window.matchMedia = (query: string) => {
    const listeners = new Set<(e: MediaQueryListEvent) => void>();
    const mql: MediaQueryList = {
      media: query,
      matches: /prefers-reduced-motion:\s*reduce/i.test(query),
      onchange: null,
      addListener: (cb: (e: MediaQueryListEvent) => void) => listeners.add(cb), // deprecated
      removeListener: (cb: (e: MediaQueryListEvent) => void) => listeners.delete(cb), // deprecated
      addEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => listeners.add(cb),
      removeEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => listeners.delete(cb),
      dispatchEvent: (ev: Event) => {
        listeners.forEach((cb) => cb(ev as MediaQueryListEvent));
        return true;
      },
    } as any;
    return mql;
  };
}

// requestAnimationFrame polyfill to run timers immediately
if (!('requestAnimationFrame' in window)) {
  // @ts-expect-error jsdom shim
  window.requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(() => cb(Date.now()), 0) as unknown as number;
  // @ts-expect-error jsdom shim
  window.cancelAnimationFrame = (id: number) => clearTimeout(id as unknown as any);
}

// Canvas/WebGL mocks for libraries like three.js and echarts
if (!(globalThis as any).HTMLCanvasElement) {
  (globalThis as any).HTMLCanvasElement = class {} as any;
}

if (!(HTMLCanvasElement.prototype as any).getContext) {
  // @ts-expect-error test shim
  HTMLCanvasElement.prototype.getContext = vi.fn((type: string) => {
    if (type === '2d') {
      return {
        fillRect: vi.fn(),
        clearRect: vi.fn(),
        getImageData: vi.fn(() => ({ data: new Uint8ClampedArray() })),
        putImageData: vi.fn(),
        createImageData: vi.fn(() => ([] as unknown) as ImageData),
        setTransform: vi.fn(),
        drawImage: vi.fn(),
        save: vi.fn(),
        fillText: vi.fn(),
        restore: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        closePath: vi.fn(),
        stroke: vi.fn(),
        translate: vi.fn(),
        scale: vi.fn(),
        rotate: vi.fn(),
        arc: vi.fn(),
        fill: vi.fn(),
        measureText: vi.fn(() => ({ width: 0 })),
        transform: vi.fn(),
        rect: vi.fn(),
        clip: vi.fn(),
      } as unknown as CanvasRenderingContext2D;
    }
    // Return a minimal WebGL-like object when asked for webgl/webgl2
    if (type === 'webgl' || type === 'experimental-webgl' || type === 'webgl2') {
      return {
        getExtension: vi.fn(),
        createShader: vi.fn(),
        shaderSource: vi.fn(),
        compileShader: vi.fn(),
        createProgram: vi.fn(),
        attachShader: vi.fn(),
        linkProgram: vi.fn(),
        useProgram: vi.fn(),
        getShaderParameter: vi.fn(),
        getProgramParameter: vi.fn(),
        getShaderInfoLog: vi.fn(),
        getProgramInfoLog: vi.fn(),
        clearColor: vi.fn(),
        clear: vi.fn(),
        drawArrays: vi.fn(),
        viewport: vi.fn(),
      } as unknown as WebGLRenderingContext;
    }
    return null;
  });
}

// ResizeObserver mock
if (!(globalThis as any).ResizeObserver) {
  (globalThis as any).ResizeObserver = class {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  };
}

// IntersectionObserver mock
if (!(globalThis as any).IntersectionObserver) {
  (globalThis as any).IntersectionObserver = class {
    constructor(_cb: any, _opts?: any) {}
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
    takeRecords = vi.fn(() => []);
    root = null;
    rootMargin = '0px';
    thresholds = [0];
  };
}
