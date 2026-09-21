import { describe, it, expect, vi } from "vitest";
import { estimateSavings } from "./savingsService.js";
import type { CachedProduct } from "./engine.js";

const current: CachedProduct = { productId: "konk", company: "K", product: "P", points: [
  { yearlyConsumption: 2000, totalCost: 1200 }, { yearlyConsumption: 4000, totalCost: 1600 },
]};
const altid: CachedProduct = { productId: "altid_18", company: "Altid Energi", product: "Indkøbspris", points: [
  { yearlyConsumption: 2000, totalCost: 172.8 }, { yearlyConsumption: 4000, totalCost: 172.8 },
]};

describe("estimateSavings", () => {
  it("returnerer besparelse når begge produkter er cachede", async () => {
    const getProduct = vi.fn(async (_r: string, id: string) => (id === "konk" ? current : altid));
    const res = await estimateSavings({ getProduct }, {
      region: "DK1", yearlyConsumption: 4000, currentProductId: "konk", altidProductId: "altid_18",
    });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.savingsPerYear).toBeCloseTo(1427.2, 6);
  });

  it("fejler eksplicit hvis nuværende produkt ikke er cachet (aldrig gæt)", async () => {
    const getProduct = vi.fn(async (_r: string, id: string) => (id === "altid_18" ? altid : null));
    const res = await estimateSavings({ getProduct }, {
      region: "DK1", yearlyConsumption: 4000, currentProductId: "ukendt", altidProductId: "altid_18",
    });
    expect(res).toEqual({ ok: false, reason: "current_product_not_cached" });
  });

  it("fejler eksplicit hvis Altid-produkt ikke er cachet", async () => {
    const getProduct = vi.fn(async (_r: string, id: string) => (id === "konk" ? current : null));
    const res = await estimateSavings({ getProduct }, {
      region: "DK1", yearlyConsumption: 4000, currentProductId: "konk", altidProductId: "altid_18",
    });
    expect(res).toEqual({ ok: false, reason: "altid_product_not_cached" });
  });
});
