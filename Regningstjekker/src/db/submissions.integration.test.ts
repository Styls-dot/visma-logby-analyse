import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { loadConfig } from "../config.js";
import { createDb } from "./client.js";
import { createSubmission, setSubmissionFile, getSubmission, listSubmissions } from "./submissions.js";

const hasEnv = !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY;

describe.runIf(hasEnv)("submissions (integration)", () => {
  // NB: config/client oprettes i beforeAll, ikke i selve describe-kroppen.
  // Vitest kalder describe-kroppen under collection uanset runIf-resultatet,
  // så loadConfig() direkte her ville kaste og fejle "npm test" når .env
  // ikke er indlæst. beforeAll-hooks køres derimod ikke for en sprunget suite.
  let db: SupabaseClient;
  const createdIds: string[] = [];

  beforeAll(() => {
    const cfg = loadConfig(process.env);
    db = createDb(cfg);
  });

  afterAll(async () => {
    for (const id of createdIds) {
      await db.from("submissions").delete().eq("id", id);
    }
  });

  it("opretter, sætter fil og henter en submission", async () => {
    const s = await createSubmission(db, {});
    createdIds.push(s.id);
    expect(s.id).toBeTruthy();
    expect(s.status).toBe("received");

    await setSubmissionFile(db, s.id, `${s.id}/original`, "application/pdf");
    const got = await getSubmission(db, s.id);
    expect(got!.filePath).toBe(`${s.id}/original`);

    const list = await listSubmissions(db, 5);
    expect(list.some((x) => x.id === s.id)).toBe(true);
  });

  it("respekterer eksplicit retentionDays ved oprettelse", async () => {
    const s = await createSubmission(db, { retentionDays: 30 });
    createdIds.push(s.id);

    const expected = Date.now() + 30 * 24 * 60 * 60 * 1000;
    const actual = new Date(s.deleteAfter).getTime();
    const toleranceMs = 24 * 60 * 60 * 1000;
    expect(Math.abs(actual - expected)).toBeLessThan(toleranceMs);
  });
});
