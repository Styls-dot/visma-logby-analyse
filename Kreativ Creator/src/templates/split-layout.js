export const meta = {
  id: 'split-layout',
  name: 'Split Layout',
  category: 'Tænk / Social proof',
  thumbnail: 'SPLIT',
  fields: [
    { key: 'number', label: 'Stort tal (venstre)', type: 'text', default: '#1' },
    { key: 'eyebrow', label: 'Eyebrow', type: 'text', default: 'Forbrugertest 2026' },
    { key: 'title', label: 'Titel', type: 'text', default: 'Klar og tydelig kommunikation' },
    {
      key: 'checks',
      label: 'Check-punkter',
      type: 'items',
      default: [
        { text: 'Top 3 – tilfredshed' },
        { text: 'Top 3 – anbefaling' },
        { text: 'Top 3 – forståelige regninger' },
        { text: '#1 – kommunikation' },
      ],
    },
    { key: 'leftBg', label: 'Venstre farve', type: 'color', default: 'sage' },
  ],
};

export function render(data, format) {
  const isStory = format === 'story';
  const logoSrc = '/assets/logo-color.png';
  const checks = data.checks || meta.fields.find(f => f.key === 'checks').default;

  const leftBgMap = {
    sage: '#C8D5BE', navy: '#101D2F', offwhite: '#F3F1EC',
    'teal-light': '#D3E5E8', white: '#FFFFFF', blue: '#033B8C',
  };
  const leftBg = leftBgMap[data.leftBg] || '#C8D5BE';
  const leftTextColor = (data.leftBg === 'navy' || data.leftBg === 'blue') ? '#fff' : '#101D2F';

  const checkItems = checks.map(c => `
    <div style="display:flex;align-items:center;gap:10px;font-size:${isStory ? '18px' : '16px'};font-weight:600;color:#101D2F;">
      <span style="width:28px;height:28px;border-radius:50%;background:#1A8D5A;color:#fff;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;">&#10003;</span>
      ${c.text}
    </div>
  `).join('');

  return `
    <div class="ad format-${format}" style="display:flex;flex-direction:row;">
      <div class="logo"><img src="${logoSrc}" alt="Altid Energi"></div>
      <div style="width:42%;background:${leftBg};display:flex;align-items:center;justify-content:center;">
        <div style="font-size:${isStory ? '200px' : '160px'};font-weight:900;color:${leftTextColor};line-height:0.8;">${data.number}</div>
      </div>
      <div style="width:58%;background:#fff;display:flex;flex-direction:column;justify-content:center;padding:${isStory ? '60px 36px' : '40px 32px'};">
        <div style="font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#033B8C;margin-bottom:12px;">${data.eyebrow}</div>
        <div style="font-size:${isStory ? '32px' : '28px'};font-weight:800;color:#101D2F;line-height:1.15;margin-bottom:24px;">${data.title}</div>
        <div style="display:flex;flex-direction:column;gap:14px;">
          ${checkItems}
        </div>
      </div>
    </div>
  `;
}
