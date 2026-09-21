import { describe, it, expect, vi } from "vitest";
import { syncPrices, CONSUMPTION_BUCKETS, REGIONS } from "./sync.js";

describe("syncPrices", () => {
  it("henter alle buckets×regioner og upserter flade rækker", async () => {
    const client = {
      getCompanies: vi.fn(async () => [
        {
          slug: "altid-energi",
          name: "Altid Energi",
          products: [
            { id: "altid_18", name: "Indkøbspris 18", productType: "variable", totalCost: 172.8, subscriptionMonthly: 14.4, feesMonthly: 0, consumptionSurcharge: 0, fixedPrice: 0, creationFee: 0 },
          ],
        },
      ]),
      findSupplierByPostalCode: vi.fn(),
    };
    const upserted: unknown[] = [];
    const upsert = vi.fn(async (rows: unknown[]) => { upserted.push(...rows); });

    const res = await syncPrices({
      client: client as any,
      upsert,
      sleep: async () => {},
    });

    const expectedCalls = CONSUMPTION_BUCKETS.length * REGIONS.length;
    expect(client.getCompanies).toHaveBeenCalledTimes(expectedCalls);
    expect(res.rowsWritten).toBe(expectedCalls); // 1 produkt pr. kald
    expect(upserted[0]).toMatchObject({ productId: "altid_18", region: "DK1" });
  });

  it("genforsøger på transient fejl (429/timeout)", async () => {
    let callCount = 0;
    const client = {
      getCompanies: vi.fn(async () => {
        callCount++;
        if (callCount === 1) {
          throw new Error("429 Too Many Requests");
        }
        return [
          {
            slug: "altid-energi",
            name: "Altid Energi",
            products: [
              { id: "altid_18", name: "Indkøbspris 18", productType: "variable", totalCost: 172.8, subscriptionMonthly: 14.4, feesMonthly: 0, consumptionSurcharge: 0, fixedPrice: 0, creationFee: 0 },
            ],
          },
        ];
      }),
      findSupplierByPostalCode: vi.fn(),
    };
    const sleepCalls: number[] = [];
    const sleep = vi.fn(async (ms: number) => { sleepCalls.push(ms); });
    const upsert = vi.fn(async () => {});

    const res = await syncPrices({
      client: client as any,
      upsert,
      sleep,
      maxRetries: 3,
    });

    // Første kald fejler, anden kald (efter retry) succeeds
    // Heltal × Regioner = 20 kombinationer, hver giver 1 produkt
    expect(res.rowsWritten).toBe(CONSUMPTION_BUCKETS.length * REGIONS.length);
    // getCompanies var kaldt 21 gange: 20 succesfulde + 1 fejlslået som blev gengivet
    expect(client.getCompanies).toHaveBeenCalledTimes(21);
    // Der skulle være mindst én sleep() fra første retry
    expect(sleepCalls.length).toBeGreaterThan(0);
  });
});
