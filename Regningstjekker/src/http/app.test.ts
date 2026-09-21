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
