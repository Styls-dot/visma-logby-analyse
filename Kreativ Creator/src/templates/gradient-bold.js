// Template 8: Gradient Bold — Moderne gradient med kæmpe typografi
export const meta = {
  id: 'gradient-bold',
  name: 'Gradient Bold',
  category: 'Branding',
  thumbnail: 'GRAD',
  fields: [
    { key: 'topline', label: 'Linje 1 (lille)', type: 'text', default: 'Danmarks eneste' },
    { key: 'bigline', label: 'Linje 2 (stor)', type: 'text', default: 'gebyrfri' },
    { key: 'bottomline', label: 'Linje 3', type: 'text', default: 'elselskab.' },
    { key: 'badge', label: 'Badge', type: 'text', default: 'Fra 18 kr./md.' },
    { key: 'gradientStyle', label: 'Gradient', type: 'select', default: 'navy-teal', options: ['navy-teal', 'blue-teal', 'navy-blue'] },
  ],
};

export function render(data, format) {
  const isStory = format === 'story';

  const gradients = {
    'navy-teal': 'linear-gradient(135deg, #101D2F 0%, #0A2E4D 50%, #1A4A5A 100%)',
    'blue-teal': 'linear-gradient(135deg, #033B8C 0%, #0A4A8C 50%, #1A5A7A 100%)',
    'navy-blue': 'linear-gradient(135deg, #101D2F 0%, #0A1E3D 50%, #033B8C 100%)',
  };

  const bg = gradients[data.gradientStyle] || gradients['navy-teal'];

  return `
    <div class="ad format-${format}" style="background:${bg};">
      <div class="logo"><img src="/assets/logo-white.png" alt="Altid Energi"></div>

      <!-- Subtle geometric accent -->
      <div style="position:absolute;bottom:-60px;right:-60px;width:${isStory ? '360px' : '280px'};height:${isStory ? '360px' : '280px'};border-radius:50%;border:1px solid rgba(115,208,231,0.08);pointer-events:none;"></div>
      <div style="position:absolute;bottom:-20px;right:-20px;width:${isStory ? '200px' : '160px'};height:${isStory ? '200px' : '160px'};border-radius:50%;border:1px solid rgba(115,208,231,0.05);pointer-events:none;"></div>

      <div style="flex:1;display:flex;flex-direction:column;justify-content:center;padding:${isStory ? '100px 40px' : '60px 40px'};position:relative;z-index:2;">
        <!-- Topline -->
        <div style="font-size:${isStory ? '22px' : '18px'};font-weight:500;color:rgba(255,255,255,0.5);margin-bottom:4px;">${data.topline}</div>

        <!-- Big line with gradient text effect via teal -->
        <div style="font-size:${isStory ? '96px' : '76px'};font-weight:900;color:#73D0E7;line-height:0.95;margin-bottom:4px;">${data.bigline}</div>

        <!-- Bottom line -->
        <div style="font-size:${isStory ? '48px' : '38px'};font-weight:800;color:#fff;line-height:1.1;">${data.bottomline}</div>

        <!-- Badge -->
        ${data.badge ? `<div style="margin-top:${isStory ? '48px' : '32px'};">
          <div style="display:inline-block;border:1px solid rgba(255,255,255,0.2);color:rgba(255,255,255,0.7);padding:10px 20px;border-radius:99px;font-size:14px;font-weight:600;">${data.badge}</div>
        </div>` : ''}
      </div>
    </div>
  `;
}
