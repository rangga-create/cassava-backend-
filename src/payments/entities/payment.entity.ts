export enum PaymentStatus {
  PENDING = "PENDING",
  PAID = "PAID",
  FAILED = "FAILED",
  EXPIRED = "EXPIRED",
  CANCELLED = "CANCELLED",
}

export interface Payment {
  id: string;
  companyId: string;
  salesOrderId: string;
  soNumber: string;
  customerId: string;
  amount: number;
  currency: string;
  provider: string;
  providerTransactionId?: string;
  snapToken?: string;
  status: PaymentStatus;
  paymentMethod?: string;
  notificationPayload?: any;
  createdAt: string;
  updatedAt: string;
}
