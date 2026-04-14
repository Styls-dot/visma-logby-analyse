// Template 5: Data-visualisering — Horisontal bar chart med sammenligning
export const meta = {
  id: 'data-visual',
  name: 'Data-visualisering',
  category: 'Social proof',
  thumbnail: 'DATA',
  fields: [
    { key: 'headline', label: 'Overskrift', type: 'text', default: 'Så meget overskydende fortjeneste tager dit elselskab' },
    {
      key: 'bars',
      label: 'Selskaber',
      type: 'items',
      default: [
        { text: 'Selskab A', value: '78' },
        { text: 'Selskab B', value: '65' },
        { text: 'Selskab C', value: '52' },
        { text: 'Altid Energi', value: '0' },
      ],
    },
    { key: 'unit', label: 'Enhed', type: 'text', default: 'øre/kWh i spottillæg' },
    { key: 'source', label: 'Kilde', type: 'text', default: 'Baseret på offentligt tilgængelige priser' },
    { key: 'bg', label: 'Baggrund', type: 'color', default: 'navy' },
  ],
};

export function render(data, format) {
  const isDark = data.bg === 'navy' || data.bg === 'blue';
  const logoSrc = isDark ? '/assets/logo-white.png' : '/assets/logo-color.png';
  const isStory = format === 'story';
  const bars = data.bars || meta.fields.find(f => f.key === 'bars').default;
  const maxVal = Math.max(...bars.map(b => parseInt(b.value) || 1), 1);

  const barItems = bars.map(bar => {
    const val = parseInt(bar.value) || 0;
    const pct = maxVal > 0 ? (val / maxVal) * 100 : 0;
    const isAE = bar.text.toLowerCase().includes('altid');
    const barColor = isAE ? '#73D0E7' : (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(16,29,47,0.1)');
    const labelColor = isDark ? (isAE ? '#73D0E7' : 'rgba(255,255,255,0.5)') : (isAE ? '#033B8C' : 'rgba(16,29,47,0.5)');
    const valueColor = isDark ? '#fff' : '#101D2F';

    return `
      <div style="margin-bottom:${isStory ? '20px' : '14px'};">
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px;">
          <span style="font-size:${isStory ? '16px' : '14px'};font-weight:${isAE ? '700' : '500'};color:${labelColor};">${bar.text}</span>
          <span style="font-size:${isStory ? '20px' : '18px'};font-weight:800;color:${isAE ? '#73D0E7' : valueColor};">${val === 0 ? '0' : val}</span>
        </div>
        <div style="height:${isStory ? '12px' : '10px'};background:${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(16,29,47,0.04)'};border-radius:99px;overflow:hidden;">
          <div style="height:100%;width:${val === 0 ? '3' : pct}%;background:${barColor};border-radius:99px;${isAE && val === 0 ? 'min-width:6px;background:#1A8D5A;' : ''}"></div>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="ad bg-${data.bg} format-${format}">
      <div class="logo"><img src="${logoSrc}" alt="Altid Energi"></div>

      <div style="flex:1;display:flex;flex-direction:column;justify-content:center;padding:${isStory ? '100px 36px 40px' : '70px 36px 28px'};">
        <div style="font-size:${isStory ? '28px' : '24px'};font-weight:800;color:${isDark ? '#fff' : '#101D2F'};line-height:1.2;margin-bottom:${isStory ? '40px' : '28px'};">${data.headline}</div>

        ${barItems}

        <div style="margin-top:${isStory ? '16px' : '8px'};font-size:11px;color:${isDark ? 'rgba(255,255,255,0.25)' : 'rgba(16,29,47,0.3)'};">${data.unit} · ${data.source}</div>
      </div>
    </div>
  `;
}
