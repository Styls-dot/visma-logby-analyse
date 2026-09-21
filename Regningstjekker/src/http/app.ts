import { Hono } from "hono";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSubmission, setSubmissionFile } from "../db/submissions.js";
import { uploadBill, deleteBill } from "../storage/bills.js";

const ALLOWED_MIME = new Set(["application/pdf", "image/jpeg", "image/png", "image/heic", "image/webp"]);
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export function createApp(deps: { db: SupabaseClient; billsBucket: string; retentionDays: number }): Hono {
  const app = new Hono();

  app.get("/health", (c) => c.json({ ok: true }));

  app.post("/api/upload", async (c) => {
    const form = await c.req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return c.json({ error: "Fil mangler" }, 400);
    if (!ALLOWED_MIME.has(file.type)) return c.json({ error: `Ikke-understøttet filtype: ${file.type}` }, 415);
    if (file.size > MAX_UPLOAD_BYTES) return c.json({ error: "Filen er for stor" }, 413);

    const submission = await createSubmission(deps.db, { retentionDays: deps.retentionDays });
    const bytes = new Uint8Array(await file.arrayBuffer());

    let path: string | undefined;
    try {
      const uploaded = await uploadBill(deps.db, deps.billsBucket, {
        submissionId: submission.id,
        bytes,
        mime: file.type,
      });
      path = uploaded.path;
      await setSubmissionFile(deps.db, submission.id, path, file.type);
    } catch (err) {
      if (path) {
        await deleteBill(deps.db, deps.billsBucket, path).catch(() => {});
      }
      throw err;
    }

    return c.json({ submissionId: submission.id, status: "received" });
  });

  return app;
}
