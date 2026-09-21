import { describe, it, expect, vi } from "vitest";
import { createStromligningClient } from "./client.js";

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

describe("stromligning client", () => {
  it("getCompanies kalder companies-endpoint og normaliserer produkter", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse([
        {
          slug: "altid-energi",
          name: "Altid Energi",
          products: [
            {
              id: "altid_indkob_18",
              name: "Strøm til indkøbspris - 18 kr/md",
              productType: "variable",
              totalCost: 172.8,
              subscriptionMonthly: 14.4,
              feesMonthly: 0,
              consumptionSurcharge: 0,
              fixedPrice: 0,
              creationFee: 0,
            },
          ],
        },
      ]),
    );
    const client = createStromligningClient({
      baseUrl: "https://stromligning.dk",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const companies = await client.getCompanies({ yearlyConsumption: 4000, region: "DK1" });

    expect(fetchImpl).toHaveBeenCalledOnce();
    const calledUrl = String((fetchImpl.mock.calls as unknown[][])[0]![0]);
    expect(calledUrl).toContain("/api/companies");
    expect(calledUrl).toContain("yearlyConsumption=4000");
    expect(calledUrl).toContain("region=DK1");
    expect(companies[0]!.products[0]!.totalCost).toBe(172.8);
  });

  it("findSupplierByPostalCode returnerer suppliers", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse([{ id: "radius_c", name: "Radius C", companyName: "Radius Elnet A/S", priceArea: "DK1" }]),
    );
    const client = createStromligningClient({
      baseUrl: "https://stromligning.dk",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const res = await client.findSupplierByPostalCode(4320);
    expect(res[0]!.priceArea).toBe("DK1");
    expect(String((fetchImpl.mock.calls as unknown[][])[0]![0])).toContain("postalCode=4320");
  });

  it("kaster ved ikke-2xx", async () => {
    const fetchImpl = vi.fn(async () => new Response("nope", { status: 500 }));
    const client = createStromligningClient({
      baseUrl: "https://stromligning.dk",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    await expect(client.getCompanies({ yearlyConsumption: 4000, region: "DK1" })).rejects.toThrow();
  });

  it("valideringstest: kaster ved malformateret svar (manglende products)", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse([
        {
          slug: "bad-company",
          name: "Bad Company",
          // products field is missing
        },
      ]),
    );
    const client = createStromligningClient({
      baseUrl: "https://stromligning.dk",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    await expect(client.getCompanies({ yearlyConsumption: 4000, region: "DK1" })).rejects.toThrow(
      /returnerede uventet format/,
    );
  });

  it("valideringstest: product med null tal-felt bliver til null uden at kaste", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse([
        {
          slug: "test-energi",
          name: "Test Energi",
          products: [
            {
              id: "test_prod_1",
              name: "Test Product",
              productType: "fixed",
              totalCost: null, // explicit null
              subscriptionMonthly: undefined, // missing
              feesMonthly: "invalid", // invalid type, caught and becomes null
              consumptionSurcharge: 10.5,
              fixedPrice: null,
              creationFee: 0,
            },
          ],
        },
      ]),
    );
    const client = createStromligningClient({
      baseUrl: "https://stromligning.dk",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const companies = await client.getCompanies({ yearlyConsumption: 4000, region: "DK1" });
    expect(companies[0]!.products[0]!.totalCost).toBe(null);
    expect(companies[0]!.products[0]!.subscriptionMonthly).toBe(null);
    expect(companies[0]!.products[0]!.feesMonthly).toBe(null);
    expect(companies[0]!.products[0]!.consumptionSurcharge).toBe(10.5);
  });
});
