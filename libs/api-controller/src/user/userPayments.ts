import {useSubscriberPaymentQuery} from '@smarty-app/api';
import {ApiError, mapPaymentDtoToPayment, Payment} from '@smarty-app/core';
import {useMemo} from 'react';

/**
 * The result of {@link useGetUserPayments}, exposing the subscriber's paginated
 * payment history together with loading, error and pagination controls.
 */
export interface PaymentsApiResult {
  /** All payments loaded so far, mapped to the app domain model. */
  payments: Payment[];
  /** True while the first page is being fetched. */
  isLoading: boolean;
  /** True while a subsequent page is being fetched (load more). */
  isLoadingMore: boolean;
  /** True when the query has succeeded. */
  isSuccess: boolean;
  /** True when the query has failed. */
  isError: boolean;
  /** The error from the last failed request, if any. */
  error?: ApiError | null;
  /** True when there are more pages to load. */
  hasNextPage: boolean;
  /** Loads the next page of payments. */
  fetchNextPage: () => void;
  /** Reloads the payment history from the first page. */
  refetch: () => void;
}

/**
 * A hook to fetch paginated payment history for the current subscriber.
 *
 * Combines the pages returned by {@link useSubscriberPaymentQuery} into a
 * single flat list of {@link Payment} models, and exposes pagination and
 * refresh controls for the UI layer.
 *
 * @returns A {@link PaymentsApiResult} containing the payments and controls.
 */
export function useGetUserPayments(): PaymentsApiResult {
  const query = useSubscriberPaymentQuery();

  const payments = useMemo(() => {
    if (!query.data) {
      return [];
    }
    return query.data.pages.flatMap((page) =>
      page.map((dto) => mapPaymentDtoToPayment(dto)),
    );
  }, [query.data]);

  const isLoading = query.isFetching && !query.data;
  const isLoadingMore = query.isFetching && !!query.data;

  return {
    payments,
    isLoading,
    isLoadingMore,
    isSuccess: query.isSuccess,
    isError: query.isError,
    error: query.error,
    hasNextPage: query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
    refetch: query.refetch,
  };
}
