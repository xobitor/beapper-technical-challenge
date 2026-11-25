import {Payment as PaymentDto} from '@smarty-app/dx-api';

import {Payment} from '../model/payment';

/**
 * Maps a Payment DTO from the API to a Payment model used in the app.
 * Handles optional fields and provides default values where necessary.
 *
 * @param dto - The Payment DTO to map.
 * @returns A Payment model.
 */
export function mapPaymentDtoToPayment(dto: PaymentDto): Payment {
  return {
    id: dto.id ?? '',
    paymentDate: dto.paymentDate ?? '',
    amount: dto.amount ?? 0,
    currency: dto.currency ?? 'GBP',
    description: dto.description ?? '',
    status: dto.status ?? 'PAID',
  };
}