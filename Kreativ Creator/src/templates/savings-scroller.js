export const meta = {
  id: 'savings-scroller',
  name: 'Besparelses-stopper',
  category: 'Konvertering',
  thumbnail: '731',
  fields: [
    { key: 'number', label: 'Stort tal', type: 'text', default: '731' },
    { key: 'unit', label: 'Enhed', type: 'text', default: 'kr./år' },
    { key: 'subtitle', label: 'Undertekst', type: 'text', default: 'Typisk besparelse ved skift til Altid Energi' },
    { key: 'cta', label: 'CTA', type: 'text', default: 'Tjek din elregning' },
    { key: 'claim', label: 'Bundtekst', type: 'text', default: 'Danmarks eneste gebyrfri elselskab' },
    { key: 'bg', label: 'Baggrund', type: 'color', default: 'navy' },
  ],
};

export function render(data, format) {
  const isDark = data.bg === 'navy' || data.bg === 'blue';
  const textColor = isDark ? '#fff' : '#101D2F';
  const subtitleColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(16,29,47,0.5)';
  const logoSrc = isDark ? '/assets/logo-white.png' : '/assets/logo-color.png';
  const isStory = format === 'story';

  const bgMap = { sage: '#C8D5BE', navy: '#101D2F', offwhite: '#F3F1EC', 'teal-light': '#D3E5E8', white: '#FFFFFF', blue: '#033B8C' };
  const bgColor = bgMap[data.bg] || '#101D2F';

  return `
    <div class="ad format-${format}" style="background:${bgColor};">
      <div class="logo"><img src="${logoSrc}" alt="Altid Energi"></div>
      <div style="flex:1;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:${isStory ? '80px 40px' : '60px 40px'};">
        <div style="font-size:${isStory ? '120px' : '96px'};font-weight:900;color:${textColor};line-height:0.9;">${data.number}</div>
        <div style="font-size:${isStory ? '28px' : '24px'};font-weight:700;color:#73D0E7;margin-top:4px;margin-bottom:16px;">${data.unit}</div>
        <div style="font-size:${isStory ? '18px' : '16px'};color:${subtitleColor};max-width:360px;line-height:1.4;">${data.subtitle}</div>
        ${data.cta ? `<div style="margin-top:28px;background:#73D0E7;color:#fff;padding:14px 32px;border-radius:99px;font-size:16px;font-weight:600;">${data.cta}</div>` : ''}
      </div>
      <div style="background:#fff;padding:16px 28px;display:flex;align-items:center;justify-content:space-between;">
        <img src="/assets/logo-color.png" style="height:32px;" alt="Altid Energi">
        <span style="font-size:13px;font-weight:600;color:#101D2F;">${data.claim}</span>
      </div>
    </div>
  `;
}
