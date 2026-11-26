/**
 * Outcome of a payment taken from the subscriber.
 */
export type PaymentStatus = 'PAID' | 'PENDING' | 'FAILED' | 'REFUNDED';

/**
 * A single payment taken from the subscriber.
 *
 * This is the app's domain model for a payment. All fields are required;
 * the mapper mapPaymentDtoToPayment applies defaults when mapping
 * from the optional API DTO.
 */
export interface Payment {
  /** Unique identifier of the payment. */
  id: string;
  /** When the payment was taken (ISO 8601 date-time string). */
  paymentDate: string;
  /** The amount taken, in major currency units (e.g. pounds, not pence). */
  amount: number;
  /** ISO 4217 currency code, e.g. GBP. */
  currency: string;
  /** Human-readable description of what the payment was for. */
  description: string;
  /** Outcome of the payment. */
  status: PaymentStatus;
}
