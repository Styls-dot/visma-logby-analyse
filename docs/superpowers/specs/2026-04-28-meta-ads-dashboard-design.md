# Meta Ads Dashboard — Design

**Dato:** 2026-04-28
**Ejer:** Mikkel Stylsvig (marketing/ops, Altid Energi)
**Status:** Design — afventer review

## Formål

Bygge et selv-opdaterende dagligt dashboard over Altid Energis Meta-annoncedata, så marketing-teamet kan se performance på tværs af kampagne/annoncesæt/annonce-niveau uden manuelt arbejde. Dashboardet skal også flagge automatisk opdagede problemer og skaleringsmuligheder.

## Mål og succes-kriterier

- Spend og CPA (cost per Purchase-event) er synlige hver morgen kl. 07:00 dansk tid uden brugerintervention.
- Dashboardet viser data på alle tre Meta-niveauer (kampagne, annoncesæt, annonce).
- Regel-baserede "quick fixes" flagges automatisk i dashboardet (CPA-outliers, frequency-fatigue, paused-but-spending, top-performers).
- Strategiske anbefalinger leveres on-demand via Claude Code-samtaler (ikke automatiseret — bruger spørger når det er relevant).
- Drift-omkostning: 0 kr/måned.
- Engangs-setup tid for brugeren: ≤15 minutter.

## Ikke-mål (YAGNI)

- Ingen integration med månedsrapporten (`Marketingrapport_v2.xlsx`) i denne iteration. Kan tilføjes senere.
- Ingen creative thumbnails eller visuel preview ud over et URL-link.
- Ingen demografi/placement breakdowns i denne iteration.
- Ingen retroaktiv backfill af historik — historik bygges fra dagen scriptet starter.
- Ingen automatiserede Meta-actions (pause, justér budget). Dashboardet er read-only mod Meta.
- Ingen multi-bruger auth — én Meta system user-token deles via Sheet's egen access control.

## Arkitektur

```
┌─────────────────────────────────┐
│ Meta Marketing API              │
│ (graph.facebook.com/v22.0)      │
└─────────────┬───────────────────┘
              │ HTTPS, system user token
              ▼
┌─────────────────────────────────┐
│ Google Apps Script              │
│ (container-bound til Sheet)     │
│ ┌─────────────────────────────┐ │
│ │ Main.gs    — orchestration  │ │
│ │ MetaAPI.gs — API client     │ │
│ │ Sheet.gs   — write helpers  │ │
│ │ Rules.gs   — quick-fix logik│ │
│ │ Setup.gs   — first-run flow │ │
│ │ Config.gs  — konstanter     │ │
│ └─────────────────────────────┘ │
│   Trigger: dagligt kl. 07:00    │
└─────────────┬───────────────────┘
              │ skriver
              ▼
┌─────────────────────────────────┐
│ Google Sheet                    │
│ "Altid Energi — Meta Dashboard" │
│ ┌─────────────────────────────┐ │
│ │ 📊 Overblik                 │ │
│ │ 🎯 Kampagner                │ │
│ │ 📦 Annoncesæt               │ │
│ │ 🖼️  Annoncer                 │ │
│ │ 💡 Anbefalinger             │ │
│ │ 📈 Historik                 │ │
│ │ ⚙️  Log                      │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
              │ on-demand
              ▼
┌─────────────────────────────────┐
│ Claude Code (manuel session)    │
│ Læser Sheet → strategiske       │
│ anbefalinger til brugeren       │
└─────────────────────────────────┘
```

## Komponenter

### 1. Google Sheet med 7 faner

| Fane | Type | Opdateres | Indhold |
|---|---|---|---|
| 📊 Overblik | Snapshot | Dagligt (overskriv) | KPI-kort: spend i dag/i går/7d/30d, CPA samme periode, simpel sparkline-graf for spend+CPA sidste 30 dage |
| 🎯 Kampagner | Snapshot | Dagligt (overskriv) | Én række pr. kampagne. Kolonner: ID, navn, status, objective, spend (i dag/7d/30d), purchases (7d/30d), CPA (7d/30d), CPM, CTR, link-klik, frequency |
| 📦 Annoncesæt | Snapshot | Dagligt (overskriv) | Samme metric-kolonner + parent campaign |
| 🖼️ Annoncer | Snapshot | Dagligt (overskriv) | Samme metric-kolonner + parent ad set + thumbnail-URL |
| 💡 Anbefalinger | Snapshot | Dagligt (overskriv) | Regel-baserede flag, sorteret 🔴→🟡→🟢. Kolonner: prioritet, niveau, navn, problem, foreslået action |
| 📈 Historik | Append-only | Dagligt (tilføj) | Én række pr. dag pr. niveau. Til trendgrafer ovenpå |
| ⚙️ Log | Append-only | Dagligt (tilføj) | Tidsstempel, varighed, antal rows, status, evt. fejl |

**Periodelogik:**
- "I dag" markeres med `*` i header (data stadig i bevægelse)
- "I går" er stabilt
- 7d og 30d er rullende vinduer der ender ved i går (stabile)

### 2. Apps Script-projekt (container-bound til Sheet'et)

#### `Config.gs`
Konstanter, ingen logik:
- API-endpoints og version (`graph.facebook.com/v22.0`)
- Sheet-fanenavne
- Quick-fix regel-tærskler (CPA-multiplikator, frequency-loft, CTR-faldsprocent)
- Trigger-tidspunkt (07:00 Europe/Copenhagen)

#### `MetaAPI.gs`
Tynd wrapper om Meta Graph API:
- `fetchAccountInsights(timeRange)` → konto-niveau metrics
- `fetchCampaigns()`, `fetchAdSets()`, `fetchAds()` → metadata + insights
- `_request(endpoint, params)` → fælles HTTP-helper med error handling og retry-logik (max 2 retries, exponential backoff)
- Læser token via `PropertiesService.getScriptProperties()`

#### `Sheet.gs`
Sheet-skrive-helpers:
- `clearAndWrite(sheetName, headers, rows)` → ryd og overskriv (bruges til snapshots)
- `appendRows(sheetName, rows)` → tilføj nederst (bruges til Historik + Log)
- `formatHeaders(sheetName)` → bold + frosne rækker + farvekoder
- `getOrCreateSheet(name)` → idempotent fane-oprettelse

#### `Rules.gs`
Quick-fix regelsæt. Hver regel returnerer en liste af `{prioritet, niveau, id, navn, problem, action}`-objekter:
- `cpaOutlier(items, accountAvg)` — CPA > 3x → 🔴, > 2x → 🟡
- `frequencyFatigue(items)` — frequency > 4 og CTR-fald > 30% sidste 7d → 🟡
- `spendSpikeWithoutPurchases(items)` — spend > 3x normal og 0 purchases i dag → 🟡
- `pausedButSpending(items)` — status=PAUSED men spend i dag > 0 → 🔴
- `topPerformer(items, accountAvg)` — CPA < 50% af gennemsnit → 🟢 (skalér-forslag)

#### `Main.gs`
Orchestration — kaldes af triggeren:
1. `dailyRun()` — top-level entry point
2. Kalder MetaAPI for hvert niveau
3. Beregner afledte tal (CPA, gennemsnit, afvigelser)
4. Skriver via Sheet.gs
5. Kører Rules.gs og skriver flag til Anbefalinger
6. Logger resultat
7. Hvis fejl: `MailApp.sendEmail()` til Sheet-ejer

#### `Setup.gs`
Førstegangs-setup — kaldes manuelt af brugeren:
1. `setup()` — UI-prompts via `Browser.inputBox()` / `SpreadsheetApp.getUi().prompt()`:
   - Bed om Meta access token
   - Bed om Ad Account ID
2. Validér via test-kald til Meta API (`/me/adaccounts`)
3. Gem i `PropertiesService.getScriptProperties()`
4. Opret daglig trigger via `ScriptApp.newTrigger('dailyRun').timeBased().atHour(7).everyDays(1)`
5. Kør `dailyRun()` straks som første kørsel
6. Vis success-besked med link til Overblik-fanen

`onOpen()` — installable trigger der tilføjer custom menu:
- Meta Dashboard → Setup (første gang)
- Meta Dashboard → Opdater nu (manuel kørsel)
- Meta Dashboard → Vis log

### 3. On-demand strategiske anbefalinger via Claude Code

Ikke en del af Apps Script. Workflow:
1. Bruger åbner Claude Code-session
2. Beder om "kig på Meta-dashboard og giv strategiske anbefalinger"
3. Claude læser Sheet via Google Drive MCP
4. Skriver prioriteret analyse + næste-uges-plan i samtalen

## Data flow (daglig kørsel)

```
07:00 trigger
  ↓
Læs token + accountID fra Properties
  ↓
For hvert tidsinterval [today, yesterday, last_7d, last_30d]:
  ├─ Hent konto-insights
  └─ Cache resultater
  ↓
Hent kampagner (alle non-deleted) + insights for last_7d, last_30d
Hent annoncesæt (samme)
Hent annoncer (samme + thumbnail)
  ↓
Beregn afledte:
  ├─ CPA = spend / purchases (per niveau, per periode)
  ├─ Konto-gennemsnit-CPA (vægtet på spend)
  └─ % afvigelser fra gennemsnit
  ↓
Skriv snapshots til Overblik / Kampagner / Annoncesæt / Annoncer
  ↓
Append én række pr. niveau til Historik
  ↓
Kør Rules.gs på alle items → byg Anbefalinger-rækker
Skriv til Anbefalinger (ryd og overskriv)
  ↓
Append succes-log
  ↓
Done
```

Ved fejl: catch i `Main.dailyRun()` → log fejl → email bruger.

## Error handling

- **Token ugyldig/udløbet:** Email bruger med klart "Action required: regenér Meta-token". Log fejl, men crash ikke trigger (så Apps Script ikke disabler den).
- **Rate limit (uventet):** Exponential backoff 2x, derefter log og fortsæt med næste niveau.
- **Tom data (ingen kampagner returneret):** Log warning, skriv "ingen data" i fanen, fortsæt.
- **Sheet-skrivefejl:** Log, send email, abort (ikke meningsfuldt at fortsætte).
- **Google quota:** Apps Script har 6 min execution limit. Designet bruger ~30-60s, så masser af buffer.

## Sikkerhed

- **Token-opbevaring:** `PropertiesService.getScriptProperties()` — krypteret, kun synlig for Sheet-ejere/editors med Apps Script-adgang.
- **Sheet-deling:** Brugeren bestemmer. Anbefales: kun ham selv som ejer, evt. læseadgang til kollegaer.
- **System user-token:** Tildeles kun ad account-adgang (read), ikke business-bredt. Kan revokes på 30s ved lækage.
- **Ingen secrets i kode** — al konfiguration via Properties.
- **Log-fanen** indeholder ikke følsomme data (kun tidsstempler, antal rows, fejlbeskeder uden token).

## Test-plan

**Smoke-test ved første setup:**
- Setup-wizard validerer token via `/me/adaccounts` før gemning
- Første `dailyRun()` skal complete uden fejl og fylde alle faner

**Manuel verifikation:**
- "Opdater nu"-menu kører ad-hoc kørsel
- Log-fane skal vise success efter første kørsel
- Stikprøve: Overblik-tal skal matche Meta Ads Manager (samme dato-vinduer)

**Edge-cases at teste:**
- Konto med 0 aktive kampagner (skal stadig skrive headers + "ingen data")
- Annonce uden purchases i perioden (CPA = N/A, ikke division-by-zero)
- Token-revoke mens scriptet kører (skal email bruger)

**Ingen automatiserede tests** — Apps Script-projekter har dårlig test-infrastruktur, og scope er lille nok til at manuel test rækker.

## Setup-trin (engangs)

### Hos Meta Business Manager (~5 min)
1. business.facebook.com → Business Settings → Users → System Users → Add
2. Navn: "Altid Energi Reporting Bot", rolle: Employee
3. Tildel ad account-adgang (read)
4. Generér token med scopes: `ads_read`, `business_management`
5. Kopiér token + Ad Account ID (`act_XXXXXXXXX` fra Ads Manager URL)

### Hos Google (~5 min, automatiseret hvor muligt)
1. Claude opretter et nyt Sheet via Drive MCP: "Altid Energi — Meta Dashboard"
2. Bruger åbner Sheet → Extensions → Apps Script
3. Bruger paster Claude's kode (alle .gs-filer)
4. Bruger klikker Run → Setup → giver auth-permissions første gang
5. Indtaster token + Ad Account ID i prompts
6. Setup validerer, gemmer, opretter trigger, kører første gang

### Verifikation (~2 min)
- Tjek Overblik-fanen er fyldt
- Tjek Log-fanen viser success
- Bekræft trigger er aktiv (Apps Script → Triggers)

## Open questions / antagelser

- **Antagelse:** `Purchase`-eventet er det relevante konverterings-event (brugeren bekræftede det). Verificeres ved første setup ved at tjekke om der er purchases i kontoen seneste 30d.
- **Antagelse:** Brugeren har admin-rettigheder i Business Manager til at oprette system user. Hvis ikke, kan vi falde tilbage til en standard user-token (kortere levetid, kræver fornyelse hver 60 dage).
- **Open:** Skal trigger-tidspunktet være konfigurerbart via en celle i Sheet'et, eller hardcoded? Vi går med hardcoded 07:00 for simplicitet — kan ændres i koden hvis nødvendigt.

## Næste skridt

Efter spec-godkendelse → invokér `superpowers:writing-plans` for at producere step-by-step implementeringsplan med konkrete kodefiler.
