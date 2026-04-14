export const meta = {
  id: 'photo-overlay',
  name: 'Foto + Overlay',
  category: 'Personlig / Founder',
  thumbnail: 'FOTO',
  fields: [
    { key: 'photoUrl', label: 'Billede', type: 'image', default: '' },
    { key: 'headline', label: 'Overskrift', type: 'textarea', default: 'Vi har intet\nat skjule!' },
    { key: 'points', label: 'Bullet points', type: 'items', default: [
      { text: 'Strøm til indkøbspris' },
      { text: '0 kr. i spottillæg' },
      { text: 'Ingen gebyrer' },
      { text: 'Topplacering i test' },
      { text: 'Fra 18 kr./md. uden binding' },
    ]},
    { key: 'bg', label: 'Baggrund', type: 'color', default: 'blue' },
  ],
};

export function render(data, format) {
  const isDark = true; // Always dark with photo overlay
  const logoSrc = '/assets/logo-white.png';
  const isStory = format === 'story';
  const headlineBreaks = (data.headline || '').replace(/\n/g, '<br>');
  const points = data.points || meta.fields.find(f => f.key === 'points').default;

  const bgMap = { sage: '#C8D5BE', navy: '#101D2F', offwhite: '#F3F1EC', 'teal-light': '#D3E5E8', white: '#FFFFFF', blue: '#033B8C' };
  const bgColor = bgMap[data.bg] || '#033B8C';

  const photoSection = data.photoUrl
    ? `<div style="position:absolute;top:0;right:0;width:55%;height:100%;background:url('${data.photoUrl}') center/cover;"></div>
       <div style="position:absolute;top:0;right:0;width:55%;height:100%;background:linear-gradient(to right, ${bgColor} 0%, transparent 40%);"></div>`
    : '';

  const bulletItems = points.map(p => `
    <div style="display:flex;align-items:center;gap:8px;font-size:${isStory ? '18px' : '16px'};color:#fff;">
      <span style="color:#73D0E7;font-size:16px;">&#10003;</span> ${p.text}
    </div>
  `).join('');

  return `
    <div class="ad format-${format}" style="background:${bgColor};position:relative;">
      ${photoSection}
      <div class="logo" style="z-index:10;"><img src="${logoSrc}" alt="Altid Energi"></div>
      <div style="position:relative;z-index:5;flex:1;display:flex;flex-direction:column;justify-content:center;padding:${isStory ? '80px 36px' : '48px 36px'};max-width:${data.photoUrl ? '55%' : '100%'};">
        <div style="font-size:${isStory ? '40px' : '32px'};font-weight:800;color:#fff;line-height:1.15;margin-bottom:24px;">${headlineBreaks}</div>
        <div style="font-size:14px;color:rgba(255,255,255,0.6);margin-bottom:16px;">Den nøgne sandhed om Altid Energi:</div>
        <div style="display:flex;flex-direction:column;gap:10px;">
          ${bulletItems}
        </div>
      </div>
    </div>
  `;
}
