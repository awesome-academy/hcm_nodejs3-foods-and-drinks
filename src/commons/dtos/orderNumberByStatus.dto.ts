import { OrderStatus } from '../../constants';

export class OrderNumberByStatusDto {
  status: OrderStatus;

  orderNumber: number;
}
