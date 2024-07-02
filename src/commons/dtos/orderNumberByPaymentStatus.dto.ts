import { PaymentStatus } from '../../constants';

export class OrderNumberByPaymentStatusDto {
  paymentStatus: PaymentStatus;

  orderNumber: number;
}
