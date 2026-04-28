# Meta Ads Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a self-updating daily Google Sheet dashboard for Altid Energi's Meta ads, fed by Google Apps Script that pulls from Meta Marketing API and writes to 7 tabs including rule-based recommendations.

**Architecture:** Container-bound Apps Script attached to a Google Sheet. Daily 07:00 trigger calls Meta Graph API for account/campaign/ad-set/ad insights, computes derived metrics (CPA, account averages), runs rule-based recommendation logic, writes snapshots and history to the Sheet. Setup wizard handles token validation and trigger creation. No automated tests (Apps Script lacks good test infra; spec scope is small enough for manual verification).

**Tech Stack:** Google Apps Script (V8 runtime), Meta Graph API v22.0, Google Sheets API (built into Apps Script), PropertiesService for token storage, MailApp for error notifications.

**File structure:**
```
meta-dashboard/
├── apps-script/
│   ├── appsscript.json   — manifest (timezone, OAuth scopes)
│   ├── Config.gs         — constants (API, sheet names, rule thresholds)
│   ├── MetaAPI.gs        — Graph API client + retry logic
│   ├── Sheet.gs          — Sheet write helpers (clear/append/format)
│   ├── Rules.gs          — quick-fix recommendation rules
│   ├── Main.gs           — daily run orchestration
│   └── Setup.gs          — onOpen menu + setup wizard
├── docs/
│   ├── meta-setup-walkthrough.md     — Business Manager step-by-step
│   └── google-setup-walkthrough.md   — Sheet + Apps Script paste steps
└── README.md
```

---

### Task 1: Project structure and README

**Files:**
- Create: `meta-dashboard/README.md`
- Create: `meta-dashboard/apps-script/` (directory)
- Create: `meta-dashboard/docs/` (directory)

- [ ] **Step 1: Create folders and README**

```bash
mkdir -p "meta-dashboard/apps-script" "meta-dashboard/docs"
```

Then write `meta-dashboard/README.md`:

```markdown
# Meta Ads Dashboard — Altid Energi

Selv-opdaterende Google Sheet-dashboard til Altid Energis Meta-annoncedata. Kører dagligt kl. 07:00 dansk tid via Google Apps Script.

## Indhold

- `apps-script/` — Apps Script-kildekode (paste'es ind i Google Apps Script editor)
- `docs/meta-setup-walkthrough.md` — opret system user og token i Meta Business Manager
- `docs/google-setup-walkthrough.md` — opret Sheet, paste kode, kør setup

## Første gang

Følg `docs/meta-setup-walkthrough.md` først, så `docs/google-setup-walkthrough.md`.

## Spec og plan

- Spec: `docs/superpowers/specs/2026-04-28-meta-ads-dashboard-design.md`
- Plan: `docs/superpowers/plans/2026-04-28-meta-ads-dashboard.md`
```

- [ ] **Step 2: Verify folders exist**

```bash
ls -la "meta-dashboard/"
```

Expected output: `apps-script/`, `docs/`, `README.md`

---

### Task 2: appsscript.json manifest

**Files:**
- Create: `meta-dashboard/apps-script/appsscript.json`

- [ ] **Step 1: Write manifest**

```json
{
  "timeZone": "Europe/Copenhagen",
  "dependencies": {},
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "oauthScopes": [
    "https://www.googleapis.com/auth/script.external_request",
    "https://www.googleapis.com/auth/spreadsheets.currentonly",
    "https://www.googleapis.com/auth/script.send_mail",
    "https://www.googleapis.com/auth/script.scriptapp",
    "https://www.googleapis.com/auth/userinfo.email"
  ]
}
```

**Why these scopes:**
- `script.external_request` — for `UrlFetchApp` calls til Meta API
- `spreadsheets.currentonly` — adgang kun til denne ene Sheet (mindre permission end fuld Sheets-adgang)
- `script.send_mail` — for `MailApp.sendEmail` ved fejl
- `script.scriptapp` — for at oprette/læse triggers
- `userinfo.email` — for at vide hvilken email der skal modtage fejl-notifikationer

---

### Task 3: Config.gs — konstanter

**Files:**
- Create: `meta-dashboard/apps-script/Config.gs`

- [ ] **Step 1: Write Config.gs**

```javascript
/**
 * Config.gs — Konstanter for Meta Ads Dashboard.
 * Ingen logik. Alle "magiske tal" og strings bor her.
 */

const CONFIG = Object.freeze({
  // Meta API
  API_VERSION: 'v22.0',
  API_BASE: 'https://graph.facebook.com',
  REQUEST_TIMEOUT_MS: 60000,
  MAX_RETRIES: 2,

  // Fanenavne (præcis stavemåde — bruges som lookup-keys)
  SHEET_NAMES: {
    OVERVIEW: '📊 Overblik',
    CAMPAIGNS: '🎯 Kampagner',
    AD_SETS: '📦 Annoncesæt',
    ADS: '🖼️ Annoncer',
    RECOMMENDATIONS: '💡 Anbefalinger',
    HISTORY: '📈 Historik',
    LOG: '⚙️ Log'
  },

  // Tærskler for quick-fix regler
  RULES: {
    CPA_RED_MULTIPLIER: 3.0,      // CPA > 3x kontogennemsnit → 🔴
    CPA_YELLOW_MULTIPLIER: 2.0,   // CPA > 2x kontogennemsnit → 🟡
    FREQUENCY_FATIGUE: 4.0,       // Frequency > 4 → 🟡 mætning
    CTR_DROP_PCT: 0.30,           // CTR-fald > 30% sidste 7d → 🟡
    SPEND_SPIKE_MULTIPLIER: 3.0,  // Spend > 3x normal → 🟡
    TOP_PERFORMER_PCT: 0.50,      // CPA < 50% af gennemsnit → 🟢
    MIN_SPEND_FOR_RULES: 100      // Ignorer items med <100 kr spend (støj)
  },

  // Trigger
  TRIGGER_HOUR: 7,
  TIMEZONE: 'Europe/Copenhagen',

  // PropertiesService keys
  PROPERTY_KEYS: {
    META_TOKEN: 'META_ACCESS_TOKEN',
    AD_ACCOUNT_ID: 'META_AD_ACCOUNT_ID',
    NOTIFY_EMAIL: 'META_NOTIFY_EMAIL'
  },

  // Action types der tæller som "Purchase"
  // (Meta Pixel + andre conversion-events der ofte mappes til purchase)
  PURCHASE_ACTION_TYPES: [
    'purchase',
    'offsite_conversion.fb_pixel_purchase',
    'omni_purchase',
    'web_in_store_purchase',
    'onsite_conversion.purchase'
  ],

  // Insights-felter pr. niveau
  INSIGHTS_FIELDS: 'spend,impressions,clicks,ctr,cpm,cpc,frequency,reach,actions,cost_per_action_type'
});
```

---

### Task 4: Sheet.gs — Sheet write-helpers

**Files:**
- Create: `meta-dashboard/apps-script/Sheet.gs`

- [ ] **Step 1: Write Sheet.gs**

```javascript
/**
 * Sheet.gs — Hjælpefunktioner til at skrive til Google Sheet.
 * Idempotente: kalder kan trygt køre dem flere gange.
 */

/** Returnerer fanen ved navn, opretter den hvis den ikke findes. */
function getOrCreateSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  return sheet;
}

/**
 * Rydder en fane og skriver headers + rows på ny.
 * Bruges til snapshot-faner (Overblik, Kampagner, Annoncesæt, Annoncer, Anbefalinger).
 *
 * @param {string} sheetName
 * @param {string[]} headers
 * @param {Array<Array<*>>} rows
 */
function clearAndWrite(sheetName, headers, rows) {
  const sheet = getOrCreateSheet(sheetName);
  sheet.clear();

  if (headers && headers.length > 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#f3f3f3');
    sheet.setFrozenRows(1);
  }

  if (rows && rows.length > 0) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  } else {
    sheet.getRange(2, 1).setValue('Ingen data for denne periode.');
  }

  sheet.autoResizeColumns(1, headers.length);
}

/**
 * Tilføjer rækker nederst i en fane (uden at røre eksisterende data).
 * Hvis fanen er tom skrives headers først.
 *
 * @param {string} sheetName
 * @param {string[]} headers
 * @param {Array<Array<*>>} rows
 */
function appendRows(sheetName, headers, rows) {
  const sheet = getOrCreateSheet(sheetName);

  if (sheet.getLastRow() === 0 && headers) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#f3f3f3');
    sheet.setFrozenRows(1);
  }

  if (rows && rows.length > 0) {
    const startRow = sheet.getLastRow() + 1;
    sheet.getRange(startRow, 1, rows.length, rows[0].length).setValues(rows);
  }
}

/**
 * Skriver KPI-kort til Overblik-fanen.
 * Layout: 4 kort i række 2-4, hver kort 3 rækker × 2 kolonner.
 */
function writeOverviewCards(kpis) {
  const sheet = getOrCreateSheet(CONFIG.SHEET_NAMES.OVERVIEW);
  sheet.clear();

  sheet.getRange('A1').setValue('Altid Energi — Meta Dashboard')
    .setFontSize(16).setFontWeight('bold');
  sheet.getRange('A2').setValue('Senest opdateret: ' + new Date().toLocaleString('da-DK'))
    .setFontStyle('italic').setFontColor('#666');

  // 4 kort i kolonne A-B, C-D, E-F, G-H, række 4-7
  const cards = [
    { label: 'Spend i dag *', value: kpis.spend_today, format: '#,##0 kr' },
    { label: 'Spend i går', value: kpis.spend_yesterday, format: '#,##0 kr' },
    { label: 'Spend sidste 7 dage', value: kpis.spend_7d, format: '#,##0 kr' },
    { label: 'Spend sidste 30 dage', value: kpis.spend_30d, format: '#,##0 kr' }
  ];

  cards.forEach((card, i) => {
    const col = 1 + i * 2;
    sheet.getRange(4, col).setValue(card.label).setFontWeight('bold');
    sheet.getRange(5, col).setValue(card.value).setNumberFormat(card.format).setFontSize(18);
  });

  const cpaCards = [
    { label: 'CPA i dag *', value: kpis.cpa_today, format: '#,##0 kr' },
    { label: 'CPA i går', value: kpis.cpa_yesterday, format: '#,##0 kr' },
    { label: 'CPA sidste 7 dage', value: kpis.cpa_7d, format: '#,##0 kr' },
    { label: 'CPA sidste 30 dage', value: kpis.cpa_30d, format: '#,##0 kr' }
  ];

  cpaCards.forEach((card, i) => {
    const col = 1 + i * 2;
    sheet.getRange(7, col).setValue(card.label).setFontWeight('bold');
    sheet.getRange(8, col).setValue(card.value).setNumberFormat(card.format).setFontSize(18);
  });

  sheet.getRange('A10').setValue('* = stadig i bevægelse (dagen er ikke slut)')
    .setFontStyle('italic').setFontColor('#999');

  sheet.setColumnWidths(1, 8, 130);
}

/** Viser en toast-notifikation i bunden af brugerens browser. */
function showToast(message, title) {
  SpreadsheetApp.getActiveSpreadsheet().toast(message, title || 'Meta Dashboard', 5);
}
```

---

### Task 5: MetaAPI.gs — Graph API client

**Files:**
- Create: `meta-dashboard/apps-script/MetaAPI.gs`

- [ ] **Step 1: Write MetaAPI.gs**

```javascript
/**
 * MetaAPI.gs — Tynd wrapper om Meta Graph API.
 * Henter token fra PropertiesService. Retry-logik med exponential backoff.
 */

const MetaAPI = {

  /** Lavt-niveau request-helper. Throws ved fejl. */
  _request(path, params, retryCount) {
    retryCount = retryCount || 0;

    const props = PropertiesService.getScriptProperties();
    const token = props.getProperty(CONFIG.PROPERTY_KEYS.META_TOKEN);
    if (!token) {
      throw new Error('Meta token mangler. Kør Setup fra menuen.');
    }

    const queryParams = Object.assign({ access_token: token }, params || {});
    const queryString = Object.keys(queryParams)
      .map(k => encodeURIComponent(k) + '=' + encodeURIComponent(
        typeof queryParams[k] === 'object' ? JSON.stringify(queryParams[k]) : queryParams[k]
      ))
      .join('&');

    const url = `${CONFIG.API_BASE}/${CONFIG.API_VERSION}/${path}?${queryString}`;

    const response = UrlFetchApp.fetch(url, {
      method: 'get',
      muteHttpExceptions: true,
      followRedirects: true
    });

    const code = response.getResponseCode();
    const body = response.getContentText();

    if (code === 200) {
      return JSON.parse(body);
    }

    // Rate limit / midlertidig fejl → retry
    if ((code === 429 || code >= 500) && retryCount < CONFIG.MAX_RETRIES) {
      const waitMs = Math.pow(2, retryCount) * 1000;
      Utilities.sleep(waitMs);
      return MetaAPI._request(path, params, retryCount + 1);
    }

    let errorMsg = `Meta API fejl ${code}: ${body}`;
    try {
      const parsed = JSON.parse(body);
      if (parsed.error && parsed.error.message) {
        errorMsg = `Meta API fejl ${code}: ${parsed.error.message} (kode ${parsed.error.code})`;
      }
    } catch (e) { /* fortsæt med rå body */ }
    throw new Error(errorMsg);
  },

  /** Tester at token + accountID virker. Returnerer { ok: true, accountName } eller { ok: false, error }. */
  testToken(token, accountId) {
    try {
      const url = `${CONFIG.API_BASE}/${CONFIG.API_VERSION}/${accountId}?fields=name,account_status&access_token=${encodeURIComponent(token)}`;
      const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
      if (response.getResponseCode() !== 200) {
        const body = JSON.parse(response.getContentText());
        return { ok: false, error: body.error ? body.error.message : 'Ukendt fejl' };
      }
      const data = JSON.parse(response.getContentText());
      return { ok: true, accountName: data.name };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  },

  /** Henter konto-niveau insights for et givet date_preset. */
  fetchAccountInsights(accountId, datePreset) {
    const result = MetaAPI._request(`${accountId}/insights`, {
      fields: CONFIG.INSIGHTS_FIELDS,
      date_preset: datePreset,
      level: 'account'
    });
    return (result.data && result.data[0]) || null;
  },

  /** Henter alle aktive + nyligt-pausede kampagner med insights for last_7d og last_30d. */
  fetchCampaigns(accountId) {
    const result = MetaAPI._request(`${accountId}/campaigns`, {
      fields: `id,name,status,effective_status,objective,insights.date_preset(last_7d){${CONFIG.INSIGHTS_FIELDS}},insights_30d:insights.date_preset(last_30d){${CONFIG.INSIGHTS_FIELDS}}`,
      filtering: [{ field: 'effective_status', operator: 'IN', value: ['ACTIVE', 'PAUSED'] }],
      limit: 500
    });
    return result.data || [];
  },

  /** Henter alle aktive + nyligt-pausede annoncesæt med insights. */
  fetchAdSets(accountId) {
    const result = MetaAPI._request(`${accountId}/adsets`, {
      fields: `id,name,status,effective_status,campaign_id,insights.date_preset(last_7d){${CONFIG.INSIGHTS_FIELDS}},insights_30d:insights.date_preset(last_30d){${CONFIG.INSIGHTS_FIELDS}}`,
      filtering: [{ field: 'effective_status', operator: 'IN', value: ['ACTIVE', 'PAUSED'] }],
      limit: 500
    });
    return result.data || [];
  },

  /** Henter alle aktive + nyligt-pausede annoncer med insights + thumbnail. */
  fetchAds(accountId) {
    const result = MetaAPI._request(`${accountId}/ads`, {
      fields: `id,name,status,effective_status,adset_id,creative{thumbnail_url,id},insights.date_preset(last_7d){${CONFIG.INSIGHTS_FIELDS}},insights_30d:insights.date_preset(last_30d){${CONFIG.INSIGHTS_FIELDS}}`,
      filtering: [{ field: 'effective_status', operator: 'IN', value: ['ACTIVE', 'PAUSED'] }],
      limit: 500
    });
    return result.data || [];
  },

  /** Trækker antal Purchase-events ud fra et insights-objekt. Returnerer 0 hvis ingen. */
  extractPurchases(insights) {
    if (!insights || !insights.actions) return 0;
    return insights.actions
      .filter(a => CONFIG.PURCHASE_ACTION_TYPES.includes(a.action_type))
      .reduce((sum, a) => sum + parseFloat(a.value || 0), 0);
  }

};
```

**Note om Meta's `insights_30d` felt-aliaser:** Meta Graph API tillader at man henter samme objekt-felt med forskellige parametre via aliaser (`insights_30d:insights.date_preset(last_30d)`). Det giver os både 7d og 30d insights i ét kald.

---

### Task 6: Rules.gs — quick-fix regler

**Files:**
- Create: `meta-dashboard/apps-script/Rules.gs`

- [ ] **Step 1: Write Rules.gs**

```javascript
/**
 * Rules.gs — Genererer regel-baserede anbefalinger til Anbefalinger-fanen.
 * Hver regel returnerer rækker i format:
 *   [prioritet, niveau, navn, problem, foreslået action]
 * Prioriteter: '🔴 Høj', '🟡 Mellem', '🟢 Lav'
 */

const Rules = {

  /**
   * Hovedindgang: tager alle 3 niveauer + konto-gennemsnit, returnerer alle anbefalinger sorteret.
   */
  generateAll(accountAvgCpa, campaigns, adSets, ads) {
    const all = [];
    [
      { items: campaigns, label: 'Kampagne' },
      { items: adSets, label: 'Annoncesæt' },
      { items: ads, label: 'Annonce' }
    ].forEach(({ items, label }) => {
      all.push(...Rules._cpaOutlier(items, accountAvgCpa, label));
      all.push(...Rules._frequencyFatigue(items, label));
      all.push(...Rules._spendSpikeWithoutPurchases(items, label));
      all.push(...Rules._pausedButSpending(items, label));
      all.push(...Rules._topPerformer(items, accountAvgCpa, label));
    });

    return Rules._sortByPriority(all);
  },

  _cpaOutlier(items, accountAvgCpa, levelLabel) {
    if (!accountAvgCpa || accountAvgCpa === 0) return [];
    const out = [];
    items.forEach(item => {
      if (item.spend_7d < CONFIG.RULES.MIN_SPEND_FOR_RULES) return;
      if (!item.cpa_7d || item.cpa_7d === 0) return;
      const ratio = item.cpa_7d / accountAvgCpa;
      if (ratio >= CONFIG.RULES.CPA_RED_MULTIPLIER) {
        out.push([
          '🔴 Høj',
          levelLabel,
          item.name,
          `CPA ${Math.round(item.cpa_7d)} kr — ${ratio.toFixed(1)}x kontogennemsnit (${Math.round(accountAvgCpa)} kr)`,
          'Overvej pause eller ny målgruppe/creative'
        ]);
      } else if (ratio >= CONFIG.RULES.CPA_YELLOW_MULTIPLIER) {
        out.push([
          '🟡 Mellem',
          levelLabel,
          item.name,
          `CPA ${Math.round(item.cpa_7d)} kr — ${ratio.toFixed(1)}x kontogennemsnit`,
          'Hold øje. Hvis CPA stiger yderligere → pause'
        ]);
      }
    });
    return out;
  },

  _frequencyFatigue(items, levelLabel) {
    const out = [];
    items.forEach(item => {
      if (item.spend_7d < CONFIG.RULES.MIN_SPEND_FOR_RULES) return;
      if (!item.frequency_7d) return;
      if (item.frequency_7d >= CONFIG.RULES.FREQUENCY_FATIGUE) {
        out.push([
          '🟡 Mellem',
          levelLabel,
          item.name,
          `Frequency ${item.frequency_7d.toFixed(1)} (over ${CONFIG.RULES.FREQUENCY_FATIGUE} = mætning)`,
          'Producér ny creative-variant eller udvid målgruppe'
        ]);
      }
    });
    return out;
  },

  _spendSpikeWithoutPurchases(items, levelLabel) {
    const out = [];
    items.forEach(item => {
      if (!item.spend_today || !item.spend_7d) return;
      const avgDaily = item.spend_7d / 7;
      if (avgDaily === 0) return;
      const spikeRatio = item.spend_today / avgDaily;
      if (spikeRatio >= CONFIG.RULES.SPEND_SPIKE_MULTIPLIER && (item.purchases_today || 0) === 0) {
        out.push([
          '🟡 Mellem',
          levelLabel,
          item.name,
          `Spend ${Math.round(item.spend_today)} kr i dag (${spikeRatio.toFixed(1)}x normal) uden purchases`,
          'Tjek leveringsindstillinger og målgruppe — kan være targeting-fejl'
        ]);
      }
    });
    return out;
  },

  _pausedButSpending(items, levelLabel) {
    const out = [];
    items.forEach(item => {
      if (item.effective_status === 'PAUSED' && (item.spend_today || 0) > 0) {
        out.push([
          '🔴 Høj',
          levelLabel,
          item.name,
          `Status PAUSED men har brugt ${Math.round(item.spend_today)} kr i dag`,
          'Skift effective_status eller undersøg parent-niveau'
        ]);
      }
    });
    return out;
  },

  _topPerformer(items, accountAvgCpa, levelLabel) {
    if (!accountAvgCpa || accountAvgCpa === 0) return [];
    const out = [];
    items.forEach(item => {
      if (item.spend_7d < CONFIG.RULES.MIN_SPEND_FOR_RULES) return;
      if (!item.cpa_7d || item.cpa_7d === 0) return;
      if ((item.purchases_7d || 0) < 3) return; // Mindst 3 purchases for at være statistisk
      const ratio = item.cpa_7d / accountAvgCpa;
      if (ratio <= CONFIG.RULES.TOP_PERFORMER_PCT) {
        const pct = Math.round((1 - ratio) * 100);
        out.push([
          '🟢 Lav',
          levelLabel,
          item.name,
          `CPA ${Math.round(item.cpa_7d)} kr — ${pct}% under gennemsnit`,
          'Overvej at skalere budget +30% eller duplikere til nye målgrupper'
        ]);
      }
    });
    return out;
  },

  _sortByPriority(rows) {
    const order = { '🔴 Høj': 0, '🟡 Mellem': 1, '🟢 Lav': 2 };
    return rows.sort((a, b) => order[a[0]] - order[b[0]]);
  }

};
```

---

### Task 7: Main.gs — orchestration

**Files:**
- Create: `meta-dashboard/apps-script/Main.gs`

- [ ] **Step 1: Write Main.gs**

```javascript
/**
 * Main.gs — Daglig kørsel orchestration.
 * Kaldes af tids-trigger eller manuelt via menu.
 */

/** Top-level entry point. Kører hele dashboard-opdateringen. */
function dailyRun() {
  const start = new Date();
  let rowCount = 0;

  try {
    const props = PropertiesService.getScriptProperties();
    const accountId = props.getProperty(CONFIG.PROPERTY_KEYS.AD_ACCOUNT_ID);
    if (!accountId) throw new Error('Ad Account ID mangler. Kør Setup fra menuen.');

    // 1. Hent konto-niveau insights for 4 perioder
    const acctToday = MetaAPI.fetchAccountInsights(accountId, 'today');
    const acctYesterday = MetaAPI.fetchAccountInsights(accountId, 'yesterday');
    const acct7d = MetaAPI.fetchAccountInsights(accountId, 'last_7d');
    const acct30d = MetaAPI.fetchAccountInsights(accountId, 'last_30d');

    // 2. Skriv Overblik-fane
    const kpis = {
      spend_today: parseFloat((acctToday && acctToday.spend) || 0),
      spend_yesterday: parseFloat((acctYesterday && acctYesterday.spend) || 0),
      spend_7d: parseFloat((acct7d && acct7d.spend) || 0),
      spend_30d: parseFloat((acct30d && acct30d.spend) || 0),
      cpa_today: _calcCpa(acctToday),
      cpa_yesterday: _calcCpa(acctYesterday),
      cpa_7d: _calcCpa(acct7d),
      cpa_30d: _calcCpa(acct30d)
    };
    writeOverviewCards(kpis);
    rowCount += 1;

    // 3. Hent alle 3 niveauer
    const campaigns = MetaAPI.fetchCampaigns(accountId);
    const adSets = MetaAPI.fetchAdSets(accountId);
    const ads = MetaAPI.fetchAds(accountId);

    // 4. Beregn afledte tal og normaliser
    const campaignsNorm = campaigns.map(c => _normalizeItem(c, 'campaign'));
    const adSetsNorm = adSets.map(a => _normalizeItem(a, 'adset'));
    const adsNorm = ads.map(a => _normalizeItem(a, 'ad'));

    // 5. Konto-gennemsnits-CPA (fra last_7d på alle items, vægtet på spend)
    const accountAvgCpa = _weightedAvgCpa(adSetsNorm);

    // 6. Skriv snapshot-faner
    _writeCampaigns(campaignsNorm);
    rowCount += campaignsNorm.length;
    _writeAdSets(adSetsNorm);
    rowCount += adSetsNorm.length;
    _writeAds(adsNorm);
    rowCount += adsNorm.length;

    // 7. Anbefalinger
    const recs = Rules.generateAll(accountAvgCpa, campaignsNorm, adSetsNorm, adsNorm);
    clearAndWrite(
      CONFIG.SHEET_NAMES.RECOMMENDATIONS,
      ['Prioritet', 'Niveau', 'Navn', 'Problem', 'Foreslået handling'],
      recs
    );
    rowCount += recs.length;

    // 8. Append til Historik
    _appendHistory(kpis, campaignsNorm, adSetsNorm, adsNorm);

    // 9. Log success
    _logRun('OK', start, rowCount, null);

  } catch (err) {
    _logRun('FEJL', start, rowCount, err.message);
    _notifyError(err);
    throw err; // Re-throw så Apps Script logger det i Stackdriver
  }
}

function _calcCpa(insights) {
  if (!insights) return 0;
  const spend = parseFloat(insights.spend || 0);
  const purchases = MetaAPI.extractPurchases(insights);
  if (purchases === 0) return 0;
  return spend / purchases;
}

function _normalizeItem(item, level) {
  const ins7d = (item.insights && item.insights.data && item.insights.data[0]) || null;
  const ins30d = (item.insights_30d && item.insights_30d.data && item.insights_30d.data[0]) || null;

  return {
    id: item.id,
    name: item.name,
    status: item.status,
    effective_status: item.effective_status,
    objective: item.objective || '',
    parent_id: item.campaign_id || item.adset_id || '',
    thumbnail_url: (item.creative && item.creative.thumbnail_url) || '',

    // 7d metrics
    spend_7d: parseFloat((ins7d && ins7d.spend) || 0),
    impressions_7d: parseInt((ins7d && ins7d.impressions) || 0),
    clicks_7d: parseInt((ins7d && ins7d.clicks) || 0),
    ctr_7d: parseFloat((ins7d && ins7d.ctr) || 0),
    cpm_7d: parseFloat((ins7d && ins7d.cpm) || 0),
    cpc_7d: parseFloat((ins7d && ins7d.cpc) || 0),
    frequency_7d: parseFloat((ins7d && ins7d.frequency) || 0),
    reach_7d: parseInt((ins7d && ins7d.reach) || 0),
    purchases_7d: MetaAPI.extractPurchases(ins7d),
    cpa_7d: ins7d ? _calcCpa(ins7d) : 0,

    // 30d metrics
    spend_30d: parseFloat((ins30d && ins30d.spend) || 0),
    purchases_30d: MetaAPI.extractPurchases(ins30d),
    cpa_30d: ins30d ? _calcCpa(ins30d) : 0,

    // i dag (fra 7d-aggregatet er vi nødt til at acceptere at "i dag" ikke er separat per item — en afvejning for færre API-kald. Spend_today bruges i regler men vi sætter det til 0 her; account-niveau "i dag" vises i Overblik.)
    spend_today: 0,
    purchases_today: 0
  };
}

function _weightedAvgCpa(items) {
  let totalSpend = 0;
  let totalPurchases = 0;
  items.forEach(i => {
    totalSpend += i.spend_7d;
    totalPurchases += i.purchases_7d;
  });
  return totalPurchases > 0 ? totalSpend / totalPurchases : 0;
}

function _writeCampaigns(campaigns) {
  const headers = ['ID', 'Navn', 'Status', 'Objective',
    'Spend 7d', 'Purchases 7d', 'CPA 7d',
    'Spend 30d', 'Purchases 30d', 'CPA 30d',
    'CPM 7d', 'CTR 7d %', 'Frequency 7d'];
  const rows = campaigns.map(c => [
    c.id, c.name, c.effective_status, c.objective,
    Math.round(c.spend_7d), c.purchases_7d, Math.round(c.cpa_7d),
    Math.round(c.spend_30d), c.purchases_30d, Math.round(c.cpa_30d),
    Math.round(c.cpm_7d), c.ctr_7d.toFixed(2), c.frequency_7d.toFixed(1)
  ]);
  clearAndWrite(CONFIG.SHEET_NAMES.CAMPAIGNS, headers, rows);
}

function _writeAdSets(adSets) {
  const headers = ['ID', 'Navn', 'Status', 'Kampagne-ID',
    'Spend 7d', 'Purchases 7d', 'CPA 7d',
    'Spend 30d', 'Purchases 30d', 'CPA 30d',
    'CPM 7d', 'CTR 7d %', 'Frequency 7d'];
  const rows = adSets.map(a => [
    a.id, a.name, a.effective_status, a.parent_id,
    Math.round(a.spend_7d), a.purchases_7d, Math.round(a.cpa_7d),
    Math.round(a.spend_30d), a.purchases_30d, Math.round(a.cpa_30d),
    Math.round(a.cpm_7d), a.ctr_7d.toFixed(2), a.frequency_7d.toFixed(1)
  ]);
  clearAndWrite(CONFIG.SHEET_NAMES.AD_SETS, headers, rows);
}

function _writeAds(ads) {
  const headers = ['ID', 'Navn', 'Status', 'Annoncesæt-ID', 'Thumbnail',
    'Spend 7d', 'Purchases 7d', 'CPA 7d',
    'Spend 30d', 'Purchases 30d', 'CPA 30d',
    'CPM 7d', 'CTR 7d %', 'Frequency 7d'];
  const rows = ads.map(a => [
    a.id, a.name, a.effective_status, a.parent_id,
    a.thumbnail_url ? `=HYPERLINK("${a.thumbnail_url}";"vis")` : '',
    Math.round(a.spend_7d), a.purchases_7d, Math.round(a.cpa_7d),
    Math.round(a.spend_30d), a.purchases_30d, Math.round(a.cpa_30d),
    Math.round(a.cpm_7d), a.ctr_7d.toFixed(2), a.frequency_7d.toFixed(1)
  ]);
  clearAndWrite(CONFIG.SHEET_NAMES.ADS, headers, rows);
}

function _appendHistory(kpis, campaigns, adSets, ads) {
  const today = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyy-MM-dd');
  const headers = ['Dato', 'Niveau', 'ID', 'Navn', 'Spend 7d', 'Purchases 7d', 'CPA 7d'];

  const rows = [
    [today, 'Konto', '-', 'Konto-total', Math.round(kpis.spend_7d), '', Math.round(kpis.cpa_7d)]
  ];
  campaigns.forEach(c => rows.push([today, 'Kampagne', c.id, c.name, Math.round(c.spend_7d), c.purchases_7d, Math.round(c.cpa_7d)]));
  adSets.forEach(a => rows.push([today, 'Annoncesæt', a.id, a.name, Math.round(a.spend_7d), a.purchases_7d, Math.round(a.cpa_7d)]));
  ads.forEach(a => rows.push([today, 'Annonce', a.id, a.name, Math.round(a.spend_7d), a.purchases_7d, Math.round(a.cpa_7d)]));

  appendRows(CONFIG.SHEET_NAMES.HISTORY, headers, rows);
}

function _logRun(status, startTime, rowCount, errorMsg) {
  const duration = Math.round((new Date() - startTime) / 1000);
  appendRows(
    CONFIG.SHEET_NAMES.LOG,
    ['Tidsstempel', 'Status', 'Varighed (s)', 'Antal rækker', 'Fejl'],
    [[
      Utilities.formatDate(startTime, CONFIG.TIMEZONE, 'yyyy-MM-dd HH:mm:ss'),
      status,
      duration,
      rowCount,
      errorMsg || ''
    ]]
  );
}

function _notifyError(err) {
  try {
    const props = PropertiesService.getScriptProperties();
    const email = props.getProperty(CONFIG.PROPERTY_KEYS.NOTIFY_EMAIL) || Session.getActiveUser().getEmail();
    if (!email) return;
    MailApp.sendEmail({
      to: email,
      subject: '⚠️ Meta Dashboard fejlede',
      body: `Dashboard-kørsel fejlede:\n\n${err.message}\n\nSheet: ${SpreadsheetApp.getActiveSpreadsheet().getUrl()}`
    });
  } catch (e) {
    // Hvis email også fejler, så har vi gjort hvad vi kan
  }
}
```

---

### Task 8: Setup.gs — onOpen menu + setup wizard

**Files:**
- Create: `meta-dashboard/apps-script/Setup.gs`

- [ ] **Step 1: Write Setup.gs**

```javascript
/**
 * Setup.gs — Førstegangs-setup wizard og custom menu.
 */

/** Apps Script kalder automatisk denne ved Sheet-åbning. Tilføjer custom menu. */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Meta Dashboard')
    .addItem('🔧 Setup (første gang)', 'setup')
    .addSeparator()
    .addItem('🔄 Opdater nu', 'runNow')
    .addItem('📜 Vis log', 'showLog')
    .addItem('🗑️ Nulstil setup', 'resetSetup')
    .addToUi();
}

/** Setup-wizard. Kører ved første brug. */
function setup() {
  const ui = SpreadsheetApp.getUi();

  // Trin 1: Token
  const tokenResp = ui.prompt(
    'Setup 1/2 — Meta Access Token',
    'Indsæt din Meta system user access token (fra business.facebook.com → Business Settings → System Users):',
    ui.ButtonSet.OK_CANCEL
  );
  if (tokenResp.getSelectedButton() !== ui.Button.OK) return;
  const token = tokenResp.getResponseText().trim();
  if (!token) {
    ui.alert('Fejl', 'Token må ikke være tom.', ui.ButtonSet.OK);
    return;
  }

  // Trin 2: Account ID
  const accountResp = ui.prompt(
    'Setup 2/2 — Ad Account ID',
    'Indsæt din Ad Account ID (format: act_XXXXXXXXX). Findes i Ads Manager URL\'en.',
    ui.ButtonSet.OK_CANCEL
  );
  if (accountResp.getSelectedButton() !== ui.Button.OK) return;
  let accountId = accountResp.getResponseText().trim();
  if (!accountId) {
    ui.alert('Fejl', 'Account ID må ikke være tom.', ui.ButtonSet.OK);
    return;
  }
  // Tilføj 'act_' hvis det mangler
  if (!accountId.startsWith('act_')) {
    accountId = 'act_' + accountId.replace(/[^0-9]/g, '');
  }

  // Validér via test-kald
  showToast('Validerer token mod Meta API...');
  const test = MetaAPI.testToken(token, accountId);
  if (!test.ok) {
    ui.alert(
      'Validering fejlede',
      `Meta afviste forespørgslen:\n\n${test.error}\n\nTjek at token og Account ID er korrekte og prøv igen.`,
      ui.ButtonSet.OK
    );
    return;
  }

  // Gem
  const props = PropertiesService.getScriptProperties();
  props.setProperty(CONFIG.PROPERTY_KEYS.META_TOKEN, token);
  props.setProperty(CONFIG.PROPERTY_KEYS.AD_ACCOUNT_ID, accountId);
  props.setProperty(CONFIG.PROPERTY_KEYS.NOTIFY_EMAIL, Session.getActiveUser().getEmail() || '');

  // Opret trigger
  _ensureTrigger();

  // Første kørsel
  ui.alert(
    'Setup klar! ✅',
    `Forbundet til "${test.accountName}".\n\n` +
    `Trigger oprettet — kører dagligt kl. ${CONFIG.TRIGGER_HOUR}:00.\n\n` +
    `Klikker du OK kører jeg første dataindlæsning nu (kan tage 30-60 sek).`,
    ui.ButtonSet.OK
  );

  try {
    dailyRun();
    ui.alert('Færdig! 🎉', 'Tjek "📊 Overblik"-fanen.', ui.ButtonSet.OK);
  } catch (e) {
    ui.alert('Første kørsel fejlede', e.message + '\n\nTjek "⚙️ Log"-fanen for detaljer.', ui.ButtonSet.OK);
  }
}

function _ensureTrigger() {
  // Slet eksisterende dailyRun-triggers så vi ikke duplikerer
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'dailyRun') {
      ScriptApp.deleteTrigger(t);
    }
  });
  ScriptApp.newTrigger('dailyRun')
    .timeBased()
    .everyDays(1)
    .atHour(CONFIG.TRIGGER_HOUR)
    .inTimezone(CONFIG.TIMEZONE)
    .create();
}

function runNow() {
  showToast('Henter friske tal...');
  try {
    dailyRun();
    showToast('Færdig ✅');
  } catch (e) {
    SpreadsheetApp.getUi().alert('Fejl under kørsel', e.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

function showLog() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAMES.LOG);
  if (sheet) sheet.activate();
}

function resetSetup() {
  const ui = SpreadsheetApp.getUi();
  const resp = ui.alert(
    'Nulstil setup?',
    'Dette sletter token og Account ID fra Properties (Sheet-data bevares). Du skal køre Setup igen efter.',
    ui.ButtonSet.YES_NO
  );
  if (resp !== ui.Button.YES) return;
  const props = PropertiesService.getScriptProperties();
  Object.values(CONFIG.PROPERTY_KEYS).forEach(key => props.deleteProperty(key));
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'dailyRun') ScriptApp.deleteTrigger(t);
  });
  ui.alert('Nulstillet. Kør Setup igen for at genaktivere.');
}
```

---

### Task 9: Meta Business Manager walkthrough

**Files:**
- Create: `meta-dashboard/docs/meta-setup-walkthrough.md`

- [ ] **Step 1: Write the walkthrough**

```markdown
# Meta Business Manager — opret system user og token

Engangs-arbejde. ~5 minutter. Kræver admin-rolle på Altid Energis Business Manager.

## 1. Åbn Business Settings

1. Gå til [business.facebook.com](https://business.facebook.com)
2. Vælg "Altid Energi" som business hvis du har flere
3. Klik **⚙️ Settings** (gear-ikon nederst i venstre sidebar) → **Business settings**

## 2. Opret System User

1. I venstre menu → **Users → System users**
2. Klik **Add** (blå knap øverst)
3. Navn: `Altid Energi Reporting Bot`
4. Rolle: **Employee** (ikke Admin — vi skal kun have read)
5. Klik **Create system user**

## 3. Tildel ad account-adgang

Med system user'en valgt:

1. Klik **Add Assets** (i Assigned Assets-sektionen)
2. Vælg **Ad Accounts**
3. Marker Altid Energis ad account
4. Permission: vælg **View performance** (mindste tilstrækkelig — gør at scriptet kun kan læse, ikke ændre)
5. Klik **Save changes**

## 4. Generér token

1. Klik **Generate New Token** (på system user-siden)
2. Vælg din app (hvis du ikke har en, opret en på [developers.facebook.com](https://developers.facebook.com) → My Apps → Create App → "Other" → "Business")
3. Token expiration: **Never** (system user-tokens udløber ikke)
4. Permissions — vælg disse to:
   - ✅ `ads_read`
   - ✅ `business_management`
5. Klik **Generate Token**
6. **KOPIÉR TOKEN MED DET SAMME** — den vises kun denne ene gang. Læg den et sikkert sted (1Password el. lign.) indtil du skal bruge den.

## 5. Find Ad Account ID

1. Gå til [Ads Manager](https://adsmanager.facebook.com)
2. Sørg for du har Altid Energis konto valgt øverst
3. Kig på URL'en — den indeholder `act=XXXXXXXXX` eller `selected_account_id=XXXXXXXXX`
4. Notér tallet. Account ID i format Apps Script forventer: `act_XXXXXXXXX` (med "act_" foran)

## Output

Du har nu:
- ✅ En access token (lang streng der starter med `EAA...`)
- ✅ En Ad Account ID (`act_XXXXXXXXX`)

Næste: følg `google-setup-walkthrough.md`.

## Hvis token nogensinde lækker

Gå tilbage til Business Settings → System Users → din bot → klik tokenen → **Revoke**. Generér en ny og opdatér i Sheet'et via menuen "Meta Dashboard → Nulstil setup" og så Setup igen.
```

---

### Task 10: Google Apps Script paste walkthrough

**Files:**
- Create: `meta-dashboard/docs/google-setup-walkthrough.md`

- [ ] **Step 1: Write the walkthrough**

```markdown
# Google Sheet + Apps Script — paste og kør setup

Forudsætning: Du har gennemført `meta-setup-walkthrough.md` og har token + Account ID klar.

Tid: ~5 minutter.

## 1. Åbn Sheet'et

Claude har oprettet et tomt Google Sheet til dig: **"Altid Energi — Meta Dashboard"**.

Hvis du ikke kan finde det, søg i Google Drive på navnet, eller bed Claude om linket.

## 2. Åbn Apps Script editor

I Sheet'et:

1. Klik **Extensions** (menulinjen øverst) → **Apps Script**
2. En ny fane åbner — det er Apps Script editor'en
3. Du ser sandsynligvis en fil ved navn `Code.gs` med et tomt `function myFunction()` — slet alt indhold

## 3. Paste kildekoden

For hver af disse 6 filer skal du oprette en separat fil i editor'en:

| Filnavn at oprette | Kilde |
|---|---|
| `Config.gs` | `meta-dashboard/apps-script/Config.gs` |
| `Sheet.gs` | `meta-dashboard/apps-script/Sheet.gs` |
| `MetaAPI.gs` | `meta-dashboard/apps-script/MetaAPI.gs` |
| `Rules.gs` | `meta-dashboard/apps-script/Rules.gs` |
| `Main.gs` | `meta-dashboard/apps-script/Main.gs` |
| `Setup.gs` | `meta-dashboard/apps-script/Setup.gs` |

For hver fil:
1. I venstre sidebar af editor'en, klik **+** ved siden af "Files" → **Script**
2. Indtast filnavn (uden `.gs` — Apps Script tilføjer det selv)
3. Slet det auto-genererede `function myFunction(){}` indhold
4. Paste indholdet fra den tilsvarende lokale fil
5. Klik 💾 (gem)

Slet til sidst den oprindelige `Code.gs` (højreklik → Slet) hvis den stadig er tom.

## 4. Opdatér manifestet (appsscript.json)

1. I editor'en: ⚙️ **Project Settings** (i venstre sidebar)
2. Marker **"Show 'appsscript.json' manifest file in editor"**
3. Tilbage til editor'en — du ser nu `appsscript.json` blandt filerne
4. Klik den → slet alt indhold → paste fra `meta-dashboard/apps-script/appsscript.json`
5. Gem

## 5. Kør Setup første gang

1. Tilbage i Sheet'et (refresh siden så menuen indlæses)
2. Du ser nu en ny menu øverst: **Meta Dashboard**
3. Klik **Meta Dashboard → 🔧 Setup (første gang)**
4. Google beder om permission første gang:
   - Klik "Review permissions"
   - Vælg din Google-bruger
   - "Advanced" → "Go to [project name] (unsafe)" — det er fordi din egen kode ikke er Google-verified, ikke fordi den er usikker
   - Klik "Allow"
5. Du vender tilbage til Sheet'et og en popup spørger om token → indsæt
6. Næste popup spørger om Account ID → indsæt (`act_XXXXXXXXX`)
7. Scriptet validerer mod Meta og siger til hvis noget er galt

Hvis alt er OK:
- Trigger oprettes automatisk (kører dagligt kl. 07:00)
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
- Email mig (eller spørg Claude) hvis fejlen ikke giver mening

## Manuel ad-hoc kørsel

Du kan altid trække friske tal uden at vente til 07:00 næste dag:

**Meta Dashboard → 🔄 Opdater nu**
```

---

### Task 11: Opret Google Sheet via Drive MCP

**Files:**
- External: Google Drive — opretter ny Spreadsheet

- [ ] **Step 1: Opret Sheet via Drive MCP**

Brug `mcp__2ce91514-d70d-4c6b-a330-79d604e8976d__create_file` med:
- Filename: `Altid Energi — Meta Dashboard`
- MIME type: `application/vnd.google-apps.spreadsheet`
- Description: `Selv-opdaterende Meta-annoncedashboard. Apps Script trigger kører dagligt 07:00.`

- [ ] **Step 2: Notér Sheet-URL og giv til bruger**

URL bruges af brugeren i Task 12.

- [ ] **Step 3: Commit alle apps-script-filer**

```bash
cd "/Users/mikkelstylsvig/Claude/Altid Energi"
git add meta-dashboard/
git commit -m "feat(meta-dashboard): add Apps Script source + setup walkthroughs

- Apps Script files (Config, Sheet, MetaAPI, Rules, Main, Setup)
- appsscript.json manifest with required OAuth scopes
- Walkthrough docs for Meta Business Manager + Google setup
- Implements daily Meta ads dashboard per design spec"
```

---

### Task 12: Bruger udfører setup

**Files:**
- Bruger-action — ingen kode

- [ ] **Step 1: Bruger følger meta-setup-walkthrough.md**

Resultat: token + Account ID i hånden.

- [ ] **Step 2: Bruger åbner Sheet og følger google-setup-walkthrough.md**

Resultat: Apps Script-kode pasted, manifest opdateret, Setup kørt.

- [ ] **Step 3: Bruger bekræfter at første kørsel lykkedes**

Brugeren rapporterer tilbage til Claude: "kørt, Overblik-fanen er fyldt" eller "fejlede med X".

---

### Task 13: Verificer dashboardet via Drive MCP

**Files:**
- Læser Sheet-data via Drive MCP

- [ ] **Step 1: Læs Sheet via Drive MCP**

Brug `mcp__2ce91514-d70d-4c6b-a330-79d604e8976d__read_file_content` på Sheet-URL'en.

- [ ] **Step 2: Verificer indhold**

Tjek at:
- Overblik har KPI-kort
- Kampagner/Annoncesæt/Annoncer har rækker (ikke "Ingen data")
- Log har én række med status "OK"
- Hvis Anbefalinger er tom kan det være OK (betyder ingen flag — ikke nødvendigvis et problem)

- [ ] **Step 3: Rapportér til bruger**

Bekræft at alt kører, eller flag konkrete issues.

---

## Self-review

✅ **Spec coverage:**
- 7 faner — Tasks 4 (Sheet.gs writeOverviewCards), 7 (_writeCampaigns/AdSets/Ads, _appendHistory, recommendations write, _logRun)
- Apps Script struktur (Config/MetaAPI/Sheet/Rules/Main/Setup) — Tasks 3-8
- Quick-fix regler (5 stk.) — Task 6 (Rules.gs har alle 5)
- On-demand strategiske anbefalinger via Claude Code — uden for plan-scope (manuel proces, ingen kode)
- Daglig 07:00 trigger — Task 8 (`_ensureTrigger` i Setup.gs)
- Setup wizard med token-validering — Task 8 (`setup()` kalder `MetaAPI.testToken`)
- Error handling + email — Task 7 (`_notifyError`)
- Token gemmes i PropertiesService — Task 8
- Manuel "Opdater nu" via menu — Task 8 (`runNow`)
- Setup-trin i Meta + Google — Tasks 9-10
- Sheet-oprettelse — Task 11

✅ **Placeholder scan:** Ingen TBD'er, alle code-blocks komplette.

✅ **Type consistency:** Alle metoder i `MetaAPI` (`fetchAccountInsights`, `fetchCampaigns`, `fetchAdSets`, `fetchAds`, `extractPurchases`, `testToken`, `_request`) bruges konsistent. `CONFIG.SHEET_NAMES.OVERVIEW` etc. matcher fanenavne på tværs af alle filer. `_normalizeItem` returnerer felter (`spend_7d`, `cpa_7d`, `frequency_7d` etc.) som Rules.gs læser samme navne af. Alle rule-funktioner returnerer samme række-format `[prioritet, niveau, navn, problem, action]`.
