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

    // Rate limit / midlertidig fejl → retry med exponential backoff
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

  /**
   * Bygger fields-string der inkluderer 7d, 30d og today insights via field-aliaser.
   * Et enkelt API-kald returnerer alle tre tidsperioder pr. item.
   */
  _itemInsightsFields() {
    return [
      'id',
      'name',
      'status',
      'effective_status',
      `insights.date_preset(last_7d){${CONFIG.INSIGHTS_FIELDS}}`,
      `insights_30d:insights.date_preset(last_30d){${CONFIG.INSIGHTS_FIELDS}}`,
      `insights_today:insights.date_preset(today){${CONFIG.INSIGHTS_FIELDS}}`
    ];
  },

  /** Henter alle aktive + nyligt-pausede kampagner med insights for 7d/30d/today. */
  fetchCampaigns(accountId) {
    const fields = MetaAPI._itemInsightsFields().concat(['objective']).join(',');
    const result = MetaAPI._request(`${accountId}/campaigns`, {
      fields: fields,
      filtering: [{ field: 'effective_status', operator: 'IN', value: ['ACTIVE', 'PAUSED'] }],
      limit: 500
    });
    return result.data || [];
  },

  /** Henter alle aktive + nyligt-pausede annoncesæt med insights. */
  fetchAdSets(accountId) {
    const fields = MetaAPI._itemInsightsFields().concat(['campaign_id']).join(',');
    const result = MetaAPI._request(`${accountId}/adsets`, {
      fields: fields,
      filtering: [{ field: 'effective_status', operator: 'IN', value: ['ACTIVE', 'PAUSED'] }],
      limit: 500
    });
    return result.data || [];
  },

  /** Henter alle aktive + nyligt-pausede annoncer med insights + thumbnail. */
  fetchAds(accountId) {
    const fields = MetaAPI._itemInsightsFields()
      .concat(['adset_id', 'creative{thumbnail_url,id}'])
      .join(',');
    const result = MetaAPI._request(`${accountId}/ads`, {
      fields: fields,
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
