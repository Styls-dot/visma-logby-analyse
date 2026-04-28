# Google Sheet + Apps Script — paste og kør setup

**Forudsætning:** Du har gennemført `meta-setup-walkthrough.md` og har token + Account ID klar.

**Tid:** ~5 minutter.

## 1. Åbn Sheet'et

Claude har oprettet et tomt Google Sheet til dig: **"Altid Energi — Meta Dashboard"**.

Hvis du ikke kan finde det, søg i Google Drive på navnet, eller spørg Claude om linket.

## 2. Åbn Apps Script editor

I Sheet'et:

1. Klik **Extensions** (menulinjen øverst) → **Apps Script**
2. En ny fane åbner — det er Apps Script editor'en
3. Du ser sandsynligvis en fil ved navn `Code.gs` med et tomt `function myFunction()` — slet alt indhold

## 3. Paste kildekoden

For hver af disse 6 filer skal du oprette en separat fil i editor'en:

| Filnavn at oprette | Kilde (lokalt på din Mac) |
|---|---|
| `Config` | `meta-dashboard/apps-script/Config.gs` |
| `Sheet` | `meta-dashboard/apps-script/Sheet.gs` |
| `MetaAPI` | `meta-dashboard/apps-script/MetaAPI.gs` |
| `Rules` | `meta-dashboard/apps-script/Rules.gs` |
| `Main` | `meta-dashboard/apps-script/Main.gs` |
| `Setup` | `meta-dashboard/apps-script/Setup.gs` |

**For hver fil:**
1. I venstre sidebar af editor'en, klik **+** ved siden af "Files" → **Script**
2. Indtast filnavn (uden `.gs` — Apps Script tilføjer det selv)
3. Slet det auto-genererede `function myFunction(){}` indhold
4. Åbn den tilsvarende lokale `.gs`-fil i fx VS Code eller TextEdit, kopiér alt
5. Paste i Apps Script editor'en
6. Klik 💾 (gem)

Slet til sidst den oprindelige `Code.gs` (højreklik → Slet) hvis den stadig er tom.

## 4. Opdatér manifestet (appsscript.json)

1. I editor'en: ⚙️ **Project Settings** (i venstre sidebar)
2. Marker **"Show 'appsscript.json' manifest file in editor"** → Save
3. Tilbage til editor'en — du ser nu `appsscript.json` blandt filerne
4. Klik den → slet alt indhold → paste fra `meta-dashboard/apps-script/appsscript.json`
5. Gem

## 5. Kør Setup første gang

1. Tilbage i Sheet'et — **refresh siden** (Cmd+R) så menuen indlæses
2. Du ser nu en ny menu øverst: **Meta Dashboard**
3. Klik **Meta Dashboard → 🔧 Setup (første gang)**
4. Google beder om permission første gang:
   - Klik "Review permissions"
   - Vælg din Google-bruger
   - Du ser måske en advarsel "Google hasn't verified this app" — klik **"Advanced"** → **"Go to [project name] (unsafe)"**. Det er fordi din egen kode ikke er Google-verified, ikke fordi den er usikker.
   - Klik "Allow"
5. Du vender tilbage til Sheet'et og en popup spørger om token → indsæt
6. Næste popup spørger om Account ID → indsæt (`act_XXXXXXXXX` eller bare tallet)
7. Scriptet validerer mod Meta og siger til hvis noget er galt

Hvis alt er OK:
- Trigger oprettes automatisk (kører dagligt kl. 07:00 dansk tid)
- Første dataindlæsning starter — tager 30-60 sekunder
- Du får en "Færdig!"-popup og kan tjekke 📊 Overblik-fanen

## 6. Verificér

- 📊 Overblik-fanen har spend og CPA-tal
- 🎯 Kampagner / 📦 Annoncesæt / 🖼️ Annoncer-fanerne har rækker
- ⚙️ Log-fanen har en "OK" række med dagens dato
- Apps Script editor → ⏰ Triggers (i sidebar) → der er én trigger for `dailyRun`

## Hvis noget går galt

- Tjek **⚙️ Log**-fanen i Sheet'et
- Tjek Apps Script editor → **Executions** (i sidebar) for fejl-stack-traces
- Hvis token er forkert: kør **Meta Dashboard → 🗑️ Nulstil setup** og så Setup igen
- Spørg Claude hvis fejlen ikke giver mening

## Manuel ad-hoc kørsel

Du kan altid trække friske tal uden at vente til 07:00 næste dag:

**Meta Dashboard → 🔄 Opdater nu**
