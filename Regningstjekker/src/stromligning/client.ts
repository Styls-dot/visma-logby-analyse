import { z } from "zod";
import type { SlCompany, SlSupplier, PriceArea } from "./types.js";

interface ClientOpts {
  baseUrl: string;
  apiKey?: string;
  fetchImpl?: typeof fetch;
}

export function createStromligningClient(opts: ClientOpts) {
  const doFetch = opts.fetchImpl ?? fetch;
  const headers: Record<string, string> = { accept: "application/json" };
  if (opts.apiKey) headers["Authorization"] = `Bearer ${opts.apiKey}`;

  // Zod schemas for validation
  const productSchema = z.object({
    id: z.string(),
    name: z.string(),
    productType: z.string().default(""),
    totalCost: z.number().nullable().catch(null).default(null),
    subscriptionMonthly: z.number().nullable().catch(null).default(null),
    feesMonthly: z.number().nullable().catch(null).default(null),
    consumptionSurcharge: z.number().nullable().catch(null).default(null),
    fixedPrice: z.number().nullable().catch(null).default(null),
    creationFee: z.number().nullable().catch(null).default(null),
  });

  const companySchema = z.object({
    slug: z.string(),
    name: z.string(),
    products: z.array(productSchema),
  });

  const companiesResponseSchema = z.array(companySchema);

  const supplierSchema = z.object({
    id: z.string(),
    name: z.string(),
    companyName: z.string(),
    priceArea: z.string(),
  });

  const suppliersResponseSchema = z.array(supplierSchema);

  async function getJson<T>(
    path: string,
    params: Record<string, string | number>,
    schema: z.ZodType<T>,
  ): Promise<T> {
    const url = new URL(path, opts.baseUrl);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
    const res = await doFetch(url.toString(), { headers });
    if (!res.ok) throw new Error(`Strømligning ${path} fejlede: HTTP ${res.status}`);
    const data = await res.json();
    try {
      return schema.parse(data);
    } catch (err) {
      if (err instanceof z.ZodError) {
        throw new Error(`Strømligning ${path} returnerede uventet format: ${err.message}`);
      }
      throw err;
    }
  }

  return {
    async getCompanies(p: {
      yearlyConsumption: number;
      region: PriceArea;
      meteringPoints?: number;
      periodMonths?: number;
    }): Promise<SlCompany[]> {
      return getJson("/api/companies", {
        yearlyConsumption: p.yearlyConsumption,
        region: p.region,
        meteringPoints: p.meteringPoints ?? 1,
        periodMonths: p.periodMonths ?? 12,
      }, companiesResponseSchema);
    },
    async findSupplierByPostalCode(postalCode: number): Promise<SlSupplier[]> {
      return getJson("/api/suppliers/find", { postalCode }, suppliersResponseSchema);
    },
  };
}
