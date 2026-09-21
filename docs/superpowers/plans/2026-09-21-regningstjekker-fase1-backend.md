# Regningstjekker Fase 1 — Backend-fundament & beregningsmotor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Byg det sikre backend-fundament: database, krypteret fil-lagring, upload-intake, GDPR-retention, daglig Strømligning-prissync og en testet beregningsmotor der ud fra postnr/region + årsforbrug + produkt returnerer en ærlig besparelse mod Altid Energi.

**Architecture:** Ét TypeScript-projekt i `Regningstjekker/`. Ren forretningslogik (beregningsmotor, interpolation, Strømligning-klient) er framework-uafhængige moduler unit-testet med Vitest. Supabase leverer Postgres (row-level security), krypteret Storage og senere Auth. En HTTP-flade (Hono) eksponerer upload-intake. Cron-jobs kører sync og retention. Beregning sker LOKALT på cachede priskomponenter, så vi ikke rammer Strømlignings rate limit.

**Tech Stack:** TypeScript, Node 20+, Hono (HTTP), Vitest (test), Zod (validering), @supabase/supabase-js, Supabase (Postgres + Storage). Ingen fine-tuning; Strømligning-data caches dagligt.

**Spec:** `docs/superpowers/specs/2026-09-21-regningstjekker-design.md`

## Global Constraints

Disse gælder implicit for ALLE tasks:

- **Ærlig beregningsmodel:** `besparelse = nuværende_produkt.totalCost − altid.totalCost` ved kundens forbrug + netområde. `totalCost` = selskabets egen del (abonnement + gebyrer + tillæg + evt. fast elpris). Spotpris, nettarif, afgifter, moms holdes UDENFOR. Regningens samlede kr-beløb bruges ALDRIG.
- **Må aldrig sige noget forkert:** ved usikkerhed/manglende data returneres en eksplicit "utilstrækkelig data"-tilstand — aldrig et gæt.
- **Ingen persondata til Strømligning:** kun forbrug + region/postnr sendes til API'et (ikke personhenførbart).
- **Secrets kun server-side:** Supabase service-role-nøgle og andre nøgler læses fra env, aldrig hardcodet, aldrig eksponeret mod frontend. `.env` er git-ignoreret.
- **Retention: 90 dage.** Uploads (fil + række) slettes automatisk efter 90 dage. Fristen skal være én konfigurerbar konstant.
- **Attribution:** Strømligning-kildehenvisning håndteres i frontend (Plan 2) — backend gemmer intet der bryder CC BY-NC.
- **Pengebeløb i kr/år**, afrundes først ved visning (Plan 2); backend regner i fuld præcision.
- **Alle penge-felter fra Strømligning er tal i kr** (API'et returnerer numeriske komponenter).

---

### Task 1: Projekt-skelet

**Files:**
- Create: `Regningstjekker/package.json`
- Create: `Regningstjekker/tsconfig.json`
- Create: `Regningstjekker/vitest.config.ts`
- Create: `Regningstjekker/.gitignore`
- Create: `Regningstjekker/.env.example`
- Create: `Regningstjekker/src/smoke.test.ts`

**Interfaces:**
- Consumes: intet.
- Produces: kørende `npm test` (Vitest) og `npm run build` (tsc). Alle senere tasks bruger dette setup.

- [ ] **Step 1: Opret package.json**

```json
{
  "name": "regningstjekker",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": { "node": ">=20" },
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "build": "tsc -p tsconfig.json",
    "sync": "tsx src/stromligning/sync-cli.ts",
    "retention": "tsx src/retention/cleanup-cli.ts",
    "start": "tsx src/index.ts"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.45.0",
    "hono": "^4.6.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "tsx": "^4.19.0",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0",
    "@types/node": "^20.16.0"
  }
}
```

- [ ] **Step 2: Opret tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "noUncheckedIndexedAccess": true,
    "outDir": "dist",
    "types": ["node"]
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Opret vitest.config.ts**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
```

- [ ] **Step 4: Opret .gitignore**

```gitignore
node_modules/
dist/
.env
.env.local
*.log
```

- [ ] **Step 5: Opret .env.example**

```dotenv
# Supabase
SUPABASE_URL=https://<projekt>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
SUPABASE_BILLS_BUCKET=bills

# Strømligning
STROMLIGNING_BASE_URL=https://stromligning.dk
STROMLIGNING_API_KEY=

# Altid Energi produkt-id i Strømligning-datasættet (verificeres i Task 3/7)
ALTID_ENERGI_PRODUCT_ID=

# Retention
RETENTION_DAYS=90
```

- [ ] **Step 6: Skriv en smoke-test**

```ts
// src/smoke.test.ts
import { describe, it, expect } from "vitest";

describe("smoke", () => {
  it("kører testopsætningen", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 7: Installer og kør testen**

Run: `cd Regningstjekker && npm install && npm test`
Expected: PASS (1 test).

- [ ] **Step 8: Commit**

```bash
git add Regningstjekker/package.json Regningstjekker/tsconfig.json Regningstjekker/vitest.config.ts Regningstjekker/.gitignore Regningstjekker/.env.example Regningstjekker/src/smoke.test.ts
git commit -m "chore(regningstjekker): projekt-skelet med vitest + tsconfig"
```

---

### Task 2: Config-modul (env-parsing med Zod)

**Files:**
- Create: `Regningstjekker/src/config.ts`
- Test: `Regningstjekker/src/config.test.ts`

**Interfaces:**
- Consumes: intet.
- Produces: `loadConfig(env: Record<string,string|undefined>): Config` hvor
  `Config = { supabaseUrl: string; supabaseServiceRoleKey: string; billsBucket: string; stromligningBaseUrl: string; stromligningApiKey?: string; altidEnergiProductId?: string; retentionDays: number }`.
  Kaster fejl med tydelig besked hvis påkrævet env mangler.

- [ ] **Step 1: Skriv den fejlende test**

```ts
// src/config.test.ts
import { describe, it, expect } from "vitest";
import { loadConfig } from "./config.js";

const base = {
  SUPABASE_URL: "https://x.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "key",
  SUPABASE_BILLS_BUCKET: "bills",
  STROMLIGNING_BASE_URL: "https://stromligning.dk",
  RETENTION_DAYS: "90",
};

describe("loadConfig", () => {
  it("parser gyldig env", () => {
    const c = loadConfig(base);
    expect(c.supabaseUrl).toBe("https://x.supabase.co");
    expect(c.retentionDays).toBe(90);
    expect(c.billsBucket).toBe("bills");
  });

  it("defaulter retentionDays til 90 når den mangler", () => {
    const { RETENTION_DAYS, ...rest } = base;
    expect(loadConfig(rest).retentionDays).toBe(90);
  });

  it("kaster når påkrævet nøgle mangler", () => {
    const { SUPABASE_URL, ...rest } = base;
    expect(() => loadConfig(rest)).toThrow(/SUPABASE_URL/);
  });
});
```

- [ ] **Step 2: Kør testen og bekræft den fejler**

Run: `npm test -- src/config.test.ts`
Expected: FAIL ("loadConfig is not a function" / modul mangler).

- [ ] **Step 3: Implementer config.ts**

```ts
// src/config.ts
import { z } from "zod";

const schema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_BILLS_BUCKET: z.string().min(1).default("bills"),
  STROMLIGNING_BASE_URL: z.string().url().default("https://stromligning.dk"),
  STROMLIGNING_API_KEY: z.string().optional(),
  ALTID_ENERGI_PRODUCT_ID: z.string().optional(),
  RETENTION_DAYS: z.coerce.number().int().positive().default(90),
});

export type Config = {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  billsBucket: string;
  stromligningBaseUrl: string;
  stromligningApiKey?: string;
  altidEnergiProductId?: string;
  retentionDays: number;
};

export function loadConfig(env: Record<string, string | undefined>): Config {
  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    const missing = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`Ugyldig/manglende konfiguration: ${missing}`);
  }
  const e = parsed.data;
  return {
    supabaseUrl: e.SUPABASE_URL,
    supabaseServiceRoleKey: e.SUPABASE_SERVICE_ROLE_KEY,
    billsBucket: e.SUPABASE_BILLS_BUCKET,
    stromligningBaseUrl: e.STROMLIGNING_BASE_URL,
    stromligningApiKey: e.STROMLIGNING_API_KEY,
    altidEnergiProductId: e.ALTID_ENERGI_PRODUCT_ID,
    retentionDays: e.RETENTION_DAYS,
  };
}
```

- [ ] **Step 4: Kør testen og bekræft den passerer**

Run: `npm test -- src/config.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add Regningstjekker/src/config.ts Regningstjekker/src/config.test.ts
git commit -m "feat(regningstjekker): config-modul med zod-validering"
```

---

### Task 3: Strømligning-klient + typer

**Files:**
- Create: `Regningstjekker/src/stromligning/types.ts`
- Create: `Regningstjekker/src/stromligning/client.ts`
- Test: `Regningstjekker/src/stromligning/client.test.ts`

**Interfaces:**
- Consumes: intet (bruger global `fetch`).
- Produces:
  - Type `SlProduct = { id: string; name: string; productType: string; totalCost: number | null; subscriptionMonthly: number | null; feesMonthly: number | null; consumptionSurcharge: number | null; fixedPrice: number | null; creationFee: number | null }`.
  - Type `SlCompany = { slug: string; name: string; products: SlProduct[] }`.
  - `createStromligningClient(opts: { baseUrl: string; apiKey?: string; fetchImpl?: typeof fetch }) => { getCompanies(params: { yearlyConsumption: number; region: "DK1"|"DK2"; meteringPoints?: number; periodMonths?: number }): Promise<SlCompany[]>; findSupplierByPostalCode(postalCode: number): Promise<{ id: string; name: string; companyName: string; priceArea: "DK1"|"DK2" }[]> }`.

- [ ] **Step 1: Skriv typer**

```ts
// src/stromligning/types.ts
export type PriceArea = "DK1" | "DK2";

export interface SlProduct {
  id: string;
  name: string;
  productType: string;
  totalCost: number | null;
  subscriptionMonthly: number | null;
  feesMonthly: number | null;
  consumptionSurcharge: number | null;
  fixedPrice: number | null;
  creationFee: number | null;
}

export interface SlCompany {
  slug: string;
  name: string;
  products: SlProduct[];
}

export interface SlSupplier {
  id: string;
  name: string;
  companyName: string;
  priceArea: PriceArea;
}
```

- [ ] **Step 2: Skriv den fejlende test (mocket fetch)**

```ts
// src/stromligning/client.test.ts
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
    const calledUrl = String(fetchImpl.mock.calls[0]![0]);
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
    expect(String(fetchImpl.mock.calls[0]![0])).toContain("postalCode=4320");
  });

  it("kaster ved ikke-2xx", async () => {
    const fetchImpl = vi.fn(async () => new Response("nope", { status: 500 }));
    const client = createStromligningClient({
      baseUrl: "https://stromligning.dk",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    await expect(client.getCompanies({ yearlyConsumption: 4000, region: "DK1" })).rejects.toThrow();
  });
});
```

- [ ] **Step 3: Kør testen og bekræft den fejler**

Run: `npm test -- src/stromligning/client.test.ts`
Expected: FAIL (modul mangler).

- [ ] **Step 4: Implementer client.ts**

```ts
// src/stromligning/client.ts
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
```

- [ ] **Step 5: Kør testen og bekræft den passerer**

Run: `npm test -- src/stromligning/client.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add Regningstjekker/src/stromligning/types.ts Regningstjekker/src/stromligning/client.ts Regningstjekker/src/stromligning/client.test.ts
git commit -m "feat(regningstjekker): strømligning-klient (companies + suppliers)"
```

---

### Task 4: Beregningsmotor (interpolation + besparelse) — kronjuvelen

**Files:**
- Create: `Regningstjekker/src/pricing/engine.ts`
- Test: `Regningstjekker/src/pricing/engine.test.ts`

**Interfaces:**
- Consumes: intet (rene funktioner på cachet data).
- Produces:
  - Type `CachedPoint = { yearlyConsumption: number; totalCost: number }`.
  - Type `CachedProduct = { productId: string; company: string; product: string; points: CachedPoint[] }`.
  - `interpolateTotalCost(points: CachedPoint[], yearlyConsumption: number): number` — lineær interpolation/ekstrapolation mellem nærmeste to punkter (punkter sorteres internt).
  - `computeSavings(input: { current: CachedProduct; altid: CachedProduct; yearlyConsumption: number }): { currentTotalCost: number; altidTotalCost: number; savingsPerYear: number }`.

- [ ] **Step 1: Skriv de fejlende tests**

```ts
// src/pricing/engine.test.ts
import { describe, it, expect } from "vitest";
import { interpolateTotalCost, computeSavings, type CachedProduct } from "./engine.js";

describe("interpolateTotalCost", () => {
  const points = [
    { yearlyConsumption: 2000, totalCost: 1000 },
    { yearlyConsumption: 4000, totalCost: 1400 }, // 200 fast + 0.4/kWh
  ];

  it("interpolerer mellem to punkter", () => {
    expect(interpolateTotalCost(points, 3000)).toBeCloseTo(1200, 6);
  });

  it("rammer et eksakt punkt", () => {
    expect(interpolateTotalCost(points, 4000)).toBeCloseTo(1400, 6);
  });

  it("ekstrapolerer under laveste punkt via de to nærmeste", () => {
    // linje: totalCost = 200 + 0.4*kWh -> ved 1000 kWh = 600
    expect(interpolateTotalCost(points, 1000)).toBeCloseTo(600, 6);
  });

  it("ekstrapolerer over højeste punkt", () => {
    // ved 6000 kWh = 200 + 0.4*6000 = 2600
    expect(interpolateTotalCost(points, 6000)).toBeCloseTo(2600, 6);
  });

  it("håndterer et enkelt punkt (konstant)", () => {
    expect(interpolateTotalCost([{ yearlyConsumption: 4000, totalCost: 900 }], 8000)).toBe(900);
  });

  it("kaster ved tomt punktsæt", () => {
    expect(() => interpolateTotalCost([], 4000)).toThrow();
  });
});

describe("computeSavings", () => {
  const current: CachedProduct = {
    productId: "konkurrent_x",
    company: "Konkurrent",
    product: "Standard",
    points: [
      { yearlyConsumption: 2000, totalCost: 1200 },
      { yearlyConsumption: 4000, totalCost: 1600 },
    ],
  };
  const altid: CachedProduct = {
    productId: "altid_indkob_18",
    company: "Altid Energi",
    product: "Strøm til indkøbspris - 18 kr/md",
    points: [
      { yearlyConsumption: 2000, totalCost: 172.8 },
      { yearlyConsumption: 4000, totalCost: 172.8 },
    ],
  };

  it("beregner positiv besparelse ved skift til Altid", () => {
    const r = computeSavings({ current, altid, yearlyConsumption: 4000 });
    expect(r.currentTotalCost).toBeCloseTo(1600, 6);
    expect(r.altidTotalCost).toBeCloseTo(172.8, 6);
    expect(r.savingsPerYear).toBeCloseTo(1427.2, 6);
  });

  it("giver negativ besparelse ærligt hvis Altid er dyrere", () => {
    const dyrAltid: CachedProduct = { ...altid, points: [
      { yearlyConsumption: 2000, totalCost: 2000 },
      { yearlyConsumption: 4000, totalCost: 2000 },
    ]};
    const r = computeSavings({ current, altid: dyrAltid, yearlyConsumption: 4000 });
    expect(r.savingsPerYear).toBeLessThan(0);
  });
});
```

- [ ] **Step 2: Kør testene og bekræft de fejler**

Run: `npm test -- src/pricing/engine.test.ts`
Expected: FAIL (modul mangler).

- [ ] **Step 3: Implementer engine.ts**

```ts
// src/pricing/engine.ts
export interface CachedPoint {
  yearlyConsumption: number;
  totalCost: number;
}

export interface CachedProduct {
  productId: string;
  company: string;
  product: string;
  points: CachedPoint[];
}

export function interpolateTotalCost(points: CachedPoint[], yearlyConsumption: number): number {
  if (points.length === 0) throw new Error("Kan ikke interpolere uden priskomponenter");
  const sorted = [...points].sort((a, b) => a.yearlyConsumption - b.yearlyConsumption);
  if (sorted.length === 1) return sorted[0]!.totalCost;

  // Find omkringliggende segment; ekstrapoler via nærmeste segment uden for range.
  let lo = sorted[0]!;
  let hi = sorted[1]!;
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i]!;
    const b = sorted[i + 1]!;
    if (yearlyConsumption >= a.yearlyConsumption && yearlyConsumption <= b.yearlyConsumption) {
      lo = a;
      hi = b;
      break;
    }
    if (yearlyConsumption > b.yearlyConsumption) {
      lo = sorted[sorted.length - 2]!;
      hi = sorted[sorted.length - 1]!;
    }
  }
  if (yearlyConsumption < sorted[0]!.yearlyConsumption) {
    lo = sorted[0]!;
    hi = sorted[1]!;
  }
  const span = hi.yearlyConsumption - lo.yearlyConsumption;
  if (span === 0) return lo.totalCost;
  const slope = (hi.totalCost - lo.totalCost) / span;
  return lo.totalCost + slope * (yearlyConsumption - lo.yearlyConsumption);
}

export function computeSavings(input: {
  current: CachedProduct;
  altid: CachedProduct;
  yearlyConsumption: number;
}): { currentTotalCost: number; altidTotalCost: number; savingsPerYear: number } {
  const currentTotalCost = interpolateTotalCost(input.current.points, input.yearlyConsumption);
  const altidTotalCost = interpolateTotalCost(input.altid.points, input.yearlyConsumption);
  return {
    currentTotalCost,
    altidTotalCost,
    savingsPerYear: currentTotalCost - altidTotalCost,
  };
}
```

- [ ] **Step 4: Kør testene og bekræft de passerer**

Run: `npm test -- src/pricing/engine.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add Regningstjekker/src/pricing/engine.ts Regningstjekker/src/pricing/engine.test.ts
git commit -m "feat(regningstjekker): beregningsmotor med interpolation + besparelse"
```

---

### Task 5: Database-skema + Supabase-projekt

**Files:**
- Create: `Regningstjekker/db/schema.sql`
- Create: `Regningstjekker/db/README.md`

**Interfaces:**
- Consumes: intet.
- Produces: tabellerne `submissions`, `price_cache`, `company_mappings`, `lead_consents` og et privat storage-bucket `bills` i et Supabase-projekt. Senere tasks tilgår disse.

- [ ] **Step 1: Skriv schema.sql**

```sql
-- Regningstjekker skema. Kør i Supabase SQL Editor (eller via supabase db push).

-- Uploads / indsendelser
create table if not exists submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  status text not null default 'received', -- received | read | needs_input | corrected | error
  file_path text,                          -- sti i storage-bucket 'bills'
  file_mime text,
  extracted jsonb,                         -- rå udtrukne felter (Plan 2)
  normalized jsonb,                        -- normaliseret (region, produkt-id) (Plan 2)
  result jsonb,                            -- besparelsesresultat
  corrections jsonb,                       -- admin-rettelser (Plan 2)
  delete_after timestamptz not null default (now() + interval '90 days')
);

-- Prissnapshot fra Strømligning (én række pr. produkt pr. region pr. forbrugs-bucket)
create table if not exists price_cache (
  id bigint generated always as identity primary key,
  fetched_at timestamptz not null default now(),
  region text not null,                    -- DK1 | DK2
  yearly_consumption integer not null,     -- bucket, fx 4000
  product_id text not null,
  company text not null,
  product text not null,
  total_cost double precision,
  subscription_monthly double precision,
  fees_monthly double precision,
  consumption_surcharge double precision,
  fixed_price double precision,
  creation_fee double precision,
  unique (region, yearly_consumption, product_id)
);

-- Mapping fra rå selskabs/produkt-tekst til Strømligning-produkt-id (fyldes af rettelser i Plan 2)
create table if not exists company_mappings (
  id bigint generated always as identity primary key,
  raw_text text not null unique,
  product_id text not null,
  created_at timestamptz not null default now()
);

-- Lead-samtykke (kun ved eksplicit samtykke; Plan 3)
create table if not exists lead_consents (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid references submissions(id) on delete set null,
  name text,
  email text,
  phone text,
  marketing_consent boolean not null default false,
  created_at timestamptz not null default now()
);

-- Row-level security: ingen anon-adgang. Service-role (backend) bypasser RLS.
alter table submissions enable row level security;
alter table price_cache enable row level security;
alter table company_mappings enable row level security;
alter table lead_consents enable row level security;
-- Ingen policies for anon/authenticated => kun service-role kan læse/skrive.

create index if not exists idx_submissions_delete_after on submissions(delete_after);
create index if not exists idx_price_cache_lookup on price_cache(region, product_id, yearly_consumption);
```

- [ ] **Step 2: Skriv db/README.md med opsætningstrin**

```markdown
# Database-opsætning

1. Opret et Supabase-projekt på https://supabase.com (gratis tier).
2. SQL Editor → indsæt `schema.sql` → Run.
3. Storage → Create bucket → navn `bills`, **Public: OFF** (privat).
4. Project Settings → API → kopier `Project URL` og `service_role`-nøglen til `.env`
   (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`). service_role-nøglen er hemmelig
   og må ALDRIG i frontend eller git.
```

- [ ] **Step 3: Anvend skemaet (manuelt trin)**

Kør `schema.sql` i Supabase SQL Editor og opret `bills`-bucket (privat) jf. README.
Bekræft i Table Editor at de fire tabeller findes.

- [ ] **Step 4: Commit**

```bash
git add Regningstjekker/db/schema.sql Regningstjekker/db/README.md
git commit -m "feat(regningstjekker): db-skema + supabase-opsætningsguide"
```

---

### Task 6: Supabase-klient + price_cache-repository

**Files:**
- Create: `Regningstjekker/src/db/client.ts`
- Create: `Regningstjekker/src/db/priceCache.ts`
- Test: `Regningstjekker/src/db/priceCache.integration.test.ts`

**Interfaces:**
- Consumes: `loadConfig` (Task 2), typer fra `pricing/engine` (Task 4).
- Produces:
  - `createDb(config): SupabaseClient` (service-role).
  - `upsertPriceRows(db, rows: PriceRow[]): Promise<void>` hvor `PriceRow = { region: string; yearlyConsumption: number; productId: string; company: string; product: string; totalCost: number|null; subscriptionMonthly: number|null; feesMonthly: number|null; consumptionSurcharge: number|null; fixedPrice: number|null; creationFee: number|null }`.
  - `getCachedProduct(db, region: string, productId: string): Promise<CachedProduct | null>` (samler alle buckets til `points`).

- [ ] **Step 1: Implementer db/client.ts**

```ts
// src/db/client.ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Config } from "../config.js";

export function createDb(config: Config): SupabaseClient {
  return createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: { persistSession: false },
  });
}
```

- [ ] **Step 2: Skriv den fejlende integrationstest**

> Kræver `.env` med et virkeligt Supabase dev-projekt. Kører kun når env er sat.

```ts
// src/db/priceCache.integration.test.ts
import { describe, it, expect, beforeAll } from "vitest";
import { config as loadDotenv } from "node:process";
import { loadConfig } from "../config.js";
import { createDb } from "./client.js";
import { upsertPriceRows, getCachedProduct } from "./priceCache.js";

const hasEnv = !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY;

describe.runIf(hasEnv)("priceCache (integration)", () => {
  const cfg = loadConfig(process.env);
  const db = createDb(cfg);

  beforeAll(async () => {
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
```

- [ ] **Step 3: Kør testen og bekræft den fejler**

Run: `npm test -- src/db/priceCache.integration.test.ts`
Expected: FAIL (modul `priceCache.js` mangler). (Hvis `.env` ikke er sat, springes testen over — sæt env for at køre den.)

- [ ] **Step 4: Implementer priceCache.ts**

```ts
// src/db/priceCache.ts
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
```

- [ ] **Step 5: Kør testen og bekræft den passerer**

Run: `npm test -- src/db/priceCache.integration.test.ts`
Expected: PASS (med env sat).

- [ ] **Step 6: Commit**

```bash
git add Regningstjekker/src/db/client.ts Regningstjekker/src/db/priceCache.ts Regningstjekker/src/db/priceCache.integration.test.ts
git commit -m "feat(regningstjekker): supabase-klient + price_cache-repository"
```

---

### Task 7: Strømligning-sync-job

**Files:**
- Create: `Regningstjekker/src/stromligning/sync.ts`
- Create: `Regningstjekker/src/stromligning/sync-cli.ts`
- Test: `Regningstjekker/src/stromligning/sync.test.ts`

**Interfaces:**
- Consumes: `createStromligningClient` (Task 3), `upsertPriceRows` (Task 6).
- Produces:
  - Konstant `CONSUMPTION_BUCKETS = [1000,2000,3000,4000,5000,6000,8000,10000,15000,20000]` og `REGIONS = ["DK1","DK2"]`.
  - `syncPrices(deps: { client: ReturnType<typeof createStromligningClient>; upsert: (rows: PriceRow[]) => Promise<void>; delayMs?: number; sleep?: (ms:number)=>Promise<void> }): Promise<{ rowsWritten: number }>`.

- [ ] **Step 1: Skriv den fejlende test**

```ts
// src/stromligning/sync.test.ts
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
});
```

- [ ] **Step 2: Kør testen og bekræft den fejler**

Run: `npm test -- src/stromligning/sync.test.ts`
Expected: FAIL (modul mangler).

- [ ] **Step 3: Implementer sync.ts**

```ts
// src/stromligning/sync.ts
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
```

- [ ] **Step 4: Kør testen og bekræft den passerer**

Run: `npm test -- src/stromligning/sync.test.ts`
Expected: PASS.

- [ ] **Step 5: Skriv sync-cli.ts (rigtig kørsel)**

```ts
// src/stromligning/sync-cli.ts
import { loadConfig } from "../config.js";
import { createStromligningClient } from "./client.js";
import { createDb } from "../db/client.js";
import { upsertPriceRows } from "../db/priceCache.js";
import { syncPrices } from "./sync.js";

async function main() {
  const cfg = loadConfig(process.env);
  const client = createStromligningClient({
    baseUrl: cfg.stromligningBaseUrl,
    apiKey: cfg.stromligningApiKey,
  });
  const db = createDb(cfg);
  // Uden API-nøgle: sæt delay for at respektere rate limit (5-10 kald/15 min).
  const delayMs = cfg.stromligningApiKey ? 500 : 120_000;
  const res = await syncPrices({ client, upsert: (rows) => upsertPriceRows(db, rows), delayMs });
  console.log(`Sync færdig: ${res.rowsWritten} rækker skrevet.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

- [ ] **Step 6: Kør en rigtig sync mod dev-databasen**

Run: `cd Regningstjekker && node --env-file=.env node_modules/.bin/tsx src/stromligning/sync-cli.ts`
Expected: log "Sync færdig: N rækker skrevet." og rækker i `price_cache`. Uden API-nøgle tager det ~40 min pga. throttling — anbefal at skaffe nøgle.

- [ ] **Step 7: Commit**

```bash
git add Regningstjekker/src/stromligning/sync.ts Regningstjekker/src/stromligning/sync-cli.ts Regningstjekker/src/stromligning/sync.test.ts
git commit -m "feat(regningstjekker): daglig strømligning-prissync med rate-limit-throttling"
```

---

### Task 8: Besparelses-service (kobler motor til cache)

**Files:**
- Create: `Regningstjekker/src/pricing/savingsService.ts`
- Test: `Regningstjekker/src/pricing/savingsService.test.ts`

**Interfaces:**
- Consumes: `getCachedProduct` (Task 6), `computeSavings` (Task 4).
- Produces:
  - `estimateSavings(deps: { getProduct: (region: string, productId: string) => Promise<CachedProduct | null> }, input: { region: string; yearlyConsumption: number; currentProductId: string; altidProductId: string }): Promise<SavingsResult>`
  - `type SavingsResult = { ok: true; currentTotalCost: number; altidTotalCost: number; savingsPerYear: number; assumptions: { region: string; yearlyConsumption: number; currentProductId: string; altidProductId: string } } | { ok: false; reason: "current_product_not_cached" | "altid_product_not_cached" }`.

- [ ] **Step 1: Skriv de fejlende tests**

```ts
// src/pricing/savingsService.test.ts
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
```

- [ ] **Step 2: Kør testene og bekræft de fejler**

Run: `npm test -- src/pricing/savingsService.test.ts`
Expected: FAIL (modul mangler).

- [ ] **Step 3: Implementer savingsService.ts**

```ts
// src/pricing/savingsService.ts
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
```

- [ ] **Step 4: Kør testene og bekræft de passerer**

Run: `npm test -- src/pricing/savingsService.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add Regningstjekker/src/pricing/savingsService.ts Regningstjekker/src/pricing/savingsService.test.ts
git commit -m "feat(regningstjekker): besparelses-service med eksplicit fejl ved manglende data"
```

---

### Task 9: Fil-lagring af regninger (Supabase Storage)

**Files:**
- Create: `Regningstjekker/src/storage/bills.ts`
- Test: `Regningstjekker/src/storage/bills.integration.test.ts`

**Interfaces:**
- Consumes: `createDb` (Task 6), `Config` (Task 2).
- Produces:
  - `uploadBill(db, bucket, params: { submissionId: string; bytes: Uint8Array; mime: string }): Promise<{ path: string }>` — sti-mønster `${submissionId}/original`.
  - `getSignedBillUrl(db, bucket, path: string, expiresInSec?: number): Promise<string>`.
  - `deleteBill(db, bucket, path: string): Promise<void>`.

- [ ] **Step 1: Skriv den fejlende integrationstest**

```ts
// src/storage/bills.integration.test.ts
import { describe, it, expect } from "vitest";
import { loadConfig } from "../config.js";
import { createDb } from "../db/client.js";
import { uploadBill, getSignedBillUrl, deleteBill } from "./bills.js";

const hasEnv = !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY;

describe.runIf(hasEnv)("bills storage (integration)", () => {
  const cfg = loadConfig(process.env);
  const db = createDb(cfg);

  it("uploader, signerer og sletter en fil", async () => {
    const submissionId = `test-${Date.now()}`;
    const bytes = new TextEncoder().encode("%PDF-1.4 test");
    const { path } = await uploadBill(db, cfg.billsBucket, { submissionId, bytes, mime: "application/pdf" });
    expect(path).toContain(submissionId);

    const url = await getSignedBillUrl(db, cfg.billsBucket, path, 60);
    expect(url).toContain("token");

    await deleteBill(db, cfg.billsBucket, path);
  });
});
```

- [ ] **Step 2: Kør testen og bekræft den fejler**

Run: `npm test -- src/storage/bills.integration.test.ts`
Expected: FAIL (modul mangler). (Springes over uden env.)

- [ ] **Step 3: Implementer bills.ts**

```ts
// src/storage/bills.ts
import type { SupabaseClient } from "@supabase/supabase-js";

export async function uploadBill(
  db: SupabaseClient,
  bucket: string,
  params: { submissionId: string; bytes: Uint8Array; mime: string },
): Promise<{ path: string }> {
  const path = `${params.submissionId}/original`;
  const { error } = await db.storage.from(bucket).upload(path, params.bytes, {
    contentType: params.mime,
    upsert: true,
  });
  if (error) throw new Error(`uploadBill fejlede: ${error.message}`);
  return { path };
}

export async function getSignedBillUrl(
  db: SupabaseClient,
  bucket: string,
  path: string,
  expiresInSec = 300,
): Promise<string> {
  const { data, error } = await db.storage.from(bucket).createSignedUrl(path, expiresInSec);
  if (error || !data) throw new Error(`getSignedBillUrl fejlede: ${error?.message}`);
  return data.signedUrl;
}

export async function deleteBill(db: SupabaseClient, bucket: string, path: string): Promise<void> {
  const { error } = await db.storage.from(bucket).remove([path]);
  if (error) throw new Error(`deleteBill fejlede: ${error.message}`);
}
```

- [ ] **Step 4: Kør testen og bekræft den passerer**

Run: `npm test -- src/storage/bills.integration.test.ts`
Expected: PASS (med env).

- [ ] **Step 5: Commit**

```bash
git add Regningstjekker/src/storage/bills.ts Regningstjekker/src/storage/bills.integration.test.ts
git commit -m "feat(regningstjekker): krypteret fil-lagring af regninger i supabase storage"
```

---

### Task 10: Submissions-repository

**Files:**
- Create: `Regningstjekker/src/db/submissions.ts`
- Test: `Regningstjekker/src/db/submissions.integration.test.ts`

**Interfaces:**
- Consumes: `createDb` (Task 6).
- Produces:
  - `type Submission = { id: string; createdAt: string; status: string; filePath: string | null; fileMime: string | null; result: unknown | null; deleteAfter: string }`.
  - `createSubmission(db, input: { status?: string }): Promise<Submission>`.
  - `setSubmissionFile(db, id: string, filePath: string, fileMime: string): Promise<void>`.
  - `getSubmission(db, id: string): Promise<Submission | null>`.
  - `listSubmissions(db, limit?: number): Promise<Submission[]>`.

- [ ] **Step 1: Skriv den fejlende integrationstest**

```ts
// src/db/submissions.integration.test.ts
import { describe, it, expect } from "vitest";
import { loadConfig } from "../config.js";
import { createDb } from "./client.js";
import { createSubmission, setSubmissionFile, getSubmission, listSubmissions } from "./submissions.js";

const hasEnv = !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY;

describe.runIf(hasEnv)("submissions (integration)", () => {
  const cfg = loadConfig(process.env);
  const db = createDb(cfg);

  it("opretter, sætter fil og henter en submission", async () => {
    const s = await createSubmission(db, {});
    expect(s.id).toBeTruthy();
    expect(s.status).toBe("received");

    await setSubmissionFile(db, s.id, `${s.id}/original`, "application/pdf");
    const got = await getSubmission(db, s.id);
    expect(got!.filePath).toBe(`${s.id}/original`);

    const list = await listSubmissions(db, 5);
    expect(list.some((x) => x.id === s.id)).toBe(true);
  });
});
```

- [ ] **Step 2: Kør testen og bekræft den fejler**

Run: `npm test -- src/db/submissions.integration.test.ts`
Expected: FAIL (modul mangler).

- [ ] **Step 3: Implementer submissions.ts**

```ts
// src/db/submissions.ts
import type { SupabaseClient } from "@supabase/supabase-js";

export interface Submission {
  id: string;
  createdAt: string;
  status: string;
  filePath: string | null;
  fileMime: string | null;
  result: unknown | null;
  deleteAfter: string;
}

function mapRow(r: Record<string, unknown>): Submission {
  return {
    id: r.id as string,
    createdAt: r.created_at as string,
    status: r.status as string,
    filePath: (r.file_path as string) ?? null,
    fileMime: (r.file_mime as string) ?? null,
    result: r.result ?? null,
    deleteAfter: r.delete_after as string,
  };
}

const COLS = "id, created_at, status, file_path, file_mime, result, delete_after";

export async function createSubmission(db: SupabaseClient, input: { status?: string }): Promise<Submission> {
  const { data, error } = await db
    .from("submissions")
    .insert({ status: input.status ?? "received" })
    .select(COLS)
    .single();
  if (error || !data) throw new Error(`createSubmission fejlede: ${error?.message}`);
  return mapRow(data);
}

export async function setSubmissionFile(db: SupabaseClient, id: string, filePath: string, fileMime: string): Promise<void> {
  const { error } = await db.from("submissions").update({ file_path: filePath, file_mime: fileMime }).eq("id", id);
  if (error) throw new Error(`setSubmissionFile fejlede: ${error.message}`);
}

export async function getSubmission(db: SupabaseClient, id: string): Promise<Submission | null> {
  const { data, error } = await db.from("submissions").select(COLS).eq("id", id).maybeSingle();
  if (error) throw new Error(`getSubmission fejlede: ${error.message}`);
  return data ? mapRow(data) : null;
}

export async function listSubmissions(db: SupabaseClient, limit = 50): Promise<Submission[]> {
  const { data, error } = await db.from("submissions").select(COLS).order("created_at", { ascending: false }).limit(limit);
  if (error) throw new Error(`listSubmissions fejlede: ${error.message}`);
  return (data ?? []).map(mapRow);
}
```

- [ ] **Step 4: Kør testen og bekræft den passerer**

Run: `npm test -- src/db/submissions.integration.test.ts`
Expected: PASS (med env).

- [ ] **Step 5: Commit**

```bash
git add Regningstjekker/src/db/submissions.ts Regningstjekker/src/db/submissions.integration.test.ts
git commit -m "feat(regningstjekker): submissions-repository (create/get/list/setFile)"
```

---

### Task 11: Upload-intake HTTP-route

**Files:**
- Create: `Regningstjekker/src/http/app.ts`
- Create: `Regningstjekker/src/index.ts`
- Test: `Regningstjekker/src/http/app.test.ts`

**Interfaces:**
- Consumes: `createSubmission`, `setSubmissionFile` (Task 10), `uploadBill` (Task 9), `createDb` (Task 6), `Config` (Task 2).
- Produces:
  - `createApp(deps: { db: SupabaseClient; billsBucket: string }): Hono` med ruter:
    - `GET /health` → `{ ok: true }`.
    - `POST /api/upload` (multipart, felt `file`) → opretter submission, gemmer fil, sætter fil på submission, returnerer `{ submissionId, status: "received" }`. Afviser manglende fil med 400 og forkert filtype med 415. (Ekstraktion sker i Plan 2.)
  - `index.ts` starter serveren med `@hono/node-server`.

- [ ] **Step 1: Tilføj node-server-afhængighed**

Run: `cd Regningstjekker && npm install @hono/node-server@^1.13.0`

- [ ] **Step 2: Skriv den fejlende test (injiceret db-stub)**

```ts
// src/http/app.test.ts
import { describe, it, expect, vi } from "vitest";
import { createApp } from "./app.js";

function fakeDb() {
  const inserted: Record<string, unknown> = { id: "sub-123", status: "received" };
  return {
    from: () => ({
      insert: () => ({ select: () => ({ single: async () => ({ data: { id: "sub-123", created_at: "now", status: "received", file_path: null, file_mime: null, result: null, delete_after: "later" }, error: null }) }) }),
      update: () => ({ eq: async () => ({ error: null }) }),
    }),
    storage: { from: () => ({ upload: async () => ({ error: null }) }) },
  } as any;
}

describe("POST /api/upload", () => {
  it("afviser når fil mangler", async () => {
    const app = createApp({ db: fakeDb(), billsBucket: "bills" });
    const res = await app.request("/api/upload", { method: "POST", body: new FormData() });
    expect(res.status).toBe(400);
  });

  it("afviser ikke-understøttet filtype", async () => {
    const app = createApp({ db: fakeDb(), billsBucket: "bills" });
    const fd = new FormData();
    fd.set("file", new File(["x"], "a.txt", { type: "text/plain" }));
    const res = await app.request("/api/upload", { method: "POST", body: fd });
    expect(res.status).toBe(415);
  });

  it("gemmer PDF og returnerer submissionId", async () => {
    const app = createApp({ db: fakeDb(), billsBucket: "bills" });
    const fd = new FormData();
    fd.set("file", new File(["%PDF-1.4"], "regning.pdf", { type: "application/pdf" }));
    const res = await app.request("/api/upload", { method: "POST", body: fd });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ submissionId: "sub-123", status: "received" });
  });

  it("health svarer ok", async () => {
    const app = createApp({ db: fakeDb(), billsBucket: "bills" });
    const res = await app.request("/health");
    expect(await res.json()).toEqual({ ok: true });
  });
});
```

- [ ] **Step 3: Kør testene og bekræft de fejler**

Run: `npm test -- src/http/app.test.ts`
Expected: FAIL (modul mangler).

- [ ] **Step 4: Implementer app.ts**

```ts
// src/http/app.ts
import { Hono } from "hono";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSubmission, setSubmissionFile } from "../db/submissions.js";
import { uploadBill } from "../storage/bills.js";

const ALLOWED_MIME = new Set(["application/pdf", "image/jpeg", "image/png", "image/heic", "image/webp"]);

export function createApp(deps: { db: SupabaseClient; billsBucket: string }): Hono {
  const app = new Hono();

  app.get("/health", (c) => c.json({ ok: true }));

  app.post("/api/upload", async (c) => {
    const form = await c.req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return c.json({ error: "Fil mangler" }, 400);
    if (!ALLOWED_MIME.has(file.type)) return c.json({ error: `Ikke-understøttet filtype: ${file.type}` }, 415);

    const submission = await createSubmission(deps.db, {});
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { path } = await uploadBill(deps.db, deps.billsBucket, {
      submissionId: submission.id,
      bytes,
      mime: file.type,
    });
    await setSubmissionFile(deps.db, submission.id, path, file.type);

    return c.json({ submissionId: submission.id, status: "received" });
  });

  return app;
}
```

- [ ] **Step 5: Implementer index.ts**

```ts
// src/index.ts
import { serve } from "@hono/node-server";
import { loadConfig } from "./config.js";
import { createDb } from "./db/client.js";
import { createApp } from "./http/app.js";

const cfg = loadConfig(process.env);
const db = createDb(cfg);
const app = createApp({ db, billsBucket: cfg.billsBucket });

const port = Number(process.env.PORT ?? 8787);
serve({ fetch: app.fetch, port });
console.log(`Regningstjekker backend kører på :${port}`);
```

- [ ] **Step 6: Kør testene og bekræft de passerer**

Run: `npm test -- src/http/app.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 7: Commit**

```bash
git add Regningstjekker/src/http/app.ts Regningstjekker/src/index.ts Regningstjekker/src/http/app.test.ts Regningstjekker/package.json Regningstjekker/package-lock.json
git commit -m "feat(regningstjekker): upload-intake route + server-entry"
```

---

### Task 12: Retention-job (GDPR — auto-sletning efter 90 dage)

**Files:**
- Create: `Regningstjekker/src/retention/cleanup.ts`
- Create: `Regningstjekker/src/retention/cleanup-cli.ts`
- Test: `Regningstjekker/src/retention/cleanup.test.ts`

**Interfaces:**
- Consumes: `deleteBill` (Task 9).
- Produces:
  - `findExpired(deps: { listExpired: () => Promise<{ id: string; filePath: string | null }[]> }): Promise<{ id: string; filePath: string | null }[]>`.
  - `cleanupExpired(deps: { listExpired: () => Promise<{ id: string; filePath: string | null }[]>; deleteFile: (path: string) => Promise<void>; deleteRow: (id: string) => Promise<void> }): Promise<{ deleted: number }>`.

- [ ] **Step 1: Skriv den fejlende test**

```ts
// src/retention/cleanup.test.ts
import { describe, it, expect, vi } from "vitest";
import { cleanupExpired } from "./cleanup.js";

describe("cleanupExpired", () => {
  it("sletter fil + række for udløbne, springer null-fil over", async () => {
    const listExpired = vi.fn(async () => [
      { id: "a", filePath: "a/original" },
      { id: "b", filePath: null },
    ]);
    const deleteFile = vi.fn(async () => {});
    const deleteRow = vi.fn(async () => {});

    const res = await cleanupExpired({ listExpired, deleteFile, deleteRow });

    expect(deleteFile).toHaveBeenCalledOnce();
    expect(deleteFile).toHaveBeenCalledWith("a/original");
    expect(deleteRow).toHaveBeenCalledTimes(2);
    expect(res.deleted).toBe(2);
  });
});
```

- [ ] **Step 2: Kør testen og bekræft den fejler**

Run: `npm test -- src/retention/cleanup.test.ts`
Expected: FAIL (modul mangler).

- [ ] **Step 3: Implementer cleanup.ts**

```ts
// src/retention/cleanup.ts
export interface ExpiredRow {
  id: string;
  filePath: string | null;
}

export async function findExpired(deps: {
  listExpired: () => Promise<ExpiredRow[]>;
}): Promise<ExpiredRow[]> {
  return deps.listExpired();
}

export async function cleanupExpired(deps: {
  listExpired: () => Promise<ExpiredRow[]>;
  deleteFile: (path: string) => Promise<void>;
  deleteRow: (id: string) => Promise<void>;
}): Promise<{ deleted: number }> {
  const expired = await deps.listExpired();
  let deleted = 0;
  for (const row of expired) {
    if (row.filePath) await deps.deleteFile(row.filePath);
    await deps.deleteRow(row.id);
    deleted++;
  }
  return { deleted };
}
```

- [ ] **Step 4: Kør testen og bekræft den passerer**

Run: `npm test -- src/retention/cleanup.test.ts`
Expected: PASS.

- [ ] **Step 5: Skriv cleanup-cli.ts (rigtig kørsel)**

```ts
// src/retention/cleanup-cli.ts
import { loadConfig } from "../config.js";
import { createDb } from "../db/client.js";
import { deleteBill } from "../storage/bills.js";
import { cleanupExpired } from "./cleanup.js";

async function main() {
  const cfg = loadConfig(process.env);
  const db = createDb(cfg);

  const res = await cleanupExpired({
    listExpired: async () => {
      const { data, error } = await db
        .from("submissions")
        .select("id, file_path")
        .lt("delete_after", new Date().toISOString());
      if (error) throw new Error(error.message);
      return (data ?? []).map((r) => ({ id: r.id as string, filePath: (r.file_path as string) ?? null }));
    },
    deleteFile: (path) => deleteBill(db, cfg.billsBucket, path),
    deleteRow: async (id) => {
      const { error } = await db.from("submissions").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
  });
  console.log(`Retention: slettede ${res.deleted} udløbne indsendelser.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

- [ ] **Step 6: Commit**

```bash
git add Regningstjekker/src/retention/cleanup.ts Regningstjekker/src/retention/cleanup-cli.ts Regningstjekker/src/retention/cleanup.test.ts
git commit -m "feat(regningstjekker): GDPR retention-job (auto-sletning efter 90 dage)"
```

---

### Task 13: README, drift & cron

**Files:**
- Create: `Regningstjekker/README.md`

**Interfaces:**
- Consumes: alt ovenstående.
- Produces: dokumentation til at køre lokalt, køre sync/retention, og opsætte cron. Ingen kode.

- [ ] **Step 1: Skriv README.md**

````markdown
# Regningstjekker — backend (Fase 1)

Sikker backend + beregningsmotor for Altid Energis regningstjekker.
Spec: `docs/superpowers/specs/2026-09-21-regningstjekker-design.md`.

## Opsætning
1. `cd Regningstjekker && npm install`
2. Kopier `.env.example` → `.env` og udfyld (se `db/README.md` for Supabase).
3. Kør DB-skema (`db/schema.sql`) og opret privat `bills`-bucket i Supabase.

## Kør
- Tests: `npm test` (unit-tests kører altid; integrationstests kræver `.env`).
- Server: `node --env-file=.env node_modules/.bin/tsx src/index.ts`
- Prissync: `npm run sync` (hent med `.env`: `node --env-file=.env ...`)
- Retention: `npm run retention`

## Cron (produktion)
- **Sync** dagligt (fx 04:00): kør `sync-cli`. Anbefaling: skaf Strømligning
  API-nøgle for at undgå 40-min throttling (rate limit uden nøgle = 5-10 kald/15 min).
- **Retention** dagligt (fx 03:00): kør `cleanup-cli`.
- Kan køres via Supabase scheduled functions, en cron på en billig host, eller
  GitHub Actions (schedule) med secrets.

## Sikkerhed
- `service_role`-nøgle kun server-side. RLS er slået til; kun service-role
  tilgår data. `bills`-bucket er privat; filer tilgås via korttids-signed URLs.
- Retention: 90 dage (`RETENTION_DAYS`).
````

- [ ] **Step 2: Kør hele testsuiten som helhedstjek**

Run: `cd Regningstjekker && npm test`
Expected: alle unit-tests PASS; integrationstests PASS hvis `.env` er sat, ellers skipped.

- [ ] **Step 3: Commit**

```bash
git add Regningstjekker/README.md
git commit -m "docs(regningstjekker): README med drift, cron og sikkerhed"
```

---

## Self-Review (udført)

**Spec-dækning (Fase 1-relevant):**
- Sikker backend/DB/RLS → Task 5, 6, 10. ✓
- Krypteret fil-lagring + upload → Task 9, 11. ✓
- GDPR retention 90 dage → Task 5 (default), 12. ✓
- Strømligning-sync (cache dagligt, rate-limit-throttling, ingen persondata sendt) → Task 3, 7. ✓
- Beregningsmotor (totalCost-model, aldrig regningens sum, ekstrapolation) → Task 4, 8. ✓
- "Aldrig gæt" ved manglende data → Task 8 (eksplicit `ok:false`). ✓
- Secrets server-side, `.env` ignoreret → Task 1, 2. ✓
- Udtræks-skema/vision, kundeflow, admin-dashboard, Klaviyo → **Plan 2/3** (bevidst uden for denne plan).

**Placeholder-scan:** ingen TBD/TODO; alle kode-steps har rigtig kode. ✓

**Type-konsistens:** `CachedProduct`/`CachedPoint` bruges ens i Task 4/6/8; `PriceRow` ens i Task 6/7; `Submission`-felter ens i Task 10/11. ✓

**Note om ekstern afhængighed:** Integrationstests (Task 6, 9, 10) kræver et Supabase dev-projekt via `.env`; de springes automatisk over uden env (`describe.runIf`). Task 7's rigtige sync og Task 5's skema er manuelle infrastruktur-trin markeret som sådan.
