# Database-opsætning

1. Opret et Supabase-projekt på https://supabase.com (gratis tier).
2. SQL Editor → indsæt `schema.sql` → Run.
3. Storage → Create bucket → navn `bills`, **Public: OFF** (privat).
4. Project Settings → API → kopier `Project URL` og `service_role`-nøglen til `.env`
   (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`). service_role-nøglen er hemmelig
   og må ALDRIG i frontend eller git.
