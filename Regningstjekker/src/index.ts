import { serve } from "@hono/node-server";
import { loadConfig } from "./config.js";
import { createDb } from "./db/client.js";
import { createApp } from "./http/app.js";

const cfg = loadConfig(process.env);
const db = createDb(cfg);
const app = createApp({ db, billsBucket: cfg.billsBucket });

const port = Number(process.env.PORT ?? 8787);
serve({ fetch: app.fetch, port });
console.log(`Regningstjekker backend kører på :${port}`);
