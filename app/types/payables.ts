export type PayableService = {
  id: number;
  orderDate: string;
  deliveryDate: string | null;
  agreedAmount: number;
  quantity: number;
  serviceTypeId: number | null;
  serviceTypeName: string;
  recipientName: string;
  totalAmount: number;
  paymentDate: string | null;
  paymentStatus: "pending" | "paid" | "cancelled";
};

export type PayableServiceListItem = Omit<PayableService, "serviceTypeId">;
