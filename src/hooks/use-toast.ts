// Lightweight toast facade to unify imports across app and tests
// We primarily use `sonner` in the app; this wrapper keeps imports consistent
// and provides a stable surface for tests to mock.

import { toast as sonnerToast } from 'sonner';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info' | 'default';

export interface ToastOptions {
  description?: string;
  duration?: number;
  action?: { label: string; onClick: () => void };
}

type ToastInput = string | { title: string; description?: string };

const baseToast = (input: ToastInput, options?: ToastOptions) => {
  if (typeof input === 'string') {
    return sonnerToast(input, options as any);
  }
  const { title, description } = input || ({} as any);
  return (
    (sonnerToast as any).message?.(title, { description, ...(options as any) }) ??
    sonnerToast(`${title}${description ? ` — ${description}` : ''}`, options as any)
  );
};

export const toast = Object.assign(baseToast, {
  success: (message: string, options?: ToastOptions) =>
    sonnerToast.success(message, options as any),
  error: (message: string, options?: ToastOptions) => sonnerToast.error(message, options as any),
  warning: (message: string, options?: ToastOptions) =>
    (sonnerToast as any).warning?.(message, options as any) ?? sonnerToast(message, options as any),
  info: (message: string, options?: ToastOptions) =>
    (sonnerToast as any).message?.(message, options as any) ?? sonnerToast(message, options as any),
  dismiss: (id?: string | number) => sonnerToast.dismiss?.(id as any),
});

export function useToast() {
  return { toast };
}

export default toast;
