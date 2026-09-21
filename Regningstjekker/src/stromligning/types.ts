export type PriceArea = "DK1" | "DK2";

export interface SlProduct {
  id: string;
  name: string;
  productType: string;
  totalCost: number | null;
  subscriptionMonthly: number | null;
  feesMonthly: number | null;
  consumptionSurcharge: number | null;
  fixedPrice: number | null;
  creationFee: number | null;
}

export interface SlCompany {
  slug: string;
  name: string;
  products: SlProduct[];
}

export interface SlSupplier {
  id: string;
  name: string;
  companyName: string;
  priceArea: PriceArea;
}
