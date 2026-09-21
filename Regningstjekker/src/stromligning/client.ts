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

  async function getJson<T>(path: string, params: Record<string, string | number>): Promise<T> {
    const url = new URL(path, opts.baseUrl);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
    const res = await doFetch(url.toString(), { headers });
    if (!res.ok) throw new Error(`Strømligning ${path} fejlede: HTTP ${res.status}`);
    return (await res.json()) as T;
  }

  return {
    async getCompanies(p: {
      yearlyConsumption: number;
      region: PriceArea;
      meteringPoints?: number;
      periodMonths?: number;
    }): Promise<SlCompany[]> {
      return getJson<SlCompany[]>("/api/companies", {
        yearlyConsumption: p.yearlyConsumption,
        region: p.region,
        meteringPoints: p.meteringPoints ?? 1,
        periodMonths: p.periodMonths ?? 12,
      });
    },
    async findSupplierByPostalCode(postalCode: number): Promise<SlSupplier[]> {
      return getJson<SlSupplier[]>("/api/suppliers/find", { postalCode });
    },
  };
}
