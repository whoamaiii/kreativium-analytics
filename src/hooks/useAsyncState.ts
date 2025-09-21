import { useCallback, useEffect, useRef, useState } from 'react';
import { handleError } from '@/lib/errorHandler';
import { SensoryCompassError, ErrorType } from '@/types/errors';

export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';

interface InternalAsyncState<TValue> {
  status: AsyncStatus;
  data: TValue | null;
  error: Error | null;
}

export interface UseAsyncStateOptions<TValue> {
  autoResetMs?: number;
  onSuccess?: (value: TValue) => void;
  onError?: (error: Error) => void;
  retryCount?: number;
  retryDelay?: number;
  showErrorToast?: boolean;
}

export interface UseAsyncStateResult<TValue> {
  status: AsyncStatus;
  data: TValue | null;
  error: Error | null;
  isIdle: boolean;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  state: {
    status: AsyncStatus;
    data: TValue | null;
    error: Error | null;
    isIdle: boolean;
    isLoading: boolean;
    isSuccess: boolean;
    isError: boolean;
  };
  execute: <TReturn = TValue>(fn: () => Promise<TReturn>) => Promise<TReturn>;
  run: <TReturn = TValue>(fn: () => Promise<TReturn>) => Promise<TReturn>;
  reset: () => void;
  setData: (value: TValue | null) => void;
  setError: (error: Error | null) => void;
}

export function useAsyncState<TValue = unknown>(
  initialData: TValue | null = null,
  options: UseAsyncStateOptions<TValue> = {}
): UseAsyncStateResult<TValue> {
  const {
    autoResetMs,
    onSuccess,
    onError,
    retryCount = 0,
    retryDelay = 1000,
    showErrorToast = true,
  } = options;

  const initialDataRef = useRef<TValue | null>(initialData);
  const [internalState, setInternalState] = useState<InternalAsyncState<TValue>>(() => ({
    status: 'idle',
    data: initialDataRef.current,
    error: null,
  }));
  const isMountedRef = useRef(true);
  const autoResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    initialDataRef.current = initialData;
  }, [initialData]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (autoResetRef.current) {
        clearTimeout(autoResetRef.current);
      }
    };
  }, []);

  const clearAutoReset = useCallback(() => {
    if (autoResetRef.current) {
      clearTimeout(autoResetRef.current);
      autoResetRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    if (!isMountedRef.current) return;
    clearAutoReset();
    setInternalState({
      status: 'idle',
      data: initialDataRef.current,
      error: null,
    });
  }, [clearAutoReset]);

  const scheduleAutoReset = useCallback(() => {
    if (!autoResetMs || autoResetMs <= 0) return;
    clearAutoReset();
    autoResetRef.current = setTimeout(() => {
      if (!isMountedRef.current) return;
      reset();
    }, autoResetMs);
  }, [autoResetMs, clearAutoReset, reset]);

  const setData = useCallback(
    (value: TValue | null) => {
      if (!isMountedRef.current) return;
      clearAutoReset();
      setInternalState({
        status: value === null ? 'idle' : 'success',
        data: value,
        error: null,
      });
    },
    [clearAutoReset]
  );

  const setError = useCallback(
    (error: Error | null) => {
      if (!isMountedRef.current) return;
      clearAutoReset();
      setInternalState(prev => ({
        status: error ? 'error' : 'idle',
        data: prev.data,
        error,
      }));
      if (!error) {
        scheduleAutoReset();
      }
    },
    [clearAutoReset, scheduleAutoReset]
  );

  const execute = useCallback(
    async <TReturn = TValue>(asyncFunction: () => Promise<TReturn>): Promise<TReturn> => {
      if (!isMountedRef.current) {
        throw new Error('Component unmounted');
      }

      clearAutoReset();
      setInternalState(prev => ({
        status: 'loading',
        data: prev.data,
        error: null,
      }));

      let attempt = 0;
      let lastError: Error | null = null;

      while (attempt <= retryCount) {
        try {
          const result = await asyncFunction();

          if (!isMountedRef.current) {
            return result;
          }

          setInternalState(prev => ({
            status: 'success',
            data: result === undefined ? prev.data : (result as unknown as TValue | null),
            error: null,
          }));

          if (result !== undefined) {
            try {
              onSuccess?.(result as unknown as TValue);
            } catch {
              // ignore callback errors
            }
          }

          scheduleAutoReset();
          return result;
        } catch (rawError) {
          const error = rawError instanceof Error ? rawError : new Error(String(rawError));
          lastError = error;
          attempt += 1;

          if (attempt <= retryCount) {
            if (retryDelay > 0) {
              await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
            }
            continue;
          }

          if (!isMountedRef.current) {
            throw error;
          }

          setInternalState(prev => ({
            status: 'error',
            data: prev.data,
            error,
          }));

          try {
            onError?.(error);
          } catch {
            // ignore callback errors
          }

          if (showErrorToast) {
            const normalized =
              error instanceof SensoryCompassError
                ? error
                : new SensoryCompassError(ErrorType.UNKNOWN_ERROR, error.message, { cause: error });
            void handleError(normalized, { showToast: true, throwError: false });
          }

          scheduleAutoReset();
          throw error;
        }
      }

      throw lastError ?? new Error('Async execution failed');
    },
    [clearAutoReset, onError, onSuccess, retryCount, retryDelay, scheduleAutoReset, showErrorToast]
  );

  const derivedState = {
    status: internalState.status,
    data: internalState.data,
    error: internalState.error,
    isIdle: internalState.status === 'idle',
    isLoading: internalState.status === 'loading',
    isSuccess: internalState.status === 'success',
    isError: internalState.status === 'error',
  } as const;

  return {
    ...derivedState,
    state: derivedState,
    execute,
    run: execute,
    reset,
    setData,
    setError,
  };
}

// Removed per plan: useAsyncMutation (unused)
/* export function useAsyncMutation<TData = unknown, TVariables = unknown>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: UseAsyncStateOptions<TData> = {}
) {
  const { run, setData, reset, setError, state, ...summary } = useAsyncState<TData>(null, options);

  const mutate = useCallback(
    async (variables: TVariables) => {
      const result = await run(() => mutationFn(variables));
      if (result !== undefined) {
        setData(result);
      }
      return result;
    },
    [mutationFn, run, setData]
  );

  return {
    ...summary,
    state,
    mutate,
    reset,
    setData,
    setError,
    run,
    execute: run,
  };
} */

// Removed per plan: useAsyncQuery (unused)
/* export function useAsyncQuery<T = unknown>(
  queryFn: () => Promise<T>,
  options: UseAsyncStateOptions<T> & { enabled?: boolean; refetchInterval?: number } = {}
) {
  const { enabled = true, refetchInterval, ...asyncOptions } = options;
  const { run, setData, reset, setError, state, ...summary } = useAsyncState<T>(null, asyncOptions);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (enabled) {
      run(queryFn).catch(() => {
        // ignore initial query errors; error state is handled by the hook
      });
    }
  }, [enabled, run, queryFn]);

  useEffect(() => {
    if (refetchInterval && enabled && summary.isSuccess) {
      intervalRef.current = setInterval(() => {
        run(queryFn).catch(() => {
          // ignore interval errors; consumers can inspect state.error
        });
      }, refetchInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [refetchInterval, enabled, summary.isSuccess, run, queryFn]);

  const refetch = useCallback(() => run(queryFn), [run, queryFn]);

  return {
    ...summary,
    state,
    refetch,
    reset,
    setData,
    setError,
    run,
    execute: run,
  };
} */
