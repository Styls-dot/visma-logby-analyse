# Regningstjekker — designspec

**Dato:** 2026-09-21
**Ejer:** Mikkel (marketing/ops, Altid Energi)
**Status:** Til godkendelse

---

## 1. Formål

Et kundevendt værktøj på altidenergi.dk hvor en potentiel kunde uploader sin
nuværende elregning (fra et hvilket som helst dansk elselskab) og med det samme
får et **ærligt estimat på hvor meget de kan spare ved at skifte til Altid
Energi**. Bagved ligger en backend hvor alle uploads gemmes, kan gennemgås og
rettes, så systemet løbende kan læse en større andel af regninger korrekt.

Værktøjet **erstatter** den nuværende løsning (LeadDoubler + en ekstern
regningslæser der lander i et Excel-ark). To hovedproblemer skal løses:

1. **Coverage** — læse en markant højere % af regninger automatisk.
2. **Pris** — være markant billigere i drift.

### Ikke-mål (bevidst udeladt)

- Ikke en generel prissammenligning/topliste over alle selskaber. Fokus er
  Altid Energi vs. kundens nuværende selskab. (Kan tilføjes senere.)
- Ikke erhvervstunge scenarier (flere målere, komplekse erhvervstariffer) i
  første omgang — de håndteres som pæne kant-tilfælde.
- Ikke ændringer i FBS-signup-kernen. Konvertering sker ved at sende kunden
  videre til det eksisterende FBS-flow.

---

## 2. Hovedindsigt: den "ærlige" beregningsmodel

Fra Strømlignings API (`/api/companies`) får vi pr. produkt en `totalCost` samt
dens **komponenter**: `subscriptionMonthly`, `feesMonthly`,
`consumptionSurcharge` (kr/kWh), `fixedPrice`, `creationFee`.

`totalCost` er **selskabets egen del** af regningen (abonnement + gebyrer +
tillæg + evt. fast elpris). Spotpris, nettarif, systemtarif, distribution,
elafgift og moms er **ens uanset hvilket elselskab man vælger** for et givent
netområde og forbrug — de holdes derfor udenfor sammenligningen.

**Besparelse:**

```
besparelse_pr_år = nuværende_produkt.totalCost(forbrug, netområde)
                 − altid_energi_produkt.totalCost(forbrug, netområde)
```

Konsekvenser:

- Vi behøver **aldrig læse regningens samlede kr-beløb** (den skrøbelige del).
  Vi skal kun bruge: **postnummer**, **årligt forbrug (kWh)**, og **hvilket
  selskab/produkt kunden er på i dag**.
- Altid Energi ligger #9 ud af 216 produkter (bekræftet 2026-09-21, 4.000 kWh
  DK1: 173 kr/år for "Strøm til indkøbspris - 18 kr/md"), så besparelsen mod de
  fleste konkurrenter er reel og positiv.
- Er Altid Energi i et konkret tilfælde dyrere, vises det ærligt — vi lyver
  aldrig for at vise en besparelse.

---

## 3. Arkitektur (overblik)

Fem byggeklodser:

1. **Kundevendt widget** (statisk HTML/JS, indlejres på altidenergi.dk)
2. **Vision-læser** (Claude API læser alle filformater ens → struktureret JSON)
3. **Beregningsmotor** (regner lokalt på cachet Strømligning-data)
4. **Database + rettedashboard** (Supabase; login-beskyttet admin)
5. **Lead → Klaviyo** (valgfrit, med marketingsamtykke)

Plus to baggrundsjobs: **daglig Strømligning-sync** og **retention-sletning**.

### Stak

| Del | Teknologi | Begrundelse |
|-----|-----------|-------------|
| Backend + beregningsmotor | Node/TypeScript | Bygges i repoet; god til vision-kald + JSON |
| Database | Supabase Postgres (row-level security) | Sikker, driftet, gavmild gratis-tier |
| Fillagring (regninger) | Supabase Storage (krypteret, privat bucket) | Persondata beskyttet, adgang via signed URLs |
| Admin-auth | Supabase Auth | Login til rettedashboard |
| Vision-læsning | Claude API (vision) | Læser digital PDF, scannet PDF, foto, screenshot ens |
| Frontend-widget | Statisk HTML/JS | Kan indlejres; ingen tung build |
| Cron-jobs | Supabase scheduled functions / ekstern scheduler | Daglig sync + sletning |

Alle hemmeligheder (Claude-nøgle, Klaviyo-nøgle, evt. Strømligning-nøgle) er
**server-secrets** — aldrig i frontend.

---

## 4. Kundeflow

1. Kunde ser widget: "Upload din elregning og se hvad du kan spare."
2. Uploader PDF/foto/screenshot. Kort privatlivsnote vises. Strømligning-
   kildehenvisning synlig (licenskrav).
3. Backend læser regningen (få sekunder).
4. **Hvis læst sikkert →** vis estimatet **direkte** (intet bekræftelsestrin).
   På resultatskærmen vises de antagelser vi regnede på (fx "baseret på ~4.000
   kWh/år hos [selskab]") med et diskret **"passer det ikke? ret her"**-link —
   ikke-blokerende.
5. **Hvis IKKE læst sikkert (lav confidence / manglende felt) →** vis kun en
   lille formular for de manglende felter: selskab/produkt (dropdown fra
   Strømligning-data), postnummer, og/eller årsforbrug. Derefter vises estimatet.
6. **Resultat (gratis, uden login):** "Du betaler ca. X kr/år i
   selskabsomkostninger. Hos Altid Energi: ca. Y kr/år. Du kan spare ca.
   **Z kr/år**." Tydeligt mærket "estimat" med kort, ærlig forklaring på hvad
   der sammenlignes.
7. Valgfrit efter svar: **"Skift til Altid Energi"** (→ FBS-signup) og/eller
   "få rapporten på mail" + marketingsamtykke → Klaviyo.

---

## 5. Komponenter

### 5.1 Vision-læser
- **Gør:** modtager filen, sender til Claude med et fast promptskema, får
  struktureret JSON retur.
- **Output-skema = superset af den nuværende LeadDoubler/Peter-kontrakt** (se
  §5.7), så vores service kan være drop-in-erstatning. Kernefelter vi bruger til
  beregning: `SupplierName`, `Product`, `CustomerPostalCity` (→ postnr/region),
  `KwhUsage` (periodeforbrug), `AnnualConsumption` (årsforbrug),
  `InvoicePeriodStart/End`. Øvrige fee-felter udtrækkes også (billigt med vision)
  til admin-verifikation og evt. regnings-explainer.
- **Confidence:** returneres som i dag (float, fx 0.999) + pr.-felt-confidence
  til fallback-styring.
- **Afhænger af:** Claude API. Fejl/lav confidence → felter markeres som
  manglende (aldrig gæt).

### 5.7 Udtræks-skema (udgangspunkt fra det nuværende feltsæt)
Vi bygger vores **egen, standalone regningstjekker** — ingen integration med
eller afhængighed af LeadDoubler/Peter, og vi sender ingen data til dem. Men det
nuværende systems feltsæt er gennemprøvet, så vi bruger det som **udgangspunkt
for vores eget udtræks-skema**. Til reference returnerer det nuværende system:

```json
{
  "Value": {
    "Confidence": 0.999,
    "Filename": "…",
    "Result": {
      "CustomerName": "Jens Hansen|Mette Hansen",
      "CustomerAddress": "…", "CustomerPostalCity": "0000 By-Navn",
      "SupplierName": "…", "Product": "…",
      "KwhUsage": "…", "AnnualConsumption": "…",
      "InvoicePeriodStart": "DD.MM.YYYY", "InvoicePeriodEnd": "DD.MM.YYYY",
      "InvoicePeriodStartMonth": "…", "InvoicePeriodEndMonth": "…",
      "SubscriptionFee": "…", "NetSubscription": "…", "SpotFee": "…",
      "ElectricityFee": "…", "GeneralFee": "…", "AdditionalFee": "…",
      "AdditionalDiscount": "…", "Transport": "…", "NewProduct": "…",
      "Buffer1": "", "Buffer2": ""
    }
  }, "StatusCode": 200, "status": 0
}
```

**Beslutning:** vores udtræks-skema er et **superset** af felterne ovenfor
(samme feltnavne til at starte med, så vi kan genbruge dokumentation og evt.
sammenligne stikprøvevis), plus vores egne felter (mappet Strømligning-produkt-id,
region, beregnet besparelse). Skemaet er vores eget internt — det er ikke bundet
til nogen ekstern kontrakt og kan udvikles frit.

### 5.2 Normalisering
- **Gør:** mapper udtrukket selskab/produkt → Strømligning-id (fuzzy match mod
  cachet datasæt); postnr → netområde + prisområde (DK1/DK2).
- **Afhænger af:** cachet Strømligning-data + mapping-overrides (fra rettelser).

### 5.3 Årsforbrug-estimator
- **Gør:** returnerer bedste estimat på årligt kWh. Nu: brug oplyst "12 mdr"-tal
  hvis til stede, ellers omregn periodeforbrug til år (simpel med
  sæson-hensyn). **Isoleret modul** så Altid Energis rigtige formel plugges ind
  senere uden at røre resten.
- **Interface:** `estimérÅrsforbrug(periode, periodeforbrug, oplystÅrsforbrug?) → { kWh, metode, sikkerhed }`

### 5.4 Beregningsmotor
- **Gør:** `besparelse(forbrug, netområde, nuværendeProduktId) → { nuværende, altid, besparelse, antagelser }`
- Regner **lokalt** på cachede priskomponenter (ingen live-kald pr. kunde).
- **Afhænger af:** priscache. Reconciler jævnligt vores lokale formel mod
  Strømlignings `/api/companies` for at fange afvigelser.

### 5.5 Rettedashboard (admin)
- **Gør:** liste over alle uploads; se originalregning ved siden af de læste
  felter; ret felter; kør beregning igen; markér mapping-overrides.
- Rettelser → forbedrer coverage (mapping-overrides + eksempelbank).
- Eksport til regneark (bevarer det Excel-workflow teamet kender).
- **Adgang:** Supabase Auth-login.

### 5.6 Lead → Klaviyo
- **Gør:** ved samtykke, opret/opdatér Klaviyo-profil + event ("regningstjek
  gennemført", estimeret besparelse). Marketingsamtykke gemmes eksplicit.

---

## 6. Datamodel (Supabase)

- **submissions:** id, oprettet, filreference (Storage), status
  (læst/mangler-input/rettet), udtrukne felter (JSON), endeligt resultat (JSON),
  kundens rettelser (JSON), estimeret besparelse, sletning-dato (=oprettet+90d).
- **lead_consents:** submission_id, navn, mail, tlf, marketingsamtykke (bool),
  tidsstempel. (Adskilt fra submissions; kun ved samtykke.)
- **price_cache:** hentet-dato, selskab/produkt-komponenter (JSON).
- **company_mappings:** råtekst → Strømligning-produkt-id (fra rettelser).

Row-level security: kun service-role/admin læser submissions og leads.

---

## 7. Strømligning-integration

- **Daglig sync-job:** henter `/api/companies` (komponenter pr. produkt) +
  `/api/suppliers` / `/api/suppliers/areas` (netområder) → gemmes i
  `price_cache`. Data ændrer sig kun dagligt, så per-kunde-beregning sker lokalt.
- **Rate limit / nøgle:** i dag bruges det åbne endpoint (uden nøgle), som er
  begrænset til 5-10 kald/15 min. Vores design rammer det ikke (vi kalder kun i
  sync-jobbet). **Anbefaling:** anmod Strømligning om en API-nøgle + bekræft
  skriftligt kommerciel aftale (docs kræver formel aftale ved kommerciel brug).
- **Licens/attribution:** synlig kildehenvisning "Data fra Strømligning —
  https://stromligning.dk" nær resultatet (CC BY-NC 4.0-krav; persistent også i
  evt. PDF-rapport).

---

## 8. Fejl & tillid ("må aldrig sige noget forkert")

- Lav confidence eller manglende felt → gæt aldrig; spørg kunden inline.
- Resultat altid mærket "estimat", viser tallene bag + antagelser.
- Kant-tilfælde (erhverv, flere målere, ukendt selskab) → venlig besked +
  inline-felter, ikke et forkert tal.
- Er Altid Energi dyrere i et tilfælde → vis det ærligt.

---

## 9. Sikkerhed & GDPR

- Regninger er persondata. Filer i **privat, krypteret** Supabase-bucket; DB med
  row-level security; admin bag login.
- **Retention: 3 måneder** (90 dage), derefter automatisk sletning
  (retention-job). Kunde kan bede om sletning tidligere. Bygges så fristen nemt
  kan ændres.
- Privatlivsnote ved upload; marketingsamtykke separat og eksplicit (til
  Klaviyo).
- Ingen persondata sendes til Strømligning (kun forbrug + postnr/region i
  sync-jobbet, som ikke er personhenførbart).

---

## 10. Test

- **Beregningsmotor:** enhedstest; afstem lokal formel mod Strømlignings egne
  `/api/companies`-tal for flere forbrug/regioner.
- **Vision-læser:** test mod et korpus af rigtige regninger. Startkorpus:
  eksempler i `Opgaver/Regningsexplainer/` + regninger teamet uploader.
- **Coverage-korpus (interne historiske PDF'er, potentielt tusindvis):** kør
  læseren på et stort udsnit. Coverage måles UDEN facit = andel med sikkert,
  komplet udtræk (alle nødvendige felter + selskab mapper til Strømligning +
  postnr slår op). Ingen fine-tuning; frontier vision-model bruges direkte.
- **Korrekthed (facit på lille udsnit):** facit findes ikke på forhånd, så vi
  laver det på et håndplukket, selskabs-spredt udsnit (~50-100) — rettedashboardet
  er værktøjet der producerer facit mens teamet retter, og hver rettelse bliver
  labeled data der forbedrer coverage.
- **Ende-til-ende:** upload → resultat, både "læst sikkert" og "mangler
  input"-stier.

---

## 11. Faser (leverance i trin)

- **Fase 1 — MVP:** Fundamentet FØRST — sikker backend: DB-skema + krypteret
  fillagring + upload-intake + GDPR (retention-job, privatlivsnote). Derefter
  kæden ovenpå: vision-læsning → normalisering → beregning → vis besparelse.
  Inline-fallback for manglende felter. Simpel adminliste til at se/tilgå
  gemte regninger.
- **Fase 2 — Robusthed & coverage:** confidence-styring, rettedashboard,
  mapping-overrides + eksempelbank, reconciliation mod API.
- **Fase 3 — Konvertering & polish:** Klaviyo-lead m. samtykke, Altid Energis
  rigtige årsforbrug-formel, brand-design (brand-tokens), analytics, evt.
  mail-rapport.
- **Idriftsættelse (erstat den gamle løsning):** dokumentér coverage/korrekthed
  på det interne korpus, skift den nuværende widget/flow på altidenergi.dk over
  til vores egen løsning når præcisionen er høj nok.

---

## 12. Åbne punkter (kan afklares undervejs)

- Endelig Strømligning-nøgle + skriftlig kommerciel bekræftelse (anbefalet).
- Internt udtræk af historiske faktura-PDF'er (findes, potentielt tusindvis) til
  coverage-korpus. Udtrukne facit-data findes formentlig ikke — laves på et lille
  udsnit via rettedashboardet.
- Altid Energis rigtige årsforbrug-formel (plugges ind i Fase 3).
- Præcis brand/visuel udformning af widget'en (Fase 3).
- Hvor widget'en indlejres på altidenergi.dk, og om leadet også skal spejles til
  et regneark ud over Klaviyo.
