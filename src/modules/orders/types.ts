export type OrderStatus = 'draft' | 'submitted' | 'validated' | 'fulfilling' | 'fulfilled' | 'cancelled';

export interface OrderItem {
  sku: string;
  quantity: number;
  unitPriceCents: number;
}

export interface Order {
  id: string;
  tenantId: string;
  regionId?: string;
  status: OrderStatus;
  items: OrderItem[];
  totalCents: number;
  externalId?: string;
  createdAt: string;
  updatedAt: string;
  fulfilledAt?: string;
}

export interface CreateOrderInput {
  regionId?: string;
  items: OrderItem[];
}
