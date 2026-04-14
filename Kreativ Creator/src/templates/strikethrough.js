export const meta = {
  id: 'strikethrough',
  name: 'Overstreget → Payoff',
  category: 'Tænk / Social proof',
  thumbnail: 'STRIKE',
  fields: [
    {
      key: 'strikes',
      label: 'Overstregede linjer',
      type: 'items',
      default: [
        { text: 'Skjulte gebyrer' },
        { text: 'Spottillæg' },
        { text: 'Uforståelige regninger' },
        { text: 'Bindingsperiode' },
      ],
    },
    { key: 'payoff', label: 'Payoff', type: 'textarea', default: 'Top 3 i kundetilfredshed.\nFor 2. år i træk.' },
    { key: 'source', label: 'Kilde', type: 'text', default: 'Danmarks største forbrugertest 2026' },
    { key: 'bg', label: 'Baggrund', type: 'color', default: 'offwhite' },
  ],
};

export function render(data, format) {
  const isDark = data.bg === 'navy' || data.bg === 'blue';
  const textColor = isDark ? '#fff' : '#101D2F';
  const strikeColor = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(16,29,47,0.3)';
  const sourceColor = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(16,29,47,0.35)';
  const logoSrc = isDark ? '/assets/logo-white.png' : '/assets/logo-color.png';
  const isStory = format === 'story';
  const strikes = data.strikes || meta.fields.find(f => f.key === 'strikes').default;
  const payoffBreaks = (data.payoff || '').replace(/\n/g, '<br>');

  const strikeItems = strikes.map(s => `
    <div style="font-size:${isStory ? '28px' : '24px'};font-weight:600;color:${strikeColor};text-decoration:line-through;text-decoration-thickness:2px;">${s.text}</div>
  `).join('');

  return `
    <div class="ad bg-${data.bg} format-${format}">
      <div class="logo"><img src="${logoSrc}" alt="Altid Energi"></div>
      <div style="flex:1;display:flex;flex-direction:column;justify-content:center;padding:${isStory ? '80px 44px' : '60px 44px'};">
        <div style="display:flex;flex-direction:column;gap:12px;margin-bottom:32px;">
          ${strikeItems}
        </div>
        <div style="width:32px;height:3px;background:#73D0E7;border-radius:2px;margin-bottom:20px;"></div>
        <div style="font-size:${isStory ? '36px' : '30px'};font-weight:800;color:${textColor};line-height:1.2;margin-bottom:12px;">${payoffBreaks}</div>
        <div style="font-size:13px;color:${sourceColor};">${data.source}</div>
      </div>
    </div>
  `;
}
