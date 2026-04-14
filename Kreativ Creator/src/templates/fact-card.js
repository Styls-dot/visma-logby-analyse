// Template 6: Fakta-kort — Spillekort-stil med ét overraskende faktum
export const meta = {
  id: 'fact-card',
  name: 'Fakta-kort',
  category: 'Scroll-stopper',
  thumbnail: 'FAKT',
  fields: [
    { key: 'category', label: 'Kategori', type: 'text', default: 'VIDSTE DU' },
    { key: 'fact', label: 'Faktum', type: 'textarea', default: 'De fleste elselskaber\nlægger 3-8 øre/kWh\noveni strømprisen\nuden at fortælle dig det.' },
    { key: 'punchline', label: 'Punchline', type: 'text', default: 'Vi tager 0 øre.' },
    { key: 'bg', label: 'Baggrund', type: 'color', default: 'sage' },
  ],
};

export function render(data, format) {
  const isDark = data.bg === 'navy' || data.bg === 'blue';
  const isStory = format === 'story';
  const logoSrc = isDark ? '/assets/logo-white.png' : '/assets/logo-color.png';
  const factBreaks = (data.fact || '').replace(/\n/g, '<br>');

  const bgMap = { sage: '#C8D5BE', navy: '#101D2F', offwhite: '#F3F1EC', 'teal-light': '#D3E5E8', white: '#FFFFFF', blue: '#033B8C' };
  const bgColor = bgMap[data.bg] || '#C8D5BE';
  const cardBg = isDark ? 'rgba(255,255,255,0.06)' : '#fff';
  const catColor = isDark ? '#73D0E7' : '#033B8C';
  const textColor = isDark ? '#fff' : '#101D2F';
  const factColor = isDark ? 'rgba(255,255,255,0.7)' : 'rgba(16,29,47,0.6)';

  return `
    <div class="ad format-${format}" style="background:${bgColor};">
      <div class="logo"><img src="${logoSrc}" alt="Altid Energi"></div>

      <div style="flex:1;display:flex;align-items:center;justify-content:center;padding:${isStory ? '80px 32px' : '60px 32px'};">
        <div style="
          background:${cardBg};
          border-radius:24px;
          padding:${isStory ? '48px 36px' : '40px 32px'};
          width:100%;
          max-width:460px;
          box-shadow:${isDark ? 'none' : '0 4px 32px rgba(16,29,47,0.08)'};
          position:relative;
          overflow:hidden;
        ">
          <!-- Corner accent -->
          <div style="position:absolute;top:0;right:0;width:80px;height:80px;background:#FFD15C;border-radius:0 24px 0 80px;opacity:0.3;"></div>

          <!-- Category pill -->
          <div style="display:inline-block;background:${isDark ? 'rgba(115,208,231,0.15)' : 'rgba(3,59,140,0.08)'};color:${catColor};padding:6px 14px;border-radius:8px;font-size:11px;font-weight:800;letter-spacing:2px;margin-bottom:24px;">${data.category}</div>

          <!-- Fact -->
          <div style="font-size:${isStory ? '22px' : '19px'};color:${factColor};line-height:1.5;font-weight:500;margin-bottom:24px;">${factBreaks}</div>

          <!-- Divider -->
          <div style="width:40px;height:3px;background:#FFD15C;border-radius:2px;margin-bottom:16px;"></div>

          <!-- Punchline -->
          <div style="font-size:${isStory ? '36px' : '30px'};font-weight:900;color:${textColor};line-height:1.1;">${data.punchline}</div>
        </div>
      </div>
    </div>
  `;
}
