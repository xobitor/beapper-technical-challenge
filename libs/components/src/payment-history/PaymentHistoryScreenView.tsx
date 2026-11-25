import {SmartyFlatList} from '@smarty-app/controls';
import {SmartyPrimaryButton, SmartyText} from '@smarty-app/controls-basic';
import {en} from '@smarty-app/language';
import {usePaymentHistoryApiInteraction} from '@smarty-app/ui-api-interaction';
import {JSX, useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  RefreshControl,
  View,
  ViewProps,
} from 'react-native';

import {ApiErrorAlertPanel} from '../common/ApiErrorAlertPanel';
import {SmartyRootScreenView} from '../common/SmartyRootScreenView';
import {PaymentHistoryListItem} from '..';

const WEB = Platform.OS === 'web';

const SENTINEL_TEST_ID = 'payment-history-list-sentinel';

/** Pixels before the viewport's end at which the next page is requested on web. */
const WEB_FETCH_MARGIN = 200;

/**
 * Main view for PaymentHistoryScreen.
 *
 * Fetches and displays the subscriber's payment history with pagination,
 * refresh and full loading/empty/error/retry handling. The same component is
 * used on both web and native; only the refresh mechanism differs
 * (pull-to-refresh on native, a visible Refresh button on web).
 *
 * A manual refresh is tracked locally and shows the list skeleton on web,
 * matching the initial page load: `isManuallyRefreshing` covers the web
 * Refresh button regardless of what the hook reports, and feeding it into
 * `isLoading` makes `SmartyFlatList` swap its content for skeleton
 * placeholders.
 *
 * Pagination is platform-specific because scrolling differs:
 * - Native: scroll-position arithmetic in `onScroll` (the list is the actual
 *   scroll container), replacing `onEndReached`, which also fires from
 *   data/layout updates and chains fetches with no user interaction.
 * - Web: the page scrolls, not the list's RN scroll container, so RN scroll
 *   events never fire. A sentinel rendered after the list is observed with
 *   an `IntersectionObserver`; when it enters the viewport the next page is
 *   requested. Both paths only fire on real viewport movement, so an idle
 *   screen never triggers requests.
 *
 * @param props Element properties.
 * @returns JSX.Element
 */
export function PaymentHistoryScreenView(props: ViewProps): JSX.Element {
  const {testID = 'payment-history-screen-view', ...rest} = props;

  const {
    payments,
    isLoading,
    isLoadingMore,
    hasNextPage,
    isError,
    refreshing,
    onRefresh,
    onRetry,
    loadMore,
  } = usePaymentHistoryApiInteraction();

  const [isManuallyRefreshing, setIsManuallyRefreshing] = useState(false);
  const [isRetry, setIsRetry] = useState(false)
  const refreshInFlight = useRef(false);
  const sentinelRef = useRef<View | null>(null);
  const loadMoreRef = useRef<() => void>(() => undefined);

  const isLoadingRefresh = isLoading || refreshing || isManuallyRefreshing;

  const isEmpty = !isLoadingRefresh && !isError && payments.length === 0;

  const handleRefresh = () => {
    refreshInFlight.current = true;
    setIsManuallyRefreshing(true);
    onRefresh();
  };

  const handleRetry = () => {
    setIsRetry(true)
    onRetry()
  }

  useEffect(() => {
    if (refreshInFlight.current) {
      refreshInFlight.current = false;
      setIsManuallyRefreshing(false);
    }
  }, [payments]);

  const canLoadMore =
    hasNextPage && !isLoadingRefresh && !isLoadingMore && !isError;

  const handleLoadMore = () => {
    if (canLoadMore) {
      loadMore();
    }
  };

  useEffect(() => {
    loadMoreRef.current = handleLoadMore;
  });

  useEffect(() => {
    if (!WEB || typeof IntersectionObserver === 'undefined') {
      return undefined;
    }

    const node = document.querySelector<HTMLElement>(
      `[data-testid="${SENTINEL_TEST_ID}"]`,
    );
    if (!node) {
      return undefined;
    }

    let primed = false;
    let wasIntersecting = false;

    const observer = new IntersectionObserver(
      (entries) => {
        const isIntersecting = entries.some((entry) => entry.isIntersecting);

        if (primed && isIntersecting && !wasIntersecting) {
          loadMoreRef.current();
        }

        primed = true;
        wasIntersecting = isIntersecting;
      },
      {rootMargin: `${WEB_FETCH_MARGIN}px`},
    );
    observer.observe(node);

    return () => observer.disconnect();
  }, [isLoadingRefresh, payments]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const {contentOffset, layoutMeasurement, contentSize} = event.nativeEvent;

    if (contentOffset.y <= 0) {
      return;
    }

    const distanceFromEnd =
      contentSize.height - (contentOffset.y + layoutMeasurement.height);

    if (distanceFromEnd <= layoutMeasurement.height * 0.5) {
      handleLoadMore();
    }
  };

  return (
    <SmartyRootScreenView testID={testID} {...rest}>
      <View className="flex-row justify-between items-center smarty-mb-m">
        <SmartyText
          className="smarty-heading-xs text-foreground-primary"
          accessibilityLabel={en.paymentHistoryTitle}>
          {en.paymentHistoryTitle}
        </SmartyText>
        {WEB && !isEmpty && (
          <SmartyPrimaryButton
            testID="payment-history-refresh-button"
            onPress={handleRefresh}
            disabled={isLoadingRefresh}
            className="smarty-w-mini smarty-mr-m"
            style={{width: 70}}>
            {isLoadingRefresh ? <ActivityIndicator/> : '\u2B6E '}
          </SmartyPrimaryButton>
        )}
      </View>

      {isError && (
        <View className="smarty-gap-m">
          <ApiErrorAlertPanel />
          <SmartyPrimaryButton
            testID="payment-history-retry-button"
            onPress={handleRetry}
            className="w-full"
            disabled={isRetry}>
            {isRetry ? <ActivityIndicator /> : en.paymentHistoryRetry}
          </SmartyPrimaryButton>
        </View>
      )}

      {isEmpty && (
        <View className="smarty-gap-m justify-center items-center smarty-py-l">
          <SmartyText className="smarty-body-m text-foreground-secondary">
            {en.paymentHistoryEmpty}
          </SmartyText>
        </View>
      )}

      {!isError && !isEmpty && (
        <SmartyFlatList
          testID="payment-history-list"
          data={payments}
          renderItem={({item}) => <PaymentHistoryListItem payment={item} />}
          keyExtractor={(item, index) => `item_${index}`}
          isLoading={isLoadingRefresh}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          ListHeaderComponent={
            WEB ? undefined : (
              <View className="smarty-px-l smarty-py-s">
                <SmartyText
                  className="smarty-caption-m text-foreground-secondary"
                  accessibilityLabel={en.paymentHistoryListLabel}>
                  {en.paymentHistoryListLabel}
                </SmartyText>
              </View>
            )
          }
          ListFooterComponent={
            isLoadingMore ? (
              <View className="smarty-py-m justify-center items-center">
                <ActivityIndicator size="small" />
              </View>
            ) : WEB ? (
              <View
                testID={SENTINEL_TEST_ID}
                ref={sentinelRef}
                className="smarty-py-m"
              />
            ) : undefined
          }
          refreshControl={
            WEB ? undefined : (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                progressViewOffset={56}
              />
            )
          }
        />
      )}
    </SmartyRootScreenView>
  );
}