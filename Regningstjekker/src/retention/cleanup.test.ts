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
