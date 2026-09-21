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
