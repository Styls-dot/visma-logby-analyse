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
