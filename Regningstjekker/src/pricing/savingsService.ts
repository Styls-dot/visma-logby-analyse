import { computeSavings, type CachedProduct } from "./engine.js";

export type SavingsResult =
  | {
      ok: true;
      currentTotalCost: number;
      altidTotalCost: number;
      savingsPerYear: number;
      assumptions: { region: string; yearlyConsumption: number; currentProductId: string; altidProductId: string };
    }
  | { ok: false; reason: "current_product_not_cached" | "altid_product_not_cached" };

export async function estimateSavings(
  deps: { getProduct: (region: string, productId: string) => Promise<CachedProduct | null> },
  input: { region: string; yearlyConsumption: number; currentProductId: string; altidProductId: string },
): Promise<SavingsResult> {
  const current = await deps.getProduct(input.region, input.currentProductId);
  if (!current) return { ok: false, reason: "current_product_not_cached" };
  const altid = await deps.getProduct(input.region, input.altidProductId);
  if (!altid) return { ok: false, reason: "altid_product_not_cached" };

  const s = computeSavings({ current, altid, yearlyConsumption: input.yearlyConsumption });
  return {
    ok: true,
    currentTotalCost: s.currentTotalCost,
    altidTotalCost: s.altidTotalCost,
    savingsPerYear: s.savingsPerYear,
    assumptions: {
      region: input.region,
      yearlyConsumption: input.yearlyConsumption,
      currentProductId: input.currentProductId,
      altidProductId: input.altidProductId,
    },
  };
}
