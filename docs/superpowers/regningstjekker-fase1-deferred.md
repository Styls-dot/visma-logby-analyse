# Regningstjekker Fase 1 — udskudte punkter til Plan 2

Fase 1 (backend-fundament & beregningsmotor) er komplet og merge-klar. Slut-reviewet
(Opus, whole-branch) fandt **0 Critical**; kernen (ærlig besparelsesmatematik, zod-boundary-
validering, RLS, file-før-row GDPR-sletning) er solid, og "aldrig et forkert tal"-invarianten
holder på alle stier. To MUST-FIX + to hærdninger blev udbedret før merge. Nedenstående er
bevidst udskudt til Plan 2 (læsning/vision, kundeflow, admin) — alle fejler sikkert (aldrig et
forkert tal), ingen er blokerende.

## Reelle domæne-fund (fra validering mod rigtige Strømligning-data)
- **Produkt-id'er pr. forbrugsbånd:** Altids produkter har bånd-suffiks (`altid-energi_5000`,
  `altid-energi_8000`), og nogle produkter optræder kun i visse forbrugs-buckets. Strømligning
  modellerer prisniveauer pr. forbrug. Beregningsmotoren håndterer få-punkts-produkter (konstant),
  men **valg af kundens nuværende produkt + sammenlignelig Altid-tarif og interpolations-præcision
  skal forfines i Plan 2**, så vi altid sammenligner mod det rette bånd.
- Overvej en ende-til-ende integrationstest "estimateSavings over rigtige cachede rækker" i Plan 2.

## Robusthed / hygiejne (deferred)
- **Tom submissions-række ved delvis intake-fejl:** hvis `setSubmissionFile` fejler efter upload,
  slettes filen nu (Fix C), men den tomme række består (fanges af 90-dages retention). Ryd evt.
  rækken op med i catch'en i Plan 2.
- **Upload-endpoint:** har nu 10MB-grænse (413), men **ingen auth/rate-limiting** — tilføj før
  widget'en gøres offentlig i Plan 2/3.
- **`getCachedProduct` → tom `points`:** et produkt hvor alle buckets har null total_cost giver
  `points: []`, hvilket får `interpolateTotalCost` til at kaste. Fejler loud (aldrig forkert tal);
  tilføj evt. `points.length === 0 → null`-guard så fejlen bliver typet.
- **Strømligning-klient:** ingen fetch-timeout/AbortController (ok for cron; tilføj hvis den nogensinde
  kaldes i en request-sti). Manglende error-path-test for `findSupplierByPostalCode` + auth-header-test.

## Drift / deploy (før go-live)
- **API-nøgle fra Strømligning:** stærkt anbefalet — uden nøgle throttler sync ~180s/kald (~1t for
  fuld sync) pga. rate limit 5-10/15min. Skaf også skriftlig kommerciel aftale (CC BY-NC).
- **service_role-nøgle:** blev delt i chat under opsætning → **rullér den i Supabase før go-live**.
- **Node/websocket:** Supabase-klienten kræver `NODE_OPTIONS="--experimental-websocket"` på Node 20
  (Node 22+ har native WebSocket). Sæt det i cron/host-miljøet.
- **npm audit:** dev-only vitest-transitive sårbarheder (kræver breaking upgrade) — opgradér vitest
  når muligt. **tsconfig** kompilerer testfiler ind i `dist/` — tilføj `exclude` for `*.test.ts` før
  prod-build, og bekræft `tsx` er tilgængelig i deploy-target.

## Kosmetisk
- README har en lille redundans mellem "Persondata"- og "bills-bucket"-punkterne.
- Nogle fejlbeskeder viser "undefined" i sjældne error-null-grene (submissions/bills).
