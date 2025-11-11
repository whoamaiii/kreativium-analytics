// Centralized Radix UI mocks to reduce act(...) warnings in jsdom
import { vi } from 'vitest';

// Render portal children inline in tests
vi.mock('@radix-ui/react-portal', async () => {
  const React = await import('react');
  const passThrough = ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children);
  return {
    __esModule: true,
    Root: passThrough,
    Portal: passThrough,
    default: passThrough,
  };
});

// Presence: render children immediately without mount/unmount animations
vi.mock('@radix-ui/react-presence', async () => {
  const React = await import('react');
  const passThrough = ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children);
  return {
    __esModule: true,
    Presence: passThrough,
    Root: passThrough,
    default: passThrough,
  };
});
