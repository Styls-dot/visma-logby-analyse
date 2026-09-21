# Regningstjekker — backend (Fase 1)

Sikker backend + beregningsmotor for Altid Energis regningstjekker.
Spec: `docs/superpowers/specs/2026-09-21-regningstjekker-design.md`.

## Opsætning
1. `cd Regningstjekker && npm install`
2. Kopier `.env.example` → `.env` og udfyld (se `db/README.md` for Supabase).
3. Kør DB-skema (`db/schema.sql`) og opret privat `bills`-bucket i Supabase.

## Kør

### Tests
```bash
npm test
```
Unit-tests kører altid; integrationstests kræver `.env` og springes automatisk over uden den.

**Note:** Node 20 kræver websocket-flag. For integrationstests kan du køre:
```bash
NODE_OPTIONS="--experimental-websocket" node --env-file=.env node_modules/.bin/vitest run <file>
```
Plain `npm test` kører kun unit-tests. Node 22+ har native WebSocket og behøver ikke flaget.

### Server
```bash
NODE_OPTIONS="--experimental-websocket" node --env-file=.env node_modules/.bin/tsx src/index.ts
```

### Prissync
```bash
npm run sync
```
For at køre med `.env`:
```bash
NODE_OPTIONS="--experimental-websocket" node --env-file=.env node_modules/.bin/tsx src/cli/sync-cli.ts
```

**Vigtigt:** Strømligning API har rate limit på 5-10 kald/15 min uden API-nøgle. Det betyder ~40 min throttling pr. batch under fuld sync. Stærk anbefaling: skaf en API-nøgle for at undgå langsomhed. Med nøgle henter hele 20-bucket-synken på få minutter.

### Retention (GDPR auto-sletning)
```bash
npm run retention
```
For at køre med `.env`:
```bash
NODE_OPTIONS="--experimental-websocket" node --env-file=.env node_modules/.bin/tsx src/cli/cleanup-cli.ts
```

Sletter regninger ældre end 90 dage (`RETENTION_DAYS` i env).

## Cron (produktion)

Både sync og retention bør køres dagligt:

- **Sync** dagligt (fx 04:00): kør sync-cli. Anbefaling: skaf Strømligning API-nøgle for at undgå 40-min throttling.
- **Retention** dagligt (fx 03:00): kør cleanup-cli.

### Implementeringsmuligheder
- Supabase scheduled functions (built-in, kræver js-payload)
- Cron på en billig host (fx Railway, Render, en billig VPS)
- GitHub Actions (schedule) med secrets for `.env`-variabler

## Sikkerhed

- **`service_role`-nøgle:** Kun server-side (i `.env`, som er git-ignored). RLS er slået til; kun service-role tilgår data direkte. Hvis nøglen nogensinde blev delt, rotér den i Supabase før go-live.
- **`bills`-bucket:** Privat; filer tilgås via korttids-signed URLs genereret af serveren.
- **Retention:** 90 dage (`RETENTION_DAYS` env-var); auto-delete via retention-cron sikrer GDPR-overholdelse.
- **Persondata:** Ingen persondata sendes til Strømligning API'et (kun forbrug + region). Regninger ligger i privat bucket og tilgås via korttids-signed URLs.

## Env-variabler

Se `.env.example` for template. Påkrævede:
- `SUPABASE_URL`: Projekts API-URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key (ALDRIG delt)
- `STROMLIGNING_API_KEY`: (valgfrit, men stærkt anbefalet for Strømligning-sync)
- `RETENTION_DAYS`: Antal dage før regninger slettes (default: 90)

## Fejlfinding

### Integration test springes over
Hvis integration tests springer over uden fejl, mangler `.env`. Kopier `.env.example` → `.env` og tilføj Supabase-info.

### Websocket-fejl i Node 20
Hvis du får websocket-fejl ved sync/retention/tests, kør med `NODE_OPTIONS="--experimental-websocket"` og `node --env-file=.env`.

### Strømligning throttling
Uden API-nøgle er sync langsom (~1 time for hele 20-bucket-sættet). Skaf en nøgle via [stromligning.dk](https://stromligning.dk).
