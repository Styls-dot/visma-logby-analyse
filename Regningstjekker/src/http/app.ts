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
