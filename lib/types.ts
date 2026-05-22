export type ProductInventory = {
  id: string;
  totalUnits: number;
  reservedUnits: number;
  availableStock: number;
  warehouse: {
    id: string;
    name: string;
  };
};

export type Product = {
  id: string;
  name: string;
  price: number;
  inventories: ProductInventory[];
};

export type ReservationStatus = "PENDING" | "CONFIRMED" | "RELEASED";

export type ReservationDetails = {
  id: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  status: ReservationStatus;
  expiresAt: string;
  createdAt: string;
  product: {
    id: string;
    name: string;
    price: number;
  };
  warehouse: {
    id: string;
    name: string;
  };
};
