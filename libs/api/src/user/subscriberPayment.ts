import {ApiError} from '@smarty-app/core';
import {Payment as PaymentDto} from '@smarty-app/dx-api';
import {
  InfiniteData,
  useInfiniteQuery,
  UseInfiniteQueryResult,
} from '@tanstack/react-query';
import {useCallback} from 'react';

import {useDxApi} from '../dxApiWrapper';

export const subscriberPaymentsQueryKey = ['subscriberPayments'];
export const PAYMENTS_PAGE_SIZE = 20;

/**
 * A hook that returns a function to fetch a single page of payments.
 *
 * @returns A function that, given a zero-based page index, fetches that page of payments.
 */
export function useSubscriberPaymentApiFetchFn(): (
  page: number,
) => Promise<PaymentDto[]> {
  const dxApi = useDxApi();

  return useCallback(
    async (page: number): Promise<PaymentDto[]> => {
      const response = await dxApi.subscriber.subscriberPaymentGet(
        {
          page,
          size: PAYMENTS_PAGE_SIZE,
          sort: ['paymentDate,desc'],
        },
        {format: 'json'},
      );
      return response.data;
    },
    [dxApi],
  );
}

/**
 * A hook to fetch paginated payment history for the current subscriber.
 *
 * Uses an infinite query so that load-more pagination is handled by React Query.
 * "Has more" is inferred when a page returns a full page of items; the query
 * stops when a page returns fewer than `PAYMENTS_PAGE_SIZE` items.
 *
 * @returns An infinite query result containing the payment pages.
 */
export function useSubscriberPaymentQuery(): UseInfiniteQueryResult<
  InfiniteData<PaymentDto[]>,
  ApiError
> {
  const onRequestPayments = useSubscriberPaymentApiFetchFn();

  const query = useInfiniteQuery<PaymentDto[], ApiError>({
    queryKey: subscriberPaymentsQueryKey,
    queryFn: ({pageParam = 0}) => onRequestPayments(pageParam as number),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === PAYMENTS_PAGE_SIZE ? allPages.length : undefined,
  });

  return query;
}
