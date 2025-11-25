// Lightweight toast facade to unify imports across app and tests
// We primarily use `sonner` in the app; this wrapper keeps imports consistent
// and provides a stable surface for tests to mock.

import { toast as sonnerToast, type ExternalToast } from 'sonner';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info' | 'default';

export interface ToastOptions {
  description?: string;
  duration?: number;
  action?: { label: string; onClick: () => void };
}

type ExtendedSonnerToast = typeof sonnerToast & {
  message?: (message: string, options?: ExternalToast) => string | number;
  warning?: (message: string, options?: ExternalToast) => string | number;
};

type ToastInput = string | { title: string; description?: string };

const baseToast = (input: ToastInput, options?: ToastOptions) => {
  if (typeof input === 'string') {
    return sonnerToast(input, options);
  }
  const { title, description } = input || { title: '', description: undefined };
  return (
    (sonnerToast as ExtendedSonnerToast).message?.(title, { description, ...options }) ??
    sonnerToast(`${title}${description ? ` — ${description}` : ''}`, options)
  );
};

export const toast = Object.assign(baseToast, {
  success: (message: string, options?: ToastOptions) => sonnerToast.success(message, options),
  error: (message: string, options?: ToastOptions) => sonnerToast.error(message, options),
  warning: (message: string, options?: ToastOptions) =>
    (sonnerToast as ExtendedSonnerToast).warning?.(message, options) ?? sonnerToast(message, options),
  info: (message: string, options?: ToastOptions) =>
    (sonnerToast as ExtendedSonnerToast).message?.(message, options) ?? sonnerToast(message, options),
  dismiss: (id?: string | number) => sonnerToast.dismiss?.(id),
});

export function useToast() {
  return { toast };
}

export default toast;
