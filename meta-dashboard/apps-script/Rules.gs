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
