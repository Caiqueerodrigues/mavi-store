export type SizeItem = {
  size: string;
  quantity: number;
  color: string;
};

export type Order = {
  id: number;
  orderNumber: string;
  customerId: number | null;
  customerName: string;
  serviceTypeId: number | null;
  orderType: string;
  productDescription: string;
  material: string | null;
  color: string | null;
  orderDate: string;
  dueDate: string | null;
  paymentDate: string | null;
  quantity: number;
  unitPrice: number;
  total: number;
  paidAmount: number;
  paymentStatus: string;
  status: string;
  sizes: SizeItem[];
  withdrawalDate: string | null;
  withdrawnBy: string | null;
  notes: string | null;
};

export type OrderListItem = Pick<
  Order,
  | "id"
  | "orderNumber"
  | "customerName"
  | "orderType"
  | "productDescription"
  | "orderDate"
  | "quantity"
  | "total"
  | "paymentStatus"
  | "status"
>;
