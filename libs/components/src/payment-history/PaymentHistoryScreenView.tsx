import {SmartyFlatList} from '@smarty-app/controls';
import {SmartyPrimaryButton, SmartyText} from '@smarty-app/controls-basic';
import {en} from '@smarty-app/language';
import {usePaymentHistoryApiInteraction} from '@smarty-app/ui-api-interaction';
import {JSX} from 'react';
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  View,
  ViewProps,
} from 'react-native';

import {ApiErrorAlertPanel} from '../common/ApiErrorAlertPanel';
import {SmartyRootScreenView} from '../common/SmartyRootScreenView';
import {PaymentHistoryListItem} from './PaymentHistoryListItem';

const WEB = Platform.OS === 'web';

/**
 * Main view for PaymentHistoryScreen.
 *
 * Fetches and displays the subscriber's payment history with pagination,
 * refresh and full loading/empty/error/retry handling. The same component is
 * used on both web and native; only the refresh mechanism differs
 * (pull-to-refresh on native, a visible Refresh button on web).
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

  const isEmpty = !isLoading && !isError && payments.length === 0;

  const handleLoadMore = () => {
    if (hasNextPage) {
      loadMore();
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
        {WEB && (
          <SmartyPrimaryButton
            testID="payment-history-refresh-button"
            onPress={onRefresh}
            disabled={refreshing}
            isLoading={refreshing}
            className="smarty-w-mini smarty-mr-m">
            {en.paymentHistoryRefresh}
          </SmartyPrimaryButton>
        )}
      </View>

      {isError && (
        <View className="smarty-gap-m">
          <ApiErrorAlertPanel />
          <SmartyPrimaryButton
            testID="payment-history-retry-button"
            onPress={onRetry}
            className="w-full">
            {en.paymentHistoryRetry}
          </SmartyPrimaryButton>
        </View>
      )}

      {isEmpty && (
        <View className="smarty-gap-m justify-center items-center smarty-py-l">
          <SmartyText className="smarty-body-m text-foreground-secondary">
            {en.paymentHistoryEmpty}
          </SmartyText>
          <SmartyPrimaryButton
            testID="payment-history-empty-retry-button"
            onPress={onRetry}>
            {en.paymentHistoryRetry}
          </SmartyPrimaryButton>
        </View>
      )}

      {!isError && !isEmpty && (
        <SmartyFlatList
          testID="payment-history-list"
          data={payments}
          renderItem={({item}) => <PaymentHistoryListItem payment={item} />}
          keyExtractor={(item) => item.id}
          isLoading={isLoading}
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
            ) : undefined
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
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
