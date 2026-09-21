import { loadConfig } from "../config.js";
import { createStromligningClient } from "./client.js";
import { createDb } from "../db/client.js";
import { upsertPriceRows } from "../db/priceCache.js";
import { syncPrices } from "./sync.js";

async function main() {
  const cfg = loadConfig(process.env);
  const client = createStromligningClient({
    baseUrl: cfg.stromligningBaseUrl,
    apiKey: cfg.stromligningApiKey,
  });
  const db = createDb(cfg);
  // Uden API-nøgle: sæt delay for at respektere rate limit (5-10 kald/15 min).
  const delayMs = cfg.stromligningApiKey ? 500 : 120_000;
  const res = await syncPrices({ client, upsert: (rows) => upsertPriceRows(db, rows), delayMs });
  console.log(`Sync færdig: ${res.rowsWritten} rækker skrevet.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
