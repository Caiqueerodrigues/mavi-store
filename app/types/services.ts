export type Customer = {
  id: number;
  name: string;
  phone: string | null;
  nickname: string | null;
  active: boolean;
};

export type ServiceType = {
  id: number;
  name: string;
  basePrice: number;
  active: boolean;
};
