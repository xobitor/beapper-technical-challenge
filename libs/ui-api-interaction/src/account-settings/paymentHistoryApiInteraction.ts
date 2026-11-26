import {useGetUserPayments} from '@smarty-app/api-controller';
import {ApiError, Payment} from '@smarty-app/core';
import {en} from '@smarty-app/language';
import {useApiErrorStateStore} from '@smarty-app/ui-state';
import {useCallback, useEffect} from 'react';

/**
 * The result of {@link usePaymentHistoryApiInteraction}, exposing the
 * subscriber's payment history together with pagination, refresh and error
 * handling controls.
 */
export interface PaymentHistoryApiInteraction {
  /** All payments loaded so far, mapped to the app domain model. */
  payments: Payment[];
  /** True while the first page is being fetched. */
  isLoading: boolean;
  /** True while a subsequent page is being fetched (load more). */
  isLoadingMore: boolean;
  /** True when there are more pages to load. */
  hasNextPage: boolean;
  /** True when the last request failed. */
  isError: boolean;
  /** The error from the last failed request, if any. */
  error?: Error | null;
  /** True while a refresh is in flight. */
  refreshing: boolean;
  /** Reloads the payment history from the first page. */
  onRefresh: () => void;
  /** Retries the last failed request. */
  onRetry: () => void;
  /** Loads the next page of payments. */
  loadMore: () => void;
}

/**
 * Hook to manage payment history state: pagination, refresh, retry and errors.
 *
 * Owns {@link useGetUserPayments}; on error writes to the API error state
 * store following the same pattern as the change email flow.
 * - `onRefresh` → `refetch()` (reloads from page 0)
 * - `onRetry` → `refetch()` (retries the failed request)
 * - `loadMore` → `fetchNextPage()` (guarded by `hasNextPage && !isLoadingMore`)
 *
 * @returns A {@link PaymentHistoryApiInteraction} object.
 */
export function usePaymentHistoryApiInteraction(): PaymentHistoryApiInteraction {
  const {
    payments,
    isLoading,
    isLoadingMore,
    hasNextPage,
    isError,
    error,
    fetchNextPage,
    refetch,
  } = useGetUserPayments();

  const {setErrorText, reset} = useApiErrorStateStore(
    (state) => ({
      setErrorText: state.setErrorText,
      reset: state.reset,
    }),
    true,
  );

  const refreshing = isLoading && isLoadingMore === false;

  useErrorHandler(isError, error, setErrorText, reset);

  const onRefresh = useCallback(() => {
    reset();
    refetch();
  }, [refetch, reset]);

  const onRetry = useCallback(() => {
    reset();
    refetch();
  }, [refetch, reset]);

  const loadMore = useCallback(() => {
    fetchNextPage();
  }, [fetchNextPage]);

  return {
    payments,
    isLoading,
    isLoadingMore,
    hasNextPage,
    isError,
    error,
    refreshing,
    onRefresh,
    onRetry,
    loadMore,
  };
}

/**
 * Keeps the API error state store in sync with the query error state.
 *
 * @param isError - Whether the last request failed.
 * @param error - The error from the last failed request, if any.
 * @param setErrorText - Store action to set the error text.
 * @param reset - Store action to reset the error state.
 */
function useErrorHandler(
  isError: boolean,
  error: ApiError | null | undefined,
  setErrorText: (errorText: string) => void,
  reset: () => void,
): void {
  useEffect(() => {
    if (isError && error) {
      setErrorText(error.message ?? en.error);
    } else if (!isError) {
      reset();
    }
  }, [isError, error, reset, setErrorText]);
}
