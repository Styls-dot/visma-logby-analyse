export const meta = {
  id: 'problem-solution',
  name: 'Problem → Løsning',
  category: 'Tænk / Social proof',
  thumbnail: 'P→S',
  fields: [
    { key: 'problem', label: 'Problem-sætning', type: 'textarea', default: '52 elselskaber blev testet\naf Danmarks største forbrugerråd.' },
    { key: 'solution', label: 'Løsning/resultat', type: 'textarea', default: 'Vi blev kåret #1\npå klar kommunikation.' },
    { key: 'source', label: 'Kilde', type: 'text', default: 'Uafhængig forbrugertest 2026' },
    { key: 'bg', label: 'Baggrund', type: 'color', default: 'navy' },
  ],
};

export function render(data, format) {
  const isDark = data.bg === 'navy' || data.bg === 'blue';
  const problemColor = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(16,29,47,0.4)';
  const solutionColor = isDark ? '#fff' : '#101D2F';
  const sourceColor = isDark ? 'rgba(255,255,255,0.25)' : 'rgba(16,29,47,0.3)';
  const logoSrc = isDark ? '/assets/logo-white.png' : '/assets/logo-color.png';
  const isStory = format === 'story';
  const problemBreaks = (data.problem || '').replace(/\n/g, '<br>');
  const solutionBreaks = (data.solution || '').replace(/\n/g, '<br>');

  return `
    <div class="ad bg-${data.bg} format-${format}">
      <div class="logo"><img src="${logoSrc}" alt="Altid Energi"></div>
      <div style="flex:1;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:${isStory ? '80px 48px' : '60px 48px'};">
        <div style="font-size:${isStory ? '28px' : '24px'};font-weight:600;color:${problemColor};line-height:1.3;margin-bottom:28px;">${problemBreaks}</div>
        <div style="font-size:${isStory ? '48px' : '40px'};font-weight:800;color:${solutionColor};line-height:1.15;margin-bottom:16px;">${solutionBreaks}</div>
        <div style="font-size:13px;color:${sourceColor};">${data.source}</div>
      </div>
    </div>
  `;
}
