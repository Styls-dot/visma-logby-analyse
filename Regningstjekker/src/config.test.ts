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
