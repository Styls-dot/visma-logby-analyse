export const meta = {
  id: 'scoreboard',
  name: 'Scoreboard',
  category: 'Tænk / Social proof',
  thumbnail: 'LIST',
  fields: [
    { key: 'eyebrow', label: 'Eyebrow', type: 'text', default: 'Kundetilfredshed 2026' },
    {
      key: 'items',
      label: 'Kategorier',
      type: 'items',
      default: [
        { category: 'Klar kommunikation', result: '#1', rank: 'gold' },
        { category: 'Overordnet tilfredshed', result: 'Top 3', rank: 'top3' },
        { category: 'Anbefaling til andre', result: 'Top 3', rank: 'top3' },
        { category: 'Forståelige regninger', result: 'Top 3', rank: 'top3' },
        { category: 'Kundeservice', result: '—', rank: 'muted' },
      ],
    },
    { key: 'footer', label: 'Kilde', type: 'text', default: 'Baseret på 4.978 forbrugeres vurdering' },
    { key: 'bg', label: 'Baggrund', type: 'color', default: 'offwhite' },
  ],
};

function rankStyle(rank) {
  switch (rank) {
    case 'gold': return 'background:#101D2F;color:#fff;';
    case 'top3': return 'background:#C8D5BE;color:#5F7055;';
    case 'muted': return 'background:#eee;color:#bbb;';
    default: return 'background:#eee;color:#999;';
  }
}

function rankLabel(rank) {
  switch (rank) {
    case 'gold': return '#1';
    case 'top3': return '→';
    case 'muted': return '5';
    default: return '—';
  }
}

export function render(data, format) {
  const isDark = data.bg === 'navy' || data.bg === 'blue';
  const logoSrc = isDark ? '/assets/logo-white.png' : '/assets/logo-color.png';
  const eyebrowColor = isDark ? 'rgba(255,255,255,0.4)' : '#033B8C';
  const textColor = isDark ? '#fff' : '#101D2F';
  const resultColor = isDark ? '#73D0E7' : '#033B8C';
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(16,29,47,0.06)';
  const footerColor = isDark ? 'rgba(255,255,255,0.3)' : '#bbb';
  const isStory = format === 'story';
  const items = data.items || meta.fields.find(f => f.key === 'items').default;

  const rows = items.map((item, i) => `
    <div style="display:flex;align-items:center;padding:${isStory ? '20px' : '16px'} 0;${i < items.length - 1 ? `border-bottom:1px solid ${borderColor};` : ''}">
      <div style="width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;margin-right:14px;flex-shrink:0;${rankStyle(item.rank)}">${rankLabel(item.rank)}</div>
      <div style="flex:1;font-size:${isStory ? '20px' : '18px'};font-weight:600;color:${item.rank === 'muted' ? '#bbb' : textColor};">${item.category}</div>
      <div style="font-size:${isStory ? '20px' : '18px'};font-weight:${item.rank === 'muted' ? '500' : '800'};color:${item.rank === 'muted' ? '#ccc' : resultColor};">${item.result}</div>
    </div>
  `).join('');

  return `
    <div class="ad bg-${data.bg} format-${format}">
      <div class="logo"><img src="${logoSrc}" alt="Altid Energi"></div>
      <div style="flex:1;display:flex;flex-direction:column;padding:28px 36px;">
        <div style="font-size:12px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:${eyebrowColor};margin-top:52px;margin-bottom:24px;">${data.eyebrow}</div>
        <div style="display:flex;flex-direction:column;flex:1;">
          ${rows}
        </div>
        <div style="font-size:13px;color:${footerColor};padding-top:8px;">${data.footer}</div>
      </div>
    </div>
  `;
}
