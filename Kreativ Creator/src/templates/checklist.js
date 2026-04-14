// Template 9: Interaktiv Tjekliste — Ser ud som en brugervenlig checklist
export const meta = {
  id: 'checklist',
  name: 'Tjekliste',
  category: 'Konvertering',
  thumbnail: 'CHECK',
  fields: [
    { key: 'headline', label: 'Overskrift', type: 'text', default: 'Det gode elselskab:' },
    {
      key: 'items',
      label: 'Tjek-punkter',
      type: 'items',
      default: [
        { text: 'Ingen skjulte gebyrer', checked: 'true' },
        { text: 'Strøm til indkøbspris', checked: 'true' },
        { text: 'Ingen bindingsperiode', checked: 'true' },
        { text: 'Topplaceret i forbrugertest', checked: 'true' },
        { text: 'Forståelige regninger', checked: 'true' },
        { text: 'Spottillæg oveni', checked: 'false' },
      ],
    },
    { key: 'footer', label: 'Bundtekst', type: 'text', default: 'Altid Energi — 5 ud af 5 ✓' },
    { key: 'bg', label: 'Baggrund', type: 'color', default: 'offwhite' },
  ],
};

export function render(data, format) {
  const isDark = data.bg === 'navy' || data.bg === 'blue';
  const logoSrc = isDark ? '/assets/logo-white.png' : '/assets/logo-color.png';
  const isStory = format === 'story';
  const items = data.items || meta.fields.find(f => f.key === 'items').default;

  const checkItems = items.map(item => {
    const isChecked = item.checked === 'true' || item.checked === true;
    return `
      <div style="display:flex;align-items:center;gap:14px;padding:${isStory ? '16px 0' : '12px 0'};border-bottom:1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(16,29,47,0.06)'};">
        <div style="
          width:${isStory ? '32px' : '28px'};height:${isStory ? '32px' : '28px'};
          border-radius:8px;flex-shrink:0;
          display:flex;align-items:center;justify-content:center;
          font-size:${isStory ? '16px' : '14px'};font-weight:700;
          ${isChecked
            ? 'background:#1A8D5A;color:#fff;'
            : `background:${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(16,29,47,0.04)'};color:${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(16,29,47,0.15)'};`}
        ">${isChecked ? '✓' : '✕'}</div>
        <span style="
          font-size:${isStory ? '19px' : '16px'};font-weight:600;
          color:${isChecked
            ? (isDark ? '#fff' : '#101D2F')
            : (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(16,29,47,0.25)')};
          ${!isChecked ? 'text-decoration:line-through;' : ''}
        ">${item.text}</span>
      </div>
    `;
  }).join('');

  return `
    <div class="ad bg-${data.bg} format-${format}">
      <div class="logo"><img src="${logoSrc}" alt="Altid Energi"></div>

      <div style="flex:1;display:flex;flex-direction:column;justify-content:center;padding:${isStory ? '90px 36px 36px' : '70px 36px 28px'};">
        <div style="font-size:${isStory ? '32px' : '26px'};font-weight:800;color:${isDark ? '#fff' : '#101D2F'};margin-bottom:${isStory ? '28px' : '20px'};">${data.headline}</div>

        <div style="display:flex;flex-direction:column;">
          ${checkItems}
        </div>

        <div style="margin-top:${isStory ? '28px' : '16px'};font-size:${isStory ? '16px' : '14px'};font-weight:700;color:${isDark ? '#73D0E7' : '#033B8C'};">${data.footer}</div>
      </div>
    </div>
  `;
}
