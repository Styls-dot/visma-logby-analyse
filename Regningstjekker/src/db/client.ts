import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Config } from "../config.js";

export function createDb(config: Config): SupabaseClient {
  return createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: { persistSession: false },
  });
}
