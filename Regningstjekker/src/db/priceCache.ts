import type { SupabaseClient } from "@supabase/supabase-js";
import type { CachedProduct } from "../pricing/engine.js";

export interface PriceRow {
  region: string;
  yearlyConsumption: number;
  productId: string;
  company: string;
  product: string;
  totalCost: number | null;
  subscriptionMonthly: number | null;
  feesMonthly: number | null;
  consumptionSurcharge: number | null;
  fixedPrice: number | null;
  creationFee: number | null;
}

export async function upsertPriceRows(db: SupabaseClient, rows: PriceRow[]): Promise<void> {
  if (rows.length === 0) return;
  const payload = rows.map((r) => ({
    region: r.region,
    yearly_consumption: r.yearlyConsumption,
    product_id: r.productId,
    company: r.company,
    product: r.product,
    total_cost: r.totalCost,
    subscription_monthly: r.subscriptionMonthly,
    fees_monthly: r.feesMonthly,
    consumption_surcharge: r.consumptionSurcharge,
    fixed_price: r.fixedPrice,
    creation_fee: r.creationFee,
    fetched_at: new Date().toISOString(),
  }));
  const { error } = await db.from("price_cache").upsert(payload, {
    onConflict: "region,yearly_consumption,product_id",
  });
  if (error) throw new Error(`upsertPriceRows fejlede: ${error.message}`);
}

export async function getCachedProduct(
  db: SupabaseClient,
  region: string,
  productId: string,
): Promise<CachedProduct | null> {
  const { data, error } = await db
    .from("price_cache")
    .select("product_id, company, product, yearly_consumption, total_cost")
    .eq("region", region)
    .eq("product_id", productId);
  if (error) throw new Error(`getCachedProduct fejlede: ${error.message}`);
  if (!data || data.length === 0) return null;
  return {
    productId,
    company: data[0]!.company as string,
    product: data[0]!.product as string,
    points: data
      .filter((r) => r.total_cost !== null)
      .map((r) => ({
        yearlyConsumption: r.yearly_consumption as number,
        totalCost: r.total_cost as number,
      })),
  };
}
