export const meta = {
  id: 'consistency',
  name: 'Konsistens-vinkel',
  category: 'Tænk / Social proof',
  thumbnail: '2.ÅR',
  fields: [
    { key: 'small', label: 'Lille tekst (top)', type: 'text', default: 'Danmarks største forbrugertest' },
    { key: 'headline', label: 'Overskrift', type: 'textarea', default: 'Stærk placering.\nFor 2. år\ni træk.' },
    { key: 'sub', label: 'Undertekst', type: 'textarea', default: '#1 i klar kommunikation\nTop 3 i kundetilfredshed' },
    { key: 'footer', label: 'Kilde', type: 'text', default: '52 elselskaber testet · 4.978 forbrugere · 2026' },
    { key: 'bg', label: 'Baggrund', type: 'color', default: 'sage' },
  ],
};

export function render(data, format) {
  const isDark = data.bg === 'navy' || data.bg === 'blue';
  const textColor = isDark ? '#fff' : '#101D2F';
  const smallColor = isDark ? 'rgba(255,255,255,0.5)' : '#7A8A70';
  const subColor = isDark ? 'rgba(255,255,255,0.7)' : '#5F7055';
  const footerColor = isDark ? 'rgba(255,255,255,0.3)' : '#98A68E';
  const logoSrc = isDark ? '/assets/logo-white.png' : '/assets/logo-color.png';
  const isStory = format === 'story';
  const headlineBreaks = (data.headline || '').replace(/\n/g, '<br>');
  const subBreaks = (data.sub || '').replace(/\n/g, '<br>');

  return `
    <div class="ad bg-${data.bg} format-${format}">
      <div class="logo"><img src="${logoSrc}" alt="Altid Energi"></div>
      <div style="flex:1;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:${isStory ? '80px 48px' : '60px 48px'};">
        <div style="font-size:16px;font-weight:500;color:${smallColor};margin-bottom:12px;">${data.small}</div>
        <div style="font-size:${isStory ? '56px' : '48px'};font-weight:900;color:${textColor};line-height:1.05;margin-bottom:24px;">${headlineBreaks}</div>
        <div style="font-size:18px;font-weight:600;color:${subColor};line-height:1.4;">${subBreaks}</div>
      </div>
      <div style="position:absolute;bottom:28px;left:28px;right:28px;text-align:center;font-size:13px;color:${footerColor};">${data.footer}</div>
    </div>
  `;
}
