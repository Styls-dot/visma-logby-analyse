// Template 10: Social Proof Counter — Nøgletal med ikoner i et grid
export const meta = {
  id: 'social-proof-counter',
  name: 'Nøgletal-grid',
  category: 'Social proof',
  thumbnail: '7K+',
  fields: [
    { key: 'headline', label: 'Overskrift', type: 'text', default: 'Derfor vælger tusindvis Altid Energi' },
    {
      key: 'stats',
      label: 'Nøgletal',
      type: 'items',
      default: [
        { text: '7.000+', category: 'Kunder' },
        { text: '0 kr.', category: 'I skjulte gebyrer' },
        { text: '#1', category: 'Klar kommunikation' },
        { text: '731', category: 'Kr. gns. besparelse/år' },
      ],
    },
    { key: 'cta', label: 'CTA', type: 'text', default: 'Bliv en del af fællesskabet' },
    { key: 'bg', label: 'Baggrund', type: 'color', default: 'navy' },
  ],
};

export function render(data, format) {
  const isDark = data.bg === 'navy' || data.bg === 'blue';
  const logoSrc = isDark ? '/assets/logo-white.png' : '/assets/logo-color.png';
  const isStory = format === 'story';
  const stats = data.stats || meta.fields.find(f => f.key === 'stats').default;

  const accentColors = ['#73D0E7', '#FFD15C', '#73D0E7', '#FFD15C'];

  const statCards = stats.map((stat, i) => {
    const accent = accentColors[i % accentColors.length];
    return `
      <div style="
        background:${isDark ? 'rgba(255,255,255,0.04)' : '#fff'};
        border-radius:16px;
        padding:${isStory ? '24px 20px' : '20px 16px'};
        text-align:center;
        ${isDark ? '' : 'box-shadow:0 2px 12px rgba(16,29,47,0.04);'}
        border-top:3px solid ${accent};
      ">
        <div style="font-size:${isStory ? '36px' : '30px'};font-weight:900;color:${isDark ? '#fff' : '#101D2F'};line-height:1;margin-bottom:6px;">${stat.text}</div>
        <div style="font-size:${isStory ? '13px' : '11px'};font-weight:600;color:${isDark ? 'rgba(255,255,255,0.4)' : 'rgba(16,29,47,0.4)'};text-transform:uppercase;letter-spacing:0.5px;">${stat.category}</div>
      </div>
    `;
  }).join('');

  return `
    <div class="ad bg-${data.bg} format-${format}">
      <div class="logo"><img src="${logoSrc}" alt="Altid Energi"></div>

      <div style="flex:1;display:flex;flex-direction:column;justify-content:center;padding:${isStory ? '100px 32px 40px' : '70px 28px 28px'};">
        <div style="font-size:${isStory ? '26px' : '22px'};font-weight:800;color:${isDark ? '#fff' : '#101D2F'};text-align:center;margin-bottom:${isStory ? '36px' : '24px'};line-height:1.2;">${data.headline}</div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:${isStory ? '16px' : '12px'};">
          ${statCards}
        </div>

        ${data.cta ? `<div style="margin-top:${isStory ? '32px' : '20px'};text-align:center;">
          <div style="display:inline-block;background:#73D0E7;color:#fff;padding:14px 28px;border-radius:99px;font-size:16px;font-weight:600;">${data.cta}</div>
        </div>` : ''}
      </div>
    </div>
  `;
}
