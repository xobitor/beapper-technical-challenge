import {Currency, SmartyPrice} from '@smarty-app/core';
import {Payment, PaymentStatus} from '@smarty-app/core';

/**
 * The display-ready representation of a single payment for the list UI.
 */
export interface PaymentDisplayData {
  /** Human-readable description of what the payment was for. */
  description: string;
  /** The formatted amount with currency symbol, e.g. "£20.00". */
  amount: string;
  /** The formatted payment date, e.g. "12 Apr 2024". */
  date: string;
  /** The human-readable status label, e.g. "Paid". */
  status: string;
  /** A colour class/token appropriate for the payment status. */
  statusColor: string;
  /** Accessibility label announcing the full payment row. */
  accessibilityLabel: string;
}

/**
 * Formats an ISO 8601 payment date into a short display string.
 *
 * @param paymentDate - The payment date as an ISO 8601 string.
 * @returns A formatted date string, e.g. "12 Apr 2024".
 */
export function formatPaymentDate(paymentDate: string): string {
  const date = new Date(paymentDate);
  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Formats a payment amount with its currency symbol.
 *
 * @param amount - The amount in major currency units.
 * @param currency - The ISO 4217 currency code, e.g. "GBP".
 * @returns A formatted price string, e.g. "£20.00".
 */
export function formatPaymentAmount(amount: number, currency: string): string {
  return new SmartyPrice({
    value: amount,
    currency: currency as Currency,
  }).formatPrice(true);
}

/**
 * Returns the human-readable label for a payment status.
 *
 * @param status - The payment status.
 * @returns A display label, e.g. "Paid".
 */
export function getPaymentStatusLabel(status: PaymentStatus): string {
  switch (status) {
    case 'PAID':
      return 'Paid';
    case 'PENDING':
      return 'Pending';
    case 'FAILED':
      return 'Failed';
    case 'REFUNDED':
      return 'Refunded';
    default:
      return status;
  }
}

/**
 * Returns a colour appropriate for a payment status.
 *
 * @param status - The payment status.
 * @returns A colour string usable as a text colour.
 */
export function getPaymentStatusColor(status: PaymentStatus): string {
  switch (status) {
    case 'PAID':
      return 'text-foreground-secondary';
    case 'PENDING':
      return 'text-foreground-promo';
    case 'FAILED':
      return 'text-foreground-warning';
    case 'REFUNDED':
      return 'text-foreground-accent';
    default:
      return 'text-foreground-primary';
  }
}

/**
 * Maps a {@link Payment} model to its display-ready representation.
 *
 * @param payment - The payment model.
 * @returns A {@link PaymentDisplayData} object.
 */
export function mapPaymentToDisplayData(payment: Payment): PaymentDisplayData {
  return {
    description: payment.description,
    amount: formatPaymentAmount(payment.amount, payment.currency),
    date: formatPaymentDate(payment.paymentDate),
    status: getPaymentStatusLabel(payment.status),
    statusColor: getPaymentStatusColor(payment.status),
    accessibilityLabel: `${payment.description}, ${formatPaymentAmount(
      payment.amount,
      payment.currency,
    )}, ${getPaymentStatusLabel(payment.status)}`,
  };
}
