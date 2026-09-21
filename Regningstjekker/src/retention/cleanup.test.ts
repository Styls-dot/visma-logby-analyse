import { describe, it, expect, vi } from "vitest";
import { cleanupExpired } from "./cleanup.js";

describe("cleanupExpired", () => {
  it("sletter fil + række for udløbne, springer null-fil over", async () => {
    const listExpired = vi.fn(async () => [
      { id: "a", filePath: "a/original" },
      { id: "b", filePath: null },
    ]);
    const order: string[] = [];
    const deleteFile = vi.fn(async () => {
      order.push("file");
    });
    const deleteRow = vi.fn(async () => {
      order.push("row");
    });

    const res = await cleanupExpired({ listExpired, deleteFile, deleteRow });

    // Existing assertions
    expect(deleteFile).toHaveBeenCalledOnce();
    expect(deleteFile).toHaveBeenCalledWith("a/original");
    expect(deleteRow).toHaveBeenCalledTimes(2);
    expect(res.deleted).toBe(2);

    // GDPR invariant: file deleted before row (prevents orphaned file references)
    expect(order).toEqual(["file", "row", "row"]);
  });
});
