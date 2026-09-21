import type { createStromligningClient } from "./client.js";
import type { PriceRow } from "../db/priceCache.js";
import type { PriceArea } from "./types.js";

export const CONSUMPTION_BUCKETS = [1000, 2000, 3000, 4000, 5000, 6000, 8000, 10000, 15000, 20000];
export const REGIONS: PriceArea[] = ["DK1", "DK2"];

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function syncPrices(deps: {
  client: ReturnType<typeof createStromligningClient>;
  upsert: (rows: PriceRow[]) => Promise<void>;
  delayMs?: number;
  sleep?: (ms: number) => Promise<void>;
}): Promise<{ rowsWritten: number }> {
  const sleep = deps.sleep ?? defaultSleep;
  const delayMs = deps.delayMs ?? 0;
  let rowsWritten = 0;

  for (const region of REGIONS) {
    for (const bucket of CONSUMPTION_BUCKETS) {
      const companies = await deps.client.getCompanies({ yearlyConsumption: bucket, region });
      const rows: PriceRow[] = [];
      for (const c of companies) {
        for (const p of c.products) {
          rows.push({
            region,
            yearlyConsumption: bucket,
            productId: p.id,
            company: c.name,
            product: p.name,
            totalCost: p.totalCost,
            subscriptionMonthly: p.subscriptionMonthly,
            feesMonthly: p.feesMonthly,
            consumptionSurcharge: p.consumptionSurcharge,
            fixedPrice: p.fixedPrice,
            creationFee: p.creationFee,
          });
        }
      }
      await deps.upsert(rows);
      rowsWritten += rows.length;
      if (delayMs > 0) await sleep(delayMs);
    }
  }
  return { rowsWritten };
}
