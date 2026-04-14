export const meta = {
  id: 'centered-statement',
  name: 'Centreret Statement',
  category: 'Tænk / Social proof',
  thumbnail: '#1',
  fields: [
    { key: 'eyebrow', label: 'Eyebrow', type: 'text', default: 'Danmarks største forbrugerråd 2026' },
    { key: 'number', label: 'Stort tal/tekst', type: 'text', default: '#1' },
    { key: 'headline', label: 'Overskrift', type: 'textarea', default: 'Klar og tydelig\nkommunikation' },
    { key: 'source', label: 'Kilde', type: 'text', default: 'Kåret af 4.978 forbrugere blandt 52 elselskaber' },
    { key: 'pill', label: 'Badge (bund)', type: 'text', default: 'Top 3 i 4 ud af 5 kategorier' },
    { key: 'bg', label: 'Baggrund', type: 'color', default: 'sage' },
  ],
};

export function render(data, format) {
  const isDark = data.bg === 'navy' || data.bg === 'blue';
  const textColor = isDark ? '#fff' : '#101D2F';
  const mutedColor = isDark ? 'rgba(255,255,255,0.45)' : '#7A8A70';
  const pillBg = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(160,190,140,0.4)';
  const eyebrowColor = isDark ? 'rgba(255,255,255,0.3)' : '#5F7055';
  const logoSrc = isDark ? '/assets/logo-white.png' : '/assets/logo-color.png';
  const isStory = format === 'story';
  const headlineBreaks = (data.headline || '').replace(/\n/g, '<br>');

  return `
    <div class="ad bg-${data.bg} format-${format}">
      <div class="logo"><img src="${logoSrc}" alt="Altid Energi"></div>
      <div style="flex:1;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:${isStory ? '80px 48px' : '60px 48px'};">
        <div style="font-size:12px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:${eyebrowColor};margin-bottom:16px;">${data.eyebrow}</div>
        <div style="font-size:${isStory ? '180px' : '140px'};font-weight:900;color:${textColor};line-height:0.8;margin-bottom:8px;">${data.number}</div>
        <div style="font-size:${isStory ? '44px' : '36px'};font-weight:800;color:${textColor};line-height:1.1;margin-bottom:16px;">${headlineBreaks}</div>
        <div style="font-size:14px;color:${mutedColor};">${data.source}</div>
      </div>
      ${data.pill ? `<div style="position:absolute;bottom:28px;left:28px;">
        <div style="background:${pillBg};padding:10px 20px;border-radius:99px;font-size:14px;font-weight:600;color:${textColor};">${data.pill}</div>
      </div>` : ''}
    </div>
  `;
}
