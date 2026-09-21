import { describe, it, expect, beforeAll } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { loadConfig } from "../config.js";
import { createDb } from "../db/client.js";
import { uploadBill, getSignedBillUrl, deleteBill } from "./bills.js";

const hasEnv = !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY;

describe.runIf(hasEnv)("bills storage (integration)", () => {
  // NB: config/client oprettes i beforeAll, ikke i selve describe-kroppen.
  // Vitest kalder describe-kroppen under collection uanset runIf-resultatet,
  // så loadConfig() direkte her ville kaste og fejle "npm test" når .env
  // ikke er indlæst. beforeAll-hooks køres derimod ikke for en sprunget suite.
  let cfg: ReturnType<typeof loadConfig>;
  let db: SupabaseClient;

  beforeAll(() => {
    cfg = loadConfig(process.env);
    db = createDb(cfg);
  });

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
