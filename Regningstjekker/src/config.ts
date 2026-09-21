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
