import { z } from "zod";
import type { SlCompany, SlProduct, SlSupplier, PriceArea } from "./types.js";

interface ClientOpts {
  baseUrl: string;
  apiKey?: string;
  fetchImpl?: typeof fetch;
}

export function createStromligningClient(opts: ClientOpts) {
  const doFetch = opts.fetchImpl ?? fetch;
  const headers: Record<string, string> = { accept: "application/json" };
  if (opts.apiKey) headers["Authorization"] = `Bearer ${opts.apiKey}`;

  // Zod schemas for validation - strict on structure, lenient on types
  // Numeric fields accept number/null/undefined; we handle type coercion in normalization
  const productValidationSchema = z.object({
    id: z.string(),
    name: z.string(),
    productType: z.any(),
    totalCost: z.any(),
    subscriptionMonthly: z.any(),
    feesMonthly: z.any(),
    consumptionSurcharge: z.any(),
    fixedPrice: z.any(),
    creationFee: z.any(),
  });

  const companyValidationSchema = z.object({
    slug: z.string(),
    name: z.string(),
    products: z.array(productValidationSchema),
  });

  // Normalization function to convert validated data to proper types
  const normalizeCompanies = (data: unknown[]): SlCompany[] => {
    return (data as unknown[]).map((company: unknown) => {
      const c = company as Record<string, unknown>;
      return {
        slug: c.slug as string,
        name: c.name as string,
        products: Array.isArray(c.products)
          ? c.products.map((p: unknown) => {
              const prod = p as Record<string, unknown>;
              return {
                id: prod.id as string,
                name: prod.name as string,
                productType: typeof prod.productType === "string" ? prod.productType : "",
                totalCost: typeof prod.totalCost === "number" ? prod.totalCost : null,
                subscriptionMonthly: typeof prod.subscriptionMonthly === "number" ? prod.subscriptionMonthly : null,
                feesMonthly: typeof prod.feesMonthly === "number" ? prod.feesMonthly : null,
                consumptionSurcharge: typeof prod.consumptionSurcharge === "number" ? prod.consumptionSurcharge : null,
                fixedPrice: typeof prod.fixedPrice === "number" ? prod.fixedPrice : null,
                creationFee: typeof prod.creationFee === "number" ? prod.creationFee : null,
              } as SlProduct;
            })
          : [],
      } as SlCompany;
    });
  };

  const companiesResponseSchema = z.array(companyValidationSchema).transform(normalizeCompanies) as z.ZodType<SlCompany[]>;

  const supplierValidationSchema = z.object({
    id: z.string(),
    name: z.string(),
    companyName: z.string(),
    priceArea: z.enum(["DK1", "DK2"]),
  });

  const suppliersResponseSchema = z.array(supplierValidationSchema);

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
