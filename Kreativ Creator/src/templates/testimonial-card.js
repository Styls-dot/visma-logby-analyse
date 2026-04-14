// Template 3: Kundecitat-kort — Autentisk testimonial med stjerner
export const meta = {
  id: 'testimonial-card',
  name: 'Kundeanmeldelse',
  category: 'Social proof',
  thumbnail: '★★★',
  fields: [
    { key: 'stars', label: 'Antal stjerner', type: 'select', default: '5', options: ['3', '4', '5'] },
    { key: 'quote', label: 'Citat', type: 'textarea', default: 'Skiftede til Altid Energi for 6 måneder siden. Ingen overraskelser, ingen skjulte gebyrer. Bare ren og ærlig strøm.' },
    { key: 'name', label: 'Kundenavn', type: 'text', default: 'Simon K.' },
    { key: 'location', label: 'By', type: 'text', default: 'Aarhus' },
    { key: 'savings', label: 'Besparelse (valgfrit)', type: 'text', default: 'Sparer 731 kr./år' },
    { key: 'bg', label: 'Baggrund', type: 'color', default: 'white' },
  ],
};

export function render(data, format) {
  const isStory = format === 'story';
  const stars = parseInt(data.stars) || 5;
  const starStr = '★'.repeat(stars) + '☆'.repeat(5 - stars);

  return `
    <div class="ad bg-${data.bg} format-${format}">
      <div class="logo"><img src="/assets/logo-color.png" alt="Altid Energi"></div>

      <div style="flex:1;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:${isStory ? '100px 36px' : '60px 36px'};">
        <!-- Stars -->
        <div style="font-size:${isStory ? '36px' : '28px'};color:#FFD15C;letter-spacing:4px;margin-bottom:24px;">${starStr}</div>

        <!-- Quote card -->
        <div style="background:#fff;border-radius:20px;padding:${isStory ? '36px 32px' : '28px 24px'};box-shadow:0 2px 20px rgba(16,29,47,0.06);max-width:440px;position:relative;">
          <!-- Quote mark -->
          <div style="position:absolute;top:-8px;left:24px;width:32px;height:32px;background:#73D0E7;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:18px;font-weight:700;">"</div>

          <div style="font-size:${isStory ? '20px' : '17px'};color:#101D2F;line-height:1.5;font-weight:500;margin-top:8px;">${data.quote}</div>

          <div style="margin-top:20px;display:flex;align-items:center;justify-content:space-between;">
            <div>
              <div style="font-size:14px;font-weight:700;color:#101D2F;">${data.name}</div>
              <div style="font-size:12px;color:rgba(16,29,47,0.4);">${data.location}</div>
            </div>
            ${data.savings ? `<div style="background:#E3F6FA;color:#033B8C;padding:6px 14px;border-radius:99px;font-size:12px;font-weight:700;">${data.savings}</div>` : ''}
          </div>
        </div>

        <!-- Trust badge -->
        <div style="margin-top:20px;font-size:12px;color:rgba(16,29,47,0.35);">Verificeret kunde hos Altid Energi</div>
      </div>
    </div>
  `;
}
