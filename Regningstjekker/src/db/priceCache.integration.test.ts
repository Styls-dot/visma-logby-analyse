import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { loadConfig } from "../config.js";
import { createDb } from "./client.js";
import { upsertPriceRows, getCachedProduct } from "./priceCache.js";

const hasEnv = !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY;

describe.runIf(hasEnv)("priceCache (integration)", () => {
  // NB: config/client oprettes i beforeAll, ikke i selve describe-kroppen.
  // Vitest kalder describe-kroppen under collection uanset runIf-resultatet,
  // så loadConfig() direkte her ville kaste og fejle "npm test" når .env
  // ikke er indlæst. beforeAll-hooks køres derimod ikke for en sprunget suite.
  let db: SupabaseClient;

  beforeAll(async () => {
    const cfg = loadConfig(process.env);
    db = createDb(cfg);
    await db.from("price_cache").delete().eq("product_id", "_test_prod");
  });

  afterAll(async () => {
    await db.from("price_cache").delete().eq("product_id", "_test_prod");
  });

  it("upserter og læser et produkt som CachedProduct", async () => {
    await upsertPriceRows(db, [
      { region: "DK1", yearlyConsumption: 2000, productId: "_test_prod", company: "Test", product: "P", totalCost: 1000, subscriptionMonthly: null, feesMonthly: null, consumptionSurcharge: null, fixedPrice: null, creationFee: null },
      { region: "DK1", yearlyConsumption: 4000, productId: "_test_prod", company: "Test", product: "P", totalCost: 1400, subscriptionMonthly: null, feesMonthly: null, consumptionSurcharge: null, fixedPrice: null, creationFee: null },
    ]);

    const cached = await getCachedProduct(db, "DK1", "_test_prod");
    expect(cached).not.toBeNull();
    expect(cached!.points).toHaveLength(2);
    const at3000 = cached!.points.sort((a, b) => a.yearlyConsumption - b.yearlyConsumption);
    expect(at3000[0]!.totalCost).toBe(1000);
  });
});
