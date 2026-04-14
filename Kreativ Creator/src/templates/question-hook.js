// Template 2: Stort Spørgsmål — Pattern interrupt med fed typografi
export const meta = {
  id: 'question-hook',
  name: 'Spørgsmåls-hook',
  category: 'Scroll-stopper',
  thumbnail: '?',
  fields: [
    { key: 'question', label: 'Spørgsmål', type: 'textarea', default: 'Betaler du\nfor meget\nfor strøm?' },
    { key: 'answer', label: 'Svar/payoff', type: 'text', default: '8 ud af 10 danskere gør.' },
    { key: 'cta', label: 'CTA', type: 'text', default: 'Tjek din elregning gratis' },
    { key: 'bg', label: 'Baggrund', type: 'color', default: 'navy' },
  ],
};

export function render(data, format) {
  const isDark = data.bg === 'navy' || data.bg === 'blue';
  const logoSrc = isDark ? '/assets/logo-white.png' : '/assets/logo-color.png';
  const isStory = format === 'story';
  const questionBreaks = (data.question || '').replace(/\n/g, '<br>');

  return `
    <div class="ad bg-${data.bg} format-${format}">
      <div class="logo"><img src="${logoSrc}" alt="Altid Energi"></div>

      <div style="flex:1;display:flex;flex-direction:column;justify-content:center;padding:${isStory ? '100px 40px' : '60px 40px'};">
        <!-- Giant question mark watermark -->
        <div style="position:absolute;right:-30px;top:50%;transform:translateY(-50%);font-size:${isStory ? '600px' : '400px'};font-weight:900;color:${isDark ? 'rgba(255,255,255,0.03)' : 'rgba(16,29,47,0.03)'};line-height:0.8;pointer-events:none;">?</div>

        <div style="position:relative;z-index:2;">
          <div style="font-size:${isStory ? '64px' : '52px'};font-weight:900;color:${isDark ? '#fff' : '#101D2F'};line-height:1.0;margin-bottom:24px;">${questionBreaks}</div>
          <div style="width:48px;height:4px;background:#FFD15C;border-radius:2px;margin-bottom:20px;"></div>
          <div style="font-size:${isStory ? '22px' : '18px'};font-weight:500;color:${isDark ? 'rgba(255,255,255,0.6)' : 'rgba(16,29,47,0.5)'};margin-bottom:${isStory ? '40px' : '28px'};">${data.answer}</div>
          ${data.cta ? `<div style="display:inline-block;background:#73D0E7;color:#fff;padding:14px 28px;border-radius:99px;font-size:16px;font-weight:600;">${data.cta}</div>` : ''}
        </div>
      </div>
    </div>
  `;
}
