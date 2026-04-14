// Template 7: Nyheds-headline — Avis/breaking news stil der fanger opmærksomhed
export const meta = {
  id: 'news-headline',
  name: 'Nyheds-headline',
  category: 'Scroll-stopper',
  thumbnail: 'NEWS',
  fields: [
    { key: 'tag', label: 'Tag', type: 'text', default: 'FORBRUGERTEST 2026' },
    { key: 'headline', label: 'Headline', type: 'textarea', default: 'Altid Energi kåret\nsom nummer 1 i klar\nkommunikation' },
    { key: 'subline', label: 'Underrubrik', type: 'text', default: 'Elselskabet placerer sig i top 3 i fire ud af fem kategorier i Danmarks største forbrugertest.' },
    { key: 'source', label: 'Kilde', type: 'text', default: '52 elselskaber testet af uafhængigt forbrugerråd' },
  ],
};

export function render(data, format) {
  const isStory = format === 'story';
  const headlineBreaks = (data.headline || '').replace(/\n/g, '<br>');

  return `
    <div class="ad format-${format}" style="background:#FFFFFF;">
      <div class="logo"><img src="/assets/logo-color.png" alt="Altid Energi"></div>

      <div style="flex:1;display:flex;flex-direction:column;padding:${isStory ? '90px 36px 36px' : '70px 32px 28px'};">
        <!-- Red accent line -->
        <div style="width:48px;height:4px;background:#033B8C;border-radius:2px;margin-bottom:16px;"></div>

        <!-- Tag -->
        <div style="font-size:11px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:#033B8C;margin-bottom:${isStory ? '24px' : '16px'};">${data.tag}</div>

        <!-- Headline -->
        <div style="font-size:${isStory ? '46px' : '38px'};font-weight:900;color:#101D2F;line-height:1.05;margin-bottom:${isStory ? '28px' : '20px'};flex:1;display:flex;align-items:center;">${headlineBreaks}</div>

        <!-- Subline -->
        <div style="font-size:${isStory ? '18px' : '16px'};color:rgba(16,29,47,0.55);line-height:1.5;margin-bottom:16px;padding-top:16px;border-top:1px solid rgba(16,29,47,0.08);">${data.subline}</div>

        <!-- Source -->
        <div style="font-size:11px;color:rgba(16,29,47,0.3);font-weight:500;">${data.source}</div>
      </div>
    </div>
  `;
}
