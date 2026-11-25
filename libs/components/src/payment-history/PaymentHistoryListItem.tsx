import {cn, SmartyText} from '@smarty-app/controls-basic';
import {Payment} from '@smarty-app/core';
import {mapPaymentToDisplayData} from '@smarty-app/ui-logic';
import {JSX} from 'react';
import {Platform, View, ViewProps} from 'react-native';

export interface PaymentHistoryListItemProps extends ViewProps {
  payment: Payment;
}

const WEB = Platform.OS === 'web';

/**
 * A single row in the Payment history list, showing description, amount,
 * date and status for one payment.
 *
 * @param props - Component props {@link PaymentHistoryListItemProps}.
 * @returns A React element.
 */
export function PaymentHistoryListItem(
  props: PaymentHistoryListItemProps,
): JSX.Element {
  const {payment, ...rest} = props;
  const {amount, date, description, status, statusColor, accessibilityLabel} =
    mapPaymentToDisplayData(payment);

  return (
    <View
      {...rest}
      className={cn(
        'flex-row items-center justify-between smarty-px-l smarty-py-m border-b border-foreground-secondary',
        WEB ? 'cursor-pointer hover:bg-background-secondary' : '',
      )}
      accessible={true}
      accessibilityLabel={accessibilityLabel}>
      <View className="flex-1 smarty-pr-m">
        <SmartyText
          className="smarty-body-m text-foreground-primary"
          numberOfLines={1}>
          {description}
        </SmartyText>
        <SmartyText className="smarty-caption-m text-foreground-secondary">
          {date}
        </SmartyText>
      </View>
      <View className="flex-row items-end smarty-gap-s">
        <SmartyText className={cn('smarty-body-m text-foreground-primary')}>
          {amount}
        </SmartyText>
        <SmartyText className={cn('smarty-caption-m', statusColor)}>
          {status}
        </SmartyText>
      </View>
    </View>
  );
}
