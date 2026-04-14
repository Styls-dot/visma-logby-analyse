export const meta = {
  id: 'founder-quote',
  name: 'Founder Citat',
  category: 'Personlig / Founder',
  thumbnail: 'CITAT',
  fields: [
    { key: 'quote', label: 'Citat', type: 'textarea', default: 'Vi tager ikke flere penge\nfor strømmen, end vi\nkøber den for.' },
    { key: 'name', label: 'Navn', type: 'text', default: 'Michael — Altid Energi' },
    { key: 'photoUrl', label: 'Billede', type: 'image', default: '' },
    { key: 'bg', label: 'Baggrund', type: 'color', default: 'navy' },
  ],
};

export function render(data, format) {
  const isDark = data.bg === 'navy' || data.bg === 'blue';
  const textColor = isDark ? '#fff' : '#101D2F';
  const quoteMarkColor = '#73D0E7';
  const nameColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(16,29,47,0.5)';
  const logoSrc = isDark ? '/assets/logo-white.png' : '/assets/logo-color.png';
  const isStory = format === 'story';
  const quoteBreaks = (data.quote || '').replace(/\n/g, '<br>');

  const bgMap = { sage: '#C8D5BE', navy: '#101D2F', offwhite: '#F3F1EC', 'teal-light': '#D3E5E8', white: '#FFFFFF', blue: '#033B8C' };
  const bgColor = bgMap[data.bg] || '#101D2F';

  const photoSection = data.photoUrl
    ? `<div style="position:absolute;top:0;right:0;width:50%;height:100%;background:url('${data.photoUrl}') center/cover;"></div>
       <div style="position:absolute;top:0;right:0;width:50%;height:100%;background:linear-gradient(to right, ${bgColor} 5%, transparent 50%);"></div>`
    : '';

  return `
    <div class="ad format-${format}" style="background:${bgColor};position:relative;">
      ${photoSection}
      <div class="logo" style="z-index:10;"><img src="${logoSrc}" alt="Altid Energi"></div>
      <div style="position:relative;z-index:5;flex:1;display:flex;flex-direction:column;justify-content:center;padding:${isStory ? '100px 48px' : '60px 48px'};max-width:${data.photoUrl ? '60%' : '80%'};">
        <div style="font-size:48px;color:${quoteMarkColor};font-weight:700;line-height:0.8;margin-bottom:12px;">"</div>
        <div style="font-size:${isStory ? '32px' : '26px'};font-weight:700;color:${textColor};line-height:1.25;margin-bottom:20px;">${quoteBreaks}</div>
        <div style="width:32px;height:3px;background:#73D0E7;border-radius:2px;margin-bottom:12px;"></div>
        <div style="font-size:14px;color:${nameColor};font-weight:500;">${data.name}</div>
      </div>
    </div>
  `;
}
